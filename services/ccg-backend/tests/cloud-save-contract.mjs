import assert from 'node:assert/strict';
import {
  MAX_SAVE_BYTES,
  canonicalSaveJson,
  decideSaveWrite,
  hashSavePayload,
  validateCloudSaveWrite,
} from '../src/cloud-save.mjs';

const payloadA = {
  dungeon: { floor: 3, x: 12, y: 7 },
  score: 4200,
  inventory: ['key', 'disk'],
};
const payloadB = {
  inventory: ['key', 'disk'],
  score: 4200,
  dungeon: { y: 7, x: 12, floor: 3 },
};

assert.equal(canonicalSaveJson(payloadA), canonicalSaveJson(payloadB));
const proofA = hashSavePayload(payloadA);
const proofB = hashSavePayload(payloadB);
assert.equal(proofA.sha256, proofB.sha256);
assert.equal(proofA.bytes, proofB.bytes);

const valid = validateCloudSaveWrite({
  expected_revision: 0,
  payload: payloadA,
  payload_sha256: proofA.sha256,
});
assert.equal(valid.expectedRevision, 0);
assert.equal(valid.payloadSha256, proofA.sha256);

assert.throws(
  () => validateCloudSaveWrite({ expected_revision: -1, payload: payloadA, payload_sha256: proofA.sha256 }),
  /invalid_expected_revision/
);
assert.throws(
  () => validateCloudSaveWrite({ expected_revision: 0, payload: payloadA, payload_sha256: '0'.repeat(64) }),
  /payload_sha256_mismatch/
);
assert.throws(
  () => validateCloudSaveWrite({ expected_revision: 0, payload: [], payload_sha256: proofA.sha256 }),
  /invalid_save_payload/
);
assert.throws(
  () => hashSavePayload({ oversized: 'x'.repeat(MAX_SAVE_BYTES + 1) }),
  /save_payload_too_large/
);

assert.deepEqual(decideSaveWrite(null, valid), { kind: 'create', revision: 1 });
assert.throws(
  () => decideSaveWrite(null, { ...valid, expectedRevision: 2 }),
  /save_revision_conflict/
);

const existing = {
  revision: 7,
  payload_sha256: proofA.sha256,
};
assert.deepEqual(
  decideSaveWrite(existing, { ...valid, expectedRevision: 6 }),
  { kind: 'idempotent', revision: 7 },
  'An exact retry must be idempotent even after the first write advanced the remote revision.'
);

const changedProof = hashSavePayload({ ...payloadA, score: 4300 });
assert.deepEqual(
  decideSaveWrite(existing, { ...valid, expectedRevision: 7, payloadSha256: changedProof.sha256 }),
  { kind: 'update', revision: 8 }
);
assert.throws(
  () => decideSaveWrite(existing, { ...valid, expectedRevision: 6, payloadSha256: changedProof.sha256 }),
  /save_revision_conflict/,
  'A stale client must never overwrite a newer remote save.'
);

console.log('CCG cloud-save contract passed: canonical hashing, size limits, idempotent retries and revision conflicts are enforced.');
