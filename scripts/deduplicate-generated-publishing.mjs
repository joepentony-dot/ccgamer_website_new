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

export function findEquivalentGeneratedPr(pulls, stagedPatch, patchForPr, owner) {
  if (!Array.isArray(pulls) || typeof stagedPatch !== "string" ||
      !stagedPatch.includes("diff --git ") ||
      typeof patchForPr !== "function" || !owner) return null;

  const candidates = pulls.filter(pr =>
    pr.title === GENERATED_TITLE &&
    GENERATED_BRANCH.test(pr.headRefName || "") &&
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

export function findExistingPrFromCheckout(repo) {
  if (!/^[^/]+\/[^/]+$/.test(repo || "")) {
    throw new Error("Expected GITHUB_REPOSITORY owner/name.");
  }
  const owner = repo.split("/")[0];
  const stagedPatch = run("git", ["diff", "--cached", "--no-color", "--no-ext-diff", "--binary", "--full-index"]);
  if (!stagedPatch.includes("diff --git ")) return null;

  const pulls = JSON.parse(gh(["pr", "list", "--repo", repo,
    "--state", "open", "--limit", "200", "--json",
    "number,title,headRefName,headRepositoryOwner,baseRefName"]));

  return findEquivalentGeneratedPr(pulls, stagedPatch, pr => {
    const ref = "refs/remotes/origin/" + pr.headRefName;
    let sha;
    try {
      sha = git(["rev-parse", "--verify", ref + "^{commit}"]);
    } catch {
      // Checkout normally fetches all refs; recover only this verified,
      // same-repository generated branch when it is not in the clone.
      git(["fetch", "--no-tags", "--quiet", "origin",
        "refs/heads/" + pr.headRefName + ":" + ref]);
      sha = git(["rev-parse", "--verify", ref + "^{commit}"]);
    }
    // Do not trust a checkout's remote-tracking ref if the open PR head
    // has moved or the PR was closed since the listing was retrieved.
    const live = JSON.parse(gh(["api", "repos/" + repo + "/pulls/" + pr.number]));
    if (live.state !== "open" || live.head?.sha !== sha ||
        live.head?.ref !== pr.headRefName ||
        live.head?.repo?.full_name !== repo ||
        live.base?.ref !== "main") return "";
    const main = git(["rev-parse", "HEAD"]);
    const base = git(["merge-base", main, sha]);
    // Never suppress a fresh candidate in favour of an older PR that
    // cannot pass the repository's current-main ancestry release guard.
    if (base !== main) return "";
    return run("git", ["diff", "--no-color", "--no-ext-diff", "--binary", "--full-index", base, sha]);
  }, owner);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const match = findExistingPrFromCheckout(process.env.GITHUB_REPOSITORY);
    if (match) process.stdout.write(String(match.number) + "\n");
  } catch (error) {
    console.error("::error::[publishing-dedup] " + error.message);
    process.exitCode = 1;
  }
}
