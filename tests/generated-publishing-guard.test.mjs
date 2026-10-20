import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  REQUIRED_VALIDATION_WORKFLOWS, executedRunPassed,
  codeReviewPassed, currentPullIsSafe
} from "../scripts/qualify-generated-publishing.mjs";

const SHA = "a".repeat(40);
const goodRun = {id:44, head_sha:SHA, event:"workflow_dispatch", status:"completed", conclusion:"success"};
const goodJobs = {total_count:2, jobs:[
  {status:"completed", conclusion:"success"},
  {status:"completed", conclusion:"skipped"}
]};
const goodState = {code_review:{commit_sha:SHA, status:"completed",
  has_any_findings:false, has_unresolved_findings:false}};
const review = state => [{user:{login:"chatgpt-codex-connector[bot]"},
  body:"<!-- codex-review-state:v1 " + JSON.stringify(state) + " -->"}];

test("generated output cannot merge from zero-job or missing GitHub workflows", () => {
  assert.equal(REQUIRED_VALIDATION_WORKFLOWS.length, 8);
  assert.equal(new Set(REQUIRED_VALIDATION_WORKFLOWS).size, 8);
  assert.equal(executedRunPassed(goodRun, goodJobs, SHA, 43), true);
  assert.equal(executedRunPassed(goodRun, {total_count:0, jobs:[]}, SHA, 43), false);
  assert.equal(executedRunPassed(goodRun, null, SHA, 43), false);
  assert.equal(executedRunPassed(goodRun, {total_count:3, jobs:goodJobs.jobs}, SHA, 43), false);
  assert.equal(executedRunPassed({...goodRun, status:"queued"}, goodJobs, SHA, 43), false);
  assert.equal(executedRunPassed({...goodRun, conclusion:"failure"}, goodJobs, SHA, 43), false);
  assert.equal(executedRunPassed({...goodRun, event:"pull_request"}, goodJobs, SHA, 43), false);
  assert.equal(executedRunPassed(goodRun, goodJobs, "b".repeat(40), 43), false);
  assert.equal(executedRunPassed(goodRun, goodJobs, SHA, 44), false);
  assert.equal(executedRunPassed(goodRun,
    {total_count:1, jobs:[{status:"completed", conclusion:"failure"}]}, SHA, 43), false);
  assert.equal(executedRunPassed(goodRun,
    {total_count:1, jobs:[{status:"completed", conclusion:"skipped"}]}, SHA, 43), false);
});

test("generated output requires an independent completed exact-head no-findings review", () => {
  assert.equal(codeReviewPassed(review(goodState), SHA), true);
  assert.equal(codeReviewPassed(review(goodState), "b".repeat(40)), false);
  assert.equal(codeReviewPassed(review({code_review:{...goodState.code_review, status:"running"}}), SHA), false);
  assert.equal(codeReviewPassed(review({code_review:{...goodState.code_review, has_any_findings:true}}), SHA), false);
  assert.equal(codeReviewPassed(review({code_review:{...goodState.code_review, has_unresolved_findings:true}}), SHA), false);
  assert.equal(codeReviewPassed([{user:{login:"github-actions[bot]"},
    body:review(goodState)[0].body}], SHA), false);
  assert.equal(codeReviewPassed([], SHA), false);
  assert.equal(codeReviewPassed(review({oops:"invalid"}), SHA), false);
});

test("generated output requires an open exact-head PR with fresh main", () => {
  const p = {state:"open", draft:false, head:{sha:SHA},
    base:{ref:"main", sha:"b".repeat(40)}, merged:false};
  assert.equal(currentPullIsSafe(p, SHA, p.base.sha), true);
  assert.equal(currentPullIsSafe({...p,draft:true}, SHA, p.base.sha), false);
  assert.equal(currentPullIsSafe({...p,state:"closed"}, SHA, p.base.sha), false);
  assert.equal(currentPullIsSafe({...p,merged:true}, SHA, p.base.sha), false);
  assert.equal(currentPullIsSafe(p, "c".repeat(40), p.base.sha), false);
  assert.equal(currentPullIsSafe(p, SHA, "d".repeat(40)), false);
});

test("qualified generated output must preserve pinned main and its ancestry", () => {
  const source = fs.readFileSync("scripts/qualify-generated-publishing.mjs", "utf8");
  assert.match(source, /const expectedMainSha = api\(/);
  assert.match(source, /main !== expectedMainSha/);
  assert.match(source, /currentPullIsSafe\(pull, sha, expectedMainSha\)/);
  assert.match(source, /compare\/" \+ expectedMainSha \+ "\.\.\." \+ sha/);
  assert.match(source, /ancestry\.behind_by !== 0/);
  assert.match(source, /ancestry\.merge_base_commit\?\.sha !== expectedMainSha/);
  assert.match(source, /checkFresh\(repo, number, sha, expectedMainSha\)/);
});

test("publishing-integrity CI executes guard tests on guard-only pull requests", () => {
  const workflow = fs.readFileSync(".github/workflows/publishing-automation-integrity.yml", "utf8");
  const prStart = workflow.indexOf("  pull_request:");
  const prEnd = workflow.indexOf("  workflow_dispatch:", prStart);
  assert.ok(prStart > 0 && prEnd > prStart);
  const prFilter = workflow.slice(prStart, prEnd);
  assert.match(prFilter, /scripts\/qualify-generated-publishing\.mjs/);
  assert.match(prFilter, /tests\/generated-publishing-guard\.test\.mjs/);
  assert.match(workflow, /run: node --test tests\/generated-publishing-guard\.test\.mjs/);
});

test("authoritative publishing executes the guard before dispatching deployment", () => {
  const workflow = fs.readFileSync(".github/workflows/games-publishing.yml", "utf8");
  assert.match(workflow, /node --test tests\/generated-publishing-guard\.test\.mjs/);
  assert.match(workflow, /node scripts\/qualify-generated-publishing\.mjs "\$PR_URL" "\$OUTPUT_BRANCH"/);
  const guardIndex = workflow.indexOf("node scripts/qualify-generated-publishing.mjs");
  const deployIndex = workflow.indexOf("gh workflow run deploy-github-pages-omega-stable.yml");
  assert.ok(guardIndex > 0 && deployIndex > guardIndex);
  assert.doesNotMatch(workflow.slice(guardIndex), /gh pr merge/);
});
