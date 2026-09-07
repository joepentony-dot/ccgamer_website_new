import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createCcgOnlineClient } from '../client/ccg-online-client.mjs';

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get() { return null; } },
    async text() {
      return body === undefined ? '' : JSON.stringify(body);
    },
  };
}

class PassiveWebSocket {
  static OPEN = 1;
  static instances = 0;

  constructor() {
    PassiveWebSocket.instances += 1;
  }
}

const calls = [];
const queue = [];
const fetchImpl = async (url, options) => {
  calls.push({ url, options: structuredClone(options) });
  if (!queue.length) throw new Error('Unexpected request');
  const next = queue.shift();
  if (next instanceof Error) throw next;
  return next;
};

const client = createCcgOnlineClient({
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  fetchImpl,
  cryptoImpl: crypto.webcrypto,
  WebSocketImpl: PassiveWebSocket,
});

assert.equal(calls.length, 0, 'Composing the CCG client must perform zero HTTP requests.');
assert.equal(PassiveWebSocket.instances, 0, 'Composing the CCG client must perform zero WebSocket connections.');
assert.equal(client.auth.getAccessToken(), null);
assert.equal(typeof client.lostSizzler.weeklyVault.status, 'function');
assert.equal(typeof client.lostSizzler.progress.achievements.list, 'function');
assert.equal(typeof client.lostSizzler.progress.collection.pull, 'function');
assert.equal(typeof client.lostSizzler.realtime.connect, 'function');
assert.equal(client.lostSizzler.realtime.endpoint, 'wss://auth.cheekycommodoregamer.co.uk/v1/lost-sizzler/realtime');
assert.deepEqual(client.lostSizzler.realtime.getState(), {
  connected: false,
  sessionId: '',
  protocol: '',
  room: null,
});

const beforeLoginPull = await client.lostSizzler.cloudSave.pull();
assert.equal(beforeLoginPull.ok, false);
assert.equal(beforeLoginPull.kind, 'unauthenticated');
const beforeLoginWeeklyStart = await client.lostSizzler.weeklyVault.start();
assert.equal(beforeLoginWeeklyStart.ok, false);
assert.equal(beforeLoginWeeklyStart.kind, 'unauthenticated');
const beforeLoginAchievements = await client.lostSizzler.progress.achievements.list();
assert.equal(beforeLoginAchievements.ok, false);
assert.equal(beforeLoginAchievements.kind, 'unauthenticated');
const beforeLoginCollection = await client.lostSizzler.progress.collection.pull();
assert.equal(beforeLoginCollection.ok, false);
assert.equal(beforeLoginCollection.kind, 'unauthenticated');
assert.equal(calls.length, 0, 'Authenticated Lost Sizzler services without login must fail before a network request.');
assert.equal(PassiveWebSocket.instances, 0, 'Non-realtime service calls must not activate realtime.');

queue.push(response(200, {
  ready: true,
  signedIn: false,
  locked: false,
  weekStart: '2030-01-07',
  seed: 'CCQ-WEEKLY-20300107',
  leaderboard: [],
  ghostReplay: null,
}));
const anonymousWeekly = await client.lostSizzler.weeklyVault.status();
assert.equal(anonymousWeekly.ok, true);
assert.equal(anonymousWeekly.signedIn, false);
assert.equal(calls[0].url, 'https://auth.cheekycommodoregamer.co.uk/v1/lost-sizzler/weekly-vault');
assert.equal(calls[0].options.headers.authorization, undefined);

queue.push(response(200, {
  user_id: 'user-1',
  access_token: 'ccg-access-1',
  expires_in: 900,
  refresh_expires_at: '2030-01-01T00:00:00.000Z',
}));
const login = await client.auth.login({
  email: 'player@example.test',
  password: 'existing-migrated-password',
});
assert.equal(login.ok, true);
assert.equal(client.auth.getAccessToken(), 'ccg-access-1');
assert.equal(calls.length, 2);
assert.equal(calls[1].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/login');
assert.equal(calls[1].options.credentials, 'include');

queue.push(response(200, {
  ready: true,
  signedIn: true,
  locked: false,
  weekStart: '2030-01-07',
  seed: 'CCQ-WEEKLY-20300107',
  playerName: 'Player One',
  leaderboard: [],
  ghostReplay: null,
}));
const signedWeekly = await client.lostSizzler.weeklyVault.status();
assert.equal(signedWeekly.ok, true);
assert.equal(signedWeekly.signedIn, true);
assert.equal(calls[2].options.headers.authorization, 'Bearer ccg-access-1');

queue.push(response(200, {
  achievements: [{ achievement_key: 'solo.floor-5', unlocked_at: '2030-01-07T20:00:00.000Z', metadata: {} }],
}));
const achievements = await client.lostSizzler.progress.achievements.list();
assert.equal(achievements.ok, true);
assert.equal(achievements.achievements[0].achievement_key, 'solo.floor-5');
assert.equal(calls[3].url, 'https://auth.cheekycommodoregamer.co.uk/v1/lost-sizzler/achievements');
assert.equal(calls[3].options.credentials, 'omit');
assert.equal(calls[3].options.headers.authorization, 'Bearer ccg-access-1');

queue.push(response(200, { save: null }));
const cloudPull = await client.lostSizzler.cloudSave.pull();
assert.equal(cloudPull.ok, true);
assert.equal(cloudPull.save, null);
assert.equal(calls.length, 5);
assert.equal(calls[4].url, 'https://auth.cheekycommodoregamer.co.uk/v1/lost-sizzler/cloud-save');
assert.equal(calls[4].options.credentials, 'omit');
assert.equal(calls[4].options.headers.authorization, 'Bearer ccg-access-1');

queue.push(response(200, { revoked: true }));
const logout = await client.auth.logout();
assert.equal(logout.ok, true);
assert.equal(client.auth.getAccessToken(), null);
assert.equal(calls[5].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/logout');
assert.equal(calls[5].options.credentials, 'include');

const afterLogoutPull = await client.lostSizzler.cloudSave.pull();
assert.equal(afterLogoutPull.ok, false);
assert.equal(afterLogoutPull.kind, 'unauthenticated');
const afterLogoutWeeklyStart = await client.lostSizzler.weeklyVault.start();
assert.equal(afterLogoutWeeklyStart.ok, false);
assert.equal(afterLogoutWeeklyStart.kind, 'unauthenticated');
const afterLogoutAchievements = await client.lostSizzler.progress.achievements.list();
assert.equal(afterLogoutAchievements.ok, false);
assert.equal(afterLogoutAchievements.kind, 'unauthenticated');
const afterLogoutCollection = await client.lostSizzler.progress.collection.pull();
assert.equal(afterLogoutCollection.ok, false);
assert.equal(afterLogoutCollection.kind, 'unauthenticated');
assert.equal(calls.length, 6, 'Logged-out authenticated services must again fail locally without a request.');
assert.equal(PassiveWebSocket.instances, 0, 'Account lifecycle must not activate realtime unless multiplayer is explicitly requested.');

assert.throws(
  () => createCcgOnlineClient({
    baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
    fetchImpl,
    cryptoImpl: crypto.webcrypto,
    WebSocketImpl: PassiveWebSocket,
    realtimeOptions: null,
  }),
  /realtimeOptions must be an object/
);

console.log('CCG online client contract passed: composition is passive for HTTP and WebSocket, migrated login supplies bearer auth to optional cloud save, Weekly Vault and progress sync, realtime remains explicit, and logout disables authenticated remote services locally.');
