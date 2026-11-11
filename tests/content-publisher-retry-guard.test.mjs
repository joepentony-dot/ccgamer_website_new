import assert from 'node:assert/strict';
import test from 'node:test';
import { decideGamePublishingRetry, selectSourceWorkflowRun } from '../admin/js/content-publisher-retry-guard.mjs';

const SHA = '7e495c0983c38a0b0f9c5d8fd421b6d472787798';
const job = { title: 'Gloom', slug: 'gloom', sourceSha: SHA, status: 'failed' };
const failed = { id: 11, head_sha: SHA, status: 'completed', conclusion: 'failure', run_attempt: 1 };
const base = { branch: 'main', job, runs: [failed], sourceExists: true, generatedPageExists: false };

test('a single failed source build may be retried without adding the game again', () => {
  const result = decideGamePublishingRetry(base);
  assert.equal(result.allow, true);
  assert.equal(result.reason, 'failed-build');
});

test('an active, queued or pending existing publishing workflow always prevents duplicate dispatch', () => {
  for (const status of ['queued', 'requested', 'waiting', 'pending', 'in_progress']) {
    const result = decideGamePublishingRetry({ ...base, runs: [failed, {id:12,status,head_sha:'a'.repeat(40)}] });
    assert.equal(result.allow, false, status);
    assert.equal(result.reason, 'active', status);
  }
});

test('Gloom generated-output PR and already-merged or generated-page states cannot be retried', () => {
  const open = decideGamePublishingRetry({ ...base, generatedPr: {state:'open',html_url:'https://github.com/example/repo/pull/3060'} });
  assert.equal(open.reason,'open-pr');
  const merged = decideGamePublishingRetry({ ...base, generatedPr: {state:'closed',merged_at:'2026-11-11T18:30:39Z'} });
  assert.equal(merged.reason,'merged-pr');
  const page = decideGamePublishingRetry({ ...base, generatedPageExists:true });
  assert.equal(page.reason,'page-present');
});

test('missing authoritative source, unknown canonical state and missing stored job fail closed', () => {
  assert.equal(decideGamePublishingRetry({...base,sourceExists:false}).reason,'missing-source');
  assert.equal(decideGamePublishingRetry({...base,sourceExists:null}).reason,'missing-source');
  assert.equal(decideGamePublishingRetry({...base,generatedPageExists:null}).reason,'page-present');
  assert.equal(decideGamePublishingRetry({...base,job:null}).reason,'no-source');
  assert.equal(decideGamePublishingRetry({...base,branch:'other'}).reason,'branch');
});

test('review and deployment-blocked states cannot dispatch a second publishing workflow', () => {
  for(const status of ['review-blocked','deploy-blocked']){
    assert.equal(decideGamePublishingRetry({...base,job:{...job,status}}).reason,'manual-repair');
  }
});

test('source-run selection prefers the newest matching execution', () => {
  const newer = {...failed,id: 99,conclusion:'success'};
  const selected=selectSourceWorkflowRun([newer, {...failed,id:12},{...failed,id:18}, {id:200,head_sha:'b'.repeat(40)}],SHA);
  assert.equal(selected.id,99);
  assert.equal(decideGamePublishingRetry({...base,runs:[failed,newer]}).reason,'not-failed');
});

test('failed run from an unknown source is not sufficient for a retry', () => {
  const noRun=decideGamePublishingRetry({...base,runs:[{...failed,head_sha:'c'.repeat(40)}]});
  assert.equal(noRun.reason,'missing-run');
  assert.equal(decideGamePublishingRetry({...base,runs:null}).reason,'unknown-runs');
  assert.equal(decideGamePublishingRetry({...base,runs:[{...failed,conclusion:'cancelled'}]}).reason,'not-failed');
});
