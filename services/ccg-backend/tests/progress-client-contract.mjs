import assert from 'node:assert/strict';
import { createLostSizzlerProgressClient } from '../client/lost-sizzler-progress.mjs';

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return body === undefined ? '' : JSON.stringify(body);
    },
  };
}

const calls = [];
const queue = [];
let accessToken = null;
const fetchImpl = async (url, options) => {
  calls.push({ url, options: structuredClone(options) });
  if (!queue.length) throw new Error('Unexpected request');
  const next = queue.shift();
  if (next instanceof Error) throw next;
  return next;
};

const client = createLostSizzlerProgressClient({
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  fetchImpl,
  getAccessToken: () => accessToken,
});

assert.equal(calls.length, 0, 'Constructing the progress client must perform zero requests.');

const unauthenticatedAchievements = await client.achievements.list();
assert.equal(unauthenticatedAchievements.ok, false);
assert.equal(unauthenticatedAchievements.kind, 'unauthenticated');
const unauthenticatedCollection = await client.collection.pull();
assert.equal(unauthenticatedCollection.kind, 'unauthenticated');
assert.equal(calls.length, 0, 'Missing auth must fail locally without a network request.');

accessToken = 'ccg-progress-token';
queue.push(response(200, { achievements: [{ achievement_key: 'solo.floor-5' }] }));
const achievements = await client.achievements.list();
assert.equal(achievements.ok, true);
assert.equal(achievements.achievements[0].achievement_key, 'solo.floor-5');
assert.equal(calls[0].options.headers.authorization, 'Bearer ccg-progress-token');
assert.equal(calls[0].options.credentials, 'omit');

queue.push(response(200, { achievement: { achievement_key: 'solo.floor-10', idempotent: false } }));
const unlock = await client.achievements.unlock({ achievement_key: 'solo.floor-10', metadata: { floor: 10 } });
assert.equal(unlock.ok, true);
assert.equal(JSON.parse(calls[1].options.body).achievement_key, 'solo.floor-10');
assert.equal(calls[1].options.method, 'POST');

queue.push(response(200, { collection: { revision: 1, payload: { unlocked: ['disk-1'] } } }));
const collection = await client.collection.pull();
assert.equal(collection.ok, true);
assert.equal(collection.collection.revision, 1);

queue.push(response(409, { error: 'collection_revision_conflict' }));
const localCollection = { unlocked: ['disk-1', 'disk-2'] };
const conflict = await client.collection.push({ expected_revision: 1, payload: localCollection });
assert.equal(conflict.ok, false);
assert.equal(conflict.kind, 'conflict');
assert.deepEqual(localCollection, { unlocked: ['disk-1', 'disk-2'] }, 'Remote conflict must not mutate caller-owned local collection state.');

queue.push(new Error('offline'));
const networkFailure = await client.achievements.unlock({ achievement_key: 'solo.floor-20' });
assert.equal(networkFailure.ok, false);
assert.equal(networkFailure.kind, 'network_error');

assert.throws(
  () => createLostSizzlerProgressClient({ baseUrl: 'http://example.com', fetchImpl }),
  /requires_https/
);

console.log('Lost Sizzler progress client contract passed: optional progress sync is passive, authenticated, conflict-safe and leaves local state caller-owned.');
