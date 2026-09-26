import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createLostSizzlerCloudSync } from '../client/lost-sizzler-cloud-sync.mjs';
import { hashSavePayload } from '../src/cloud-save.mjs';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return `${JSON.stringify(body)}\n`;
    },
  };
}

const localSave = {
  floor: 5,
  score: 9001,
  inventory: ['disk', 'key'],
  player: { y: 14, x: 9 },
};
const localBefore = JSON.stringify(localSave);
const expectedProof = hashSavePayload(localSave);

const successfulCalls = [];
const client = createLostSizzlerCloudSync({
  baseUrl: 'https://api.cheekycommodoregamer.co.uk',
  getAccessToken: async () => 'test-token',
  cryptoImpl: webcrypto,
  fetchImpl: async (url, options) => {
    successfulCalls.push({ url, options });
    if (options.method === 'GET') {
      return jsonResponse(200, {
        save: {
          revision: 4,
          payload: { remote: true },
          payload_sha256: 'a'.repeat(64),
        },
      });
    }
    const body = JSON.parse(options.body);
    return jsonResponse(200, {
      save: {
        revision: body.expected_revision + 1,
        payload: body.payload,
        payload_sha256: body.payload_sha256,
      },
    });
  },
});

assert.equal(successfulCalls.length, 0, 'Constructing the optional provider must perform zero network requests.');

const pulled = await client.pull();
assert.equal(pulled.ok, true);
assert.equal(pulled.save.revision, 4);
assert.equal(JSON.stringify(localSave), localBefore, 'Pulling a remote candidate must not mutate the caller-owned local save.');

const pushed = await client.push({ payload: localSave, expectedRevision: 4 });
assert.equal(pushed.ok, true);
assert.equal(pushed.save.revision, 5);
assert.equal(successfulCalls.length, 2);
const putCall = successfulCalls[1];
assert.equal(putCall.options.method, 'PUT');
assert.equal(putCall.options.credentials, 'omit');
assert.equal(putCall.options.headers.authorization, 'Bearer test-token');
const putBody = JSON.parse(putCall.options.body);
assert.equal(putBody.payload_sha256, expectedProof.sha256, 'Browser client hashing must exactly match the server contract.');
assert.equal(JSON.stringify(localSave), localBefore, 'Successful remote mirroring must not mutate caller-owned local state.');

let failureRequests = 0;
const failingClient = createLostSizzlerCloudSync({
  baseUrl: 'https://api.cheekycommodoregamer.co.uk',
  getAccessToken: async () => 'test-token',
  cryptoImpl: webcrypto,
  fetchImpl: async () => {
    failureRequests += 1;
    throw new Error('offline');
  },
});
const networkFailure = await failingClient.push({ payload: localSave, expectedRevision: 4 });
assert.equal(networkFailure.ok, false);
assert.equal(networkFailure.kind, 'network_error');
assert.equal(failureRequests, 1);
assert.equal(JSON.stringify(localSave), localBefore, 'A failed remote write must leave the local save byte-for-byte equivalent.');

let conflictRequests = 0;
const conflictClient = createLostSizzlerCloudSync({
  baseUrl: 'https://api.cheekycommodoregamer.co.uk',
  getAccessToken: async () => 'test-token',
  cryptoImpl: webcrypto,
  fetchImpl: async () => {
    conflictRequests += 1;
    return jsonResponse(409, { error: 'save_revision_conflict' });
  },
});
const conflict = await conflictClient.push({ payload: localSave, expectedRevision: 3 });
assert.equal(conflict.ok, false);
assert.equal(conflict.kind, 'conflict');
assert.equal(conflict.error, 'save_revision_conflict');
assert.equal(conflictRequests, 1);
assert.equal(JSON.stringify(localSave), localBefore, 'A revision conflict must not alter local state.');

let unauthenticatedRequests = 0;
const unauthenticatedClient = createLostSizzlerCloudSync({
  baseUrl: 'https://api.cheekycommodoregamer.co.uk',
  getAccessToken: async () => '',
  cryptoImpl: webcrypto,
  fetchImpl: async () => {
    unauthenticatedRequests += 1;
    throw new Error('must not run');
  },
});
const unauthenticated = await unauthenticatedClient.pull();
assert.equal(unauthenticated.ok, false);
assert.equal(unauthenticated.kind, 'unauthenticated');
assert.equal(unauthenticatedRequests, 0, 'Missing identity must fail before any request is attempted.');

assert.throws(
  () => createLostSizzlerCloudSync({
    baseUrl: 'http://api.cheekycommodoregamer.co.uk',
    getAccessToken: async () => 'token',
    cryptoImpl: webcrypto,
    fetchImpl: async () => jsonResponse(200, {}),
  }),
  /ccg_backend_requires_https/
);

const localDevClient = createLostSizzlerCloudSync({
  baseUrl: 'http://127.0.0.1:8787',
  getAccessToken: async () => '',
  cryptoImpl: webcrypto,
  fetchImpl: async () => jsonResponse(200, {}),
});
assert.equal((await localDevClient.pull()).kind, 'unauthenticated');

console.log('CCG cloud-sync client contract passed: construction is passive, hashes match the server, and success, network failure, conflict and missing-auth paths cannot mutate local save state.');
