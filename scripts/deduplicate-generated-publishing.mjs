#!/usr/bin/env node
/*
 * Avoid opening a new generated-output PR when an existing open PR already
 * contains the exact same complete patch. This is a conservative equality
 * check, not permission to merge or to ignore a changed sitemap/SEO record.
 * Failure to inspect an eligible branch aborts publishing rather than
 * guessing that it is safe to create another PR.
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const GENERATED_BRANCH = /^automation\/games-publishing-\d+-\d+$/;
export const GENERATED_TITLE = "Publish generated game archive output";
export const SEO_GENERATED_BRANCH = /^automation\/seo-\d+-\d+$/;
export const SEO_GENERATED_TITLE = "Auto-update generated SEO and video pages";

export function findEquivalentGeneratedPr(pulls, stagedPatch, patchForPr, owner, options = {}) {
  const branchPattern = options.branchPattern || GENERATED_BRANCH;
  const title = options.title || GENERATED_TITLE;
  if (!Array.isArray(pulls) || typeof stagedPatch !== "string" ||
      !stagedPatch.includes("diff --git ") ||
      typeof patchForPr !== "function" || !owner) return null;

  const candidates = pulls.filter(pr =>
    pr.title === title &&
    branchPattern.test(pr.headRefName || "") &&
    pr.headRepositoryOwner?.login === owner &&
    pr.baseRefName === "main" &&
    Number.isSafeInteger(pr.number) && pr.number > 0
  ).sort((a, b) => b.number - a.number);

  for (const pr of candidates) {
    if (patchForPr(pr) === stagedPatch) return pr;
  }
  return null;
}

function run(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    timeout: 120000,
    maxBuffer: 64 * 1024 * 1024
  });
}

function git(args) { return run("git", args).trim(); }
function gh(args) { return run("gh", args).trim(); }

// Construct an ordinary fast-forward commit on the existing generated PR.
// Its tree is exactly the staged current-main output, and both old PR head
// and current main are parents. This never rewrites branch history or merges
// unqualified output into main.
export function buildStaleGeneratedMergeCommit(main, oldHead, stagedPatch, exec = args => run("git", args)) {
  const shaPattern = /^[a-f0-9]{40}$/;
  if (!shaPattern.test(main) || !shaPattern.test(oldHead) ||
      typeof stagedPatch !== "string" || !stagedPatch.includes("diff --git ")) {
    throw new Error("Invalid generated-output reconciliation inputs.");
  }
  const tree = exec(["write-tree"]).trim();
  if (!shaPattern.test(tree)) throw new Error("Could not write staged generated-output tree.");
  const mergeSha = exec(["-c", "user.name=github-actions[bot]",
    "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
    "commit-tree", tree, "-p", oldHead, "-p", main,
    "-m", "Reconcile identical generated output with current main"]).trim();
  if (!shaPattern.test(mergeSha)) throw new Error("Could not create reconciliation commit.");
  exec(["merge-base", "--is-ancestor", oldHead, mergeSha]);
  exec(["merge-base", "--is-ancestor", main, mergeSha]);
  const effectivePatch = exec(["diff", "--no-color", "--no-ext-diff",
    "--binary", "--full-index", main, mergeSha]);
  if (effectivePatch !== stagedPatch) {
    throw new Error("Reconciled tree differs from exact staged generated output.");
  }
  return mergeSha;
}

export function remoteBranchMatches(output, branch, expectedSha) {
  if (typeof output !== "string" || typeof branch !== "string" ||
      !/^[a-f0-9]{40}$/.test(expectedSha || "")) return false;
  const parts = output.trim().split(/\s+/);
  return parts.length === 2 && parts[0] === expectedSha &&
    parts[1] === "refs/heads/" + branch;
}

export function findExistingPrFromCheckout(repo, options = {}) {
  if (!/^[^/]+\/[^/]+$/.test(repo || "")) {
    throw new Error("Expected GITHUB_REPOSITORY owner/name.");
  }
  const owner = repo.split("/")[0];
  const stagedPatch = run("git", ["diff", "--cached", "--no-color", "--no-ext-diff", "--binary", "--full-index"]);
  if (!stagedPatch.includes("diff --git ")) return null;
  const main = git(["rev-parse", "HEAD"]);
  const remoteMain = JSON.parse(gh(["api", "repos/" + repo + "/git/ref/heads/main"])).object?.sha;
  if (remoteMain !== main) {
    throw new Error("Main moved since generated output was staged; rerun on fresh main.");
  }

  const pulls = JSON.parse(gh(["pr", "list", "--repo", repo,
    "--state", "open", "--limit", "200", "--json",
    "number,title,headRefName,headRepositoryOwner,baseRefName"]));
  const staleMatches = [];
  const freshMatch = findEquivalentGeneratedPr(pulls, stagedPatch, pr => {
    const ref = "refs/remotes/origin/" + pr.headRefName;
    let sha;
    try {
      sha = git(["rev-parse", "--verify", ref + "^{commit}"]);
    } catch {
      git(["fetch", "--no-tags", "--quiet", "origin",
        "refs/heads/" + pr.headRefName + ":" + ref]);
      sha = git(["rev-parse", "--verify", ref + "^{commit}"]);
    }
    const live = JSON.parse(gh(["api", "repos/" + repo + "/pulls/" + pr.number]));
    if (live.state !== "open" || live.head?.sha !== sha ||
        live.head?.ref !== pr.headRefName ||
        live.head?.repo?.full_name !== repo ||
        live.base?.ref !== "main") return "";
    const base = git(["merge-base", main, sha]);
    const patch = run("git", ["diff", "--no-color", "--no-ext-diff",
      "--binary", "--full-index", base, sha]);
    if (base === main) return patch;
    if (patch === stagedPatch) {
      if (live.draft !== true) {
        throw new Error("Matching stale generated PR #" + pr.number +
          " is not draft; owner must reconcile it before new publication.");
      }
      staleMatches.push({pr, sha});
    }
    return "";
  }, owner, options);
  if (freshMatch) return freshMatch;
  if (staleMatches.length === 0) return null;

  // Reuse the newest byte-identical DRAFT PR instead of opening a duplicate.
  // Never force-push or merge; a changed PR head or moved main aborts.
  const {pr, sha} = staleMatches[0];
  const check = () => JSON.parse(gh(["api", "repos/" + repo + "/pulls/" + pr.number]));
  const before = check();
  if (before.state !== "open" || before.draft !== true ||
      before.head?.sha !== sha || before.head?.ref !== pr.headRefName ||
      before.head?.repo?.full_name !== repo || before.base?.ref !== "main") {
    throw new Error("Generated PR changed before reconciliation; abort.");
  }
  if (JSON.parse(gh(["api", "repos/" + repo + "/git/ref/heads/main"])).object?.sha !== main) {
    throw new Error("Main changed before reconciliation; abort.");
  }
  const mergeSha = buildStaleGeneratedMergeCommit(main, sha, stagedPatch);
  const beforePush = check();
  if (beforePush.state !== "open" || beforePush.draft !== true ||
      beforePush.head?.sha !== sha || beforePush.head?.ref !== pr.headRefName ||
      beforePush.head?.repo?.full_name !== repo || beforePush.base?.ref !== "main" ||
      JSON.parse(gh(["api", "repos/" + repo + "/git/ref/heads/main"])).object?.sha !== main) {
    throw new Error("Generated PR or main changed before fast-forward push; abort.");
  }
  git(["push", "origin", mergeSha + ":refs/heads/" + pr.headRefName]);
  // GitHub's PR REST view may lag behind an acknowledged Git push. Verify
  // the actual remote Git branch, not an eventually consistent PR snapshot.
  // A changed or missing remote ref still fails closed without a new PR.
  let confirmed = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const remote = git(["ls-remote", "--heads", "origin", pr.headRefName]);
    if (remoteBranchMatches(remote, pr.headRefName, mergeSha)) {
      confirmed = true;
      break;
    }
    if (attempt < 4) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  if (!confirmed) {
    throw new Error("Generated PR remote branch was not confirmed after fast-forward; stop publication.");
  }
  console.error("::notice::[publishing-dedup] Reconciled identical DRAFT PR #" +
    pr.number + " onto current main by non-force fast-forward; fresh exact-head qualification remains required.");
  return pr;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const seoMode = process.argv.slice(2).includes("--seo");
    const options = seoMode
      ? {branchPattern: SEO_GENERATED_BRANCH, title: SEO_GENERATED_TITLE}
      : {};
    const match = findExistingPrFromCheckout(process.env.GITHUB_REPOSITORY, options);
    if (match) process.stdout.write(String(match.number) + "\n");
  } catch (error) {
    console.error("::error::[publishing-dedup] " + error.message);
    process.exitCode = 1;
  }
}
