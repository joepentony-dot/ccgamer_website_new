#!/usr/bin/env node
/*
 * Generated game archive PR safety gate.
 * PRs opened with GITHUB_TOKEN may not trigger pull_request CI.
 * Run only validation-only workflows via workflow_dispatch on the exact head.
 * Never merge when independent checks or Codex review cannot be verified.
 */
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

export const REQUIRED_VALIDATION_WORKFLOWS = Object.freeze([
  "ccg-site-safety.yml",
  "structured-data-validation.yml",
  "social-metadata-validation.yml",
  "publishing-automation-integrity.yml",
  "phase-4a-year-platform-audit.yml",
  "phase-6b-reliable-games-publishing.yml",
  "seo-game-route-validation.yml",
  "sitemap-child-preservation.yml"
]);

export function executedRunPassed(run, jobs, sha, previousId = 0) {
  if (!run || run.id <= previousId || run.head_sha !== sha ||
      run.event !== "workflow_dispatch" || run.status !== "completed" ||
      run.conclusion !== "success") return false;
  const total = jobs?.total_count;
  const list = jobs?.jobs;
  return Number.isSafeInteger(total) && total > 0 &&
    Array.isArray(list) && list.length === total &&
    list.some(job => job.status === "completed" && job.conclusion === "success") &&
    list.every(job => job.status === "completed" &&
      (job.conclusion === "success" || job.conclusion === "skipped"));
}

export function codeReviewPassed(comments, sha) {
  if (!Array.isArray(comments)) return false;
  return comments.some(comment => {
    if (comment.user?.login !== "chatgpt-codex-connector[bot]") return false;
    const marker = comment.body?.match(/codex-review-state:v1 (\{[^\n]*\}) -->/);
    if (!marker) return false;
    try {
      const state = JSON.parse(marker[1]).code_review;
      return state?.commit_sha === sha && state.status === "completed" &&
        state.has_any_findings === false && state.has_unresolved_findings === false;
    } catch {
      return false;
    }
  });
}

export function currentPullIsSafe(pull, sha, mainSha) {
  return pull?.state === "open" && pull.draft === false &&
    pull.head?.sha === sha && pull.base?.ref === "main" &&
    pull.base?.sha === mainSha && pull.merged !== true;
}

function gh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8", stdio: ["ignore", "pipe", "inherit"],
    timeout: 120000, maxBuffer: 20 * 1024 * 1024
  }).trim();
}
function api(endpoint) {
  return JSON.parse(gh(["api", endpoint]));
}
function checkFresh(repo, number, sha, expectedMainSha) {
  const pull = api("repos/" + repo + "/pulls/" + number);
  const main = api("repos/" + repo + "/git/ref/heads/main").object.sha;
  if (main !== expectedMainSha || !currentPullIsSafe(pull, sha, expectedMainSha)) {
    throw new Error("PR head or pinned main changed, or PR was closed. Leave generated PR open for fresh qualification.");
  }
  // Head must contain the qualified main commit. A changed base or stale
  // output branch must be reconciled and its checks rerun before release.
  const ancestry = api("repos/" + repo + "/compare/" + expectedMainSha + "..." + sha);
  if (ancestry.behind_by !== 0 || ancestry.merge_base_commit?.sha !== expectedMainSha) {
    throw new Error("Generated head is behind pinned main. Leave PR open and reconcile/requalify.");
  }
  return pull;
}
function latestRuns(repo, name, branch) {
  return api("repos/" + repo + "/actions/workflows/" + name + "/runs?branch=" +
    encodeURIComponent(branch) + "&event=workflow_dispatch&per_page=40").workflow_runs || [];
}
function prComments(repo, number) {
  return api("repos/" + repo + "/issues/" + number + "/comments?per_page=100");
}

export async function qualifyAndMerge(url, branch) {
  const repo = process.env.GITHUB_REPOSITORY;
  const number = Number(url?.match(/\/pull\/(\d+)(?:\/|$|\?)/)?.[1]);
  if (!repo || !/^[^/]+\/[^/]+$/.test(repo) ||
      !Number.isSafeInteger(number) || number < 1 ||
      !/^automation\/games-publishing-\d+-\d+$/.test(branch || "")) {
    throw new Error("Missing or unexpected repository, PR URL or generated-output branch.");
  }
  const initial = api("repos/" + repo + "/pulls/" + number);
  const sha = initial.head?.sha;
  if (!/^[a-f0-9]{40}$/.test(sha || "") || initial.head?.ref !== branch) {
    throw new Error("Generated PR head does not match expected output branch.");
  }
  const expectedMainSha = api("repos/" + repo + "/git/ref/heads/main").object.sha;
  checkFresh(repo, number, sha, expectedMainSha);
  const baseline = new Map();
  for (const name of REQUIRED_VALIDATION_WORKFLOWS) {
    baseline.set(name, Math.max(0, ...latestRuns(repo, name, branch).map(r => r.id)));
  }

  // Bot-created pull requests do not reliably schedule PR-event validation.
  // An explicit dispatch always creates a checkable, independent Actions run.
  for (const name of REQUIRED_VALIDATION_WORKFLOWS) {
    gh(["workflow", "run", name, "--repo", repo, "--ref", branch]);
    console.log("[publishing-guard] Dispatched " + name + " at " + sha.slice(0, 12));
  }

  // No approval is inferred from a comment we ourselves create.
  // Only the external Codex bot's completed exact-head receipt qualifies.
  gh(["api", "-X", "POST", "repos/" + repo + "/issues/" + number + "/comments",
    "-f", "body=@codex review\n\nPlease review the exact generated-output head " +
      sha + " and report findings before automated publishing merges."]);
  const deadline = Date.now() + 45 * 60 * 1000;
  const passed = new Set();
  let approved = false;
  while (Date.now() < deadline) {
    checkFresh(repo, number, sha, expectedMainSha);
    for (const name of REQUIRED_VALIDATION_WORKFLOWS) {
      if (passed.has(name)) continue;
      const run = latestRuns(repo, name, branch).find(r =>
        r.id > baseline.get(name) && r.head_sha === sha);
      if (!run) continue;
      if (run.status !== "completed") continue;
      if (run.conclusion !== "success") {
        throw new Error(name + " concluded " + run.conclusion +
          " on " + sha + "; generated PR remains open.");
      }
      const jobs = api("repos/" + repo + "/actions/runs/" + run.id + "/jobs?per_page=100");
      if (!executedRunPassed(run, jobs, sha, baseline.get(name))) {
        throw new Error(name + " had no successfully executed validation jobs; generated PR remains open.");
      }
      console.log("[publishing-guard] Verified executed success: " + name +
        " (run " + run.id + ")");
      passed.add(name);
    }
    if (!approved) approved = codeReviewPassed(prComments(repo, number), sha);
    if (approved && passed.size === REQUIRED_VALIDATION_WORKFLOWS.length) break;
    await delay(30000);
  }
  if (!approved || passed.size !== REQUIRED_VALIDATION_WORKFLOWS.length) {
    throw new Error("Qualification incomplete: " + passed.size + "/" +
      REQUIRED_VALIDATION_WORKFLOWS.length + " workflows; Codex review " +
      (approved ? "passed" : "missing or incomplete") +
      ". Generated PR remains open; do not bypass the gate.");
  }

  checkFresh(repo, number, sha, expectedMainSha);
  if (!codeReviewPassed(prComments(repo, number), sha)) {
    throw new Error("Independent review no longer matches the generated head.");
  }
  // Explicit expected-head SHA and squash method. GitHub rejects a moved head.
  const result = JSON.parse(gh(["api", "-X", "PUT",
    "repos/" + repo + "/pulls/" + number + "/merge",
    "-f", "sha=" + sha, "-f", "merge_method=squash"]));
  if (result.merged !== true || !/^[a-f0-9]{40}$/.test(result.sha || "")) {
    throw new Error("GitHub did not confirm guarded squash merge.");
  }
  console.log("[publishing-guard] Merged exact head " + sha +
    " into main as " + result.sha);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  qualifyAndMerge(process.argv[2], process.argv[3]).catch(error => {
    console.error("::error::[publishing-guard] " + error.message);
    process.exitCode = 1;
  });
}
