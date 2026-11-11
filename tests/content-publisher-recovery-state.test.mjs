import assert from 'node:assert/strict';
import test from 'node:test';
import { GENERATED_OUTPUT_STEP, classifyGeneratedOutputFailure, storedPublicationMessage } from '../admin/js/content-publisher-recovery-state.mjs';

test('unfinished generated PR is diagnosed as review-blocked with durable instructions', () => {
  const issue = classifyGeneratedOutputFailure({
    failedStep: GENERATED_OUTPUT_STEP,
    runId: 12,
    pullRequest: { state: 'open', html_url: 'https://github.com/example/repo/pull/42', merged_at: null }
  });
  assert.equal(issue.status, 'review-blocked');
  assert.equal(issue.stage, 'validation');
  assert.match(issue.message, /remains unmerged/);
  assert.match(issue.message, /do not add the game again/i);
  const stored = storedPublicationMessage({ title: 'Gloom', slug: 'gloom', sourceSha: 'a'.repeat(40), status: issue.status, recoveryMessage: issue.message });
  assert.equal(stored.text, issue.message);
  assert.equal(stored.error, true);
});

test('already merged PR is diagnosed as deploy-blocked, not review-blocked', () => {
  const result = classifyGeneratedOutputFailure({
    failedStep: GENERATED_OUTPUT_STEP,
    runId: 22,
    pullRequest: { state: 'closed', merged_at: '2026-11-11T18:30:39Z', html_url: 'https://github.com/example/repo/pull/43' }
  });
  assert.equal(result.status, 'deploy-blocked');
  assert.equal(result.stage, 'live');
  assert.match(result.message, /was merged/);
  assert.match(result.message, /deployment handoff failed/);
  assert.doesNotMatch(result.message, /remains unmerged/);
  const stored = storedPublicationMessage({ sourceSha: 'b'.repeat(40), status: result.status, recoveryMessage: result.message });
  assert.equal(stored.text, result.message);
  assert.equal(stored.error, true);
});

test('a missing PR does not falsely assert whether output merged', () => {
  const result = classifyGeneratedOutputFailure({ failedStep: GENERATED_OUTPUT_STEP, runId: 35 });
  assert.equal(result.status, 'failed');
  assert.equal(result.label, 'Merge state unconfirmed');
  assert.match(result.message, /Could not confirm whether the output merged/);
});

test('non-review workflow failures and long-running review statuses remain useful', () => {
  const failure = classifyGeneratedOutputFailure({ failedStep: 'Run authoritative publishing command', runId: 50 });
  assert.equal(failure.status, 'failed');
  assert.match(failure.message, /source is saved/);
  const pending = storedPublicationMessage({ title: 'Gloom', slug: 'gloom', sourceSha: 'c'.repeat(40), status: 'awaiting-review' });
  assert.equal(pending.error, false);
  assert.match(pending.text, /awaiting independent review and merge/);
  assert.equal(storedPublicationMessage(null).error, false);
});
