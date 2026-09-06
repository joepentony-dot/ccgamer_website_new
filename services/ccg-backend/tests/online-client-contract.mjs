import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createCcgOnlineClient } from '../client/ccg-online-client.mjs';

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
});

assert.equal(calls.length, 0, 'Composing the CCG client must perform zero network requests.');
assert.equal(client.auth.getAccessToken(), null);

const beforeLoginPull = await client.lostSizzler.cloudSave.pull();
assert.equal(beforeLoginPull.ok, false);
assert.equal(beforeLoginPull.kind, 'unauthenticated');
assert.equal(calls.length, 0, 'Cloud-save access without login must fail before a network request.');

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
assert.equal(calls.length, 1);
assert.equal(calls[0].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/login');
assert.equal(calls[0].options.credentials, 'include');

queue.push(response(200, { save: null }));
const cloudPull = await client.lostSizzler.cloudSave.pull();
assert.equal(cloudPull.ok, true);
assert.equal(cloudPull.save, null);
assert.equal(calls.length, 2);
assert.equal(calls[1].url, 'https://auth.cheekycommodoregamer.co.uk/v1/lost-sizzler/cloud-save');
assert.equal(calls[1].options.credentials, 'omit');
assert.equal(calls[1].options.headers.authorization, 'Bearer ccg-access-1');

queue.push(response(200, { revoked: true }));
const logout = await client.auth.logout();
assert.equal(logout.ok, true);
assert.equal(client.auth.getAccessToken(), null);
assert.equal(calls[2].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/logout');
assert.equal(calls[2].options.credentials, 'include');

const afterLogoutPull = await client.lostSizzler.cloudSave.pull();
assert.equal(afterLogoutPull.ok, false);
assert.equal(afterLogoutPull.kind, 'unauthenticated');
assert.equal(calls.length, 3, 'Logged-out cloud-save access must again fail locally without a request.');

console.log('CCG online client contract passed: composition is passive, migrated login supplies bearer auth to optional cloud save, and logout disables remote save access locally.');
