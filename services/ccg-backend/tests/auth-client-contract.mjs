import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createCcgAuthClient } from '../client/ccg-auth-client.mjs';

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
  if (!queue.length) throw new Error('Unexpected fetch call');
  const next = queue.shift();
  if (next instanceof Error) throw next;
  return next;
};

const client = createCcgAuthClient({
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk/',
  fetchImpl,
});

assert.equal(calls.length, 0, 'Constructing the auth client must perform zero network requests.');
assert.equal(client.getAccessToken(), null);
assert.equal(client.getUserId(), null);

assert.throws(
  () => createCcgAuthClient({ baseUrl: 'http://auth.example.test', fetchImpl }),
  /ccg_backend_requires_https/
);
assert.throws(
  () => createCcgAuthClient({ baseUrl: 'https://user:pass@example.test', fetchImpl }),
  /ccg_backend_url_must_not_include_credentials/
);
assert.doesNotThrow(() => createCcgAuthClient({ baseUrl: 'http://127.0.0.1:8787', fetchImpl }));

const invalidLogin = await client.login({ email: 'not-an-email', password: 'secret' });
assert.equal(invalidLogin.ok, false);
assert.equal(invalidLogin.kind, 'invalid_request');
assert.equal(calls.length, 0, 'Invalid credentials must fail before any network request.');

queue.push(response(200, {
  user_id: 'user-1',
  access_token: 'access-token-1',
  expires_in: 900,
  refresh_expires_at: '2030-01-01T00:00:00.000Z',
}));
const login = await client.login({ email: 'Player@Example.test', password: 'contract-password' });
assert.equal(login.ok, true);
assert.equal(login.user_id, 'user-1');
assert.equal(client.getAccessToken(), 'access-token-1');
assert.equal(client.getUserId(), 'user-1');
assert.equal(calls[0].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/login');
assert.equal(calls[0].options.method, 'POST');
assert.equal(calls[0].options.credentials, 'include');
assert.equal(calls[0].options.headers['content-type'], 'application/json');
assert.equal(calls[0].options.headers.authorization, undefined);
assert.deepEqual(JSON.parse(calls[0].options.body), {
  email: 'Player@Example.test',
  password: 'contract-password',
});

queue.push(response(200, { user_id: 'user-1', profile: { display_name: 'Player One' } }));
const me = await client.me();
assert.equal(me.ok, true);
assert.equal(me.profile.display_name, 'Player One');
assert.equal(calls[1].url, 'https://auth.cheekycommodoregamer.co.uk/v1/me');
assert.equal(calls[1].options.method, 'GET');
assert.equal(calls[1].options.credentials, 'omit');
assert.equal(calls[1].options.headers.authorization, 'Bearer access-token-1');

queue.push(response(200, {
  user_id: 'user-1',
  access_token: 'access-token-2',
  expires_in: 900,
  refresh_expires_at: '2030-02-01T00:00:00.000Z',
}));
const refreshed = await client.refresh();
assert.equal(refreshed.ok, true);
assert.equal(client.getAccessToken(), 'access-token-2');
assert.equal(calls[2].url, 'https://auth.cheekcommodoregamer.co.uk/v1/auth/refresh'.replace('cheekcommodore', 'cheekycommodore'));
assert.equal(calls[2].options.credentials, 'include');
assert.equal(calls[2].options.headers.authorization, undefined, 'Refresh must rely on the HttpOnly cookie, not the access token.');
assert.equal(calls[2].options.body, undefined);

queue.push(response(401, { error: 'invalid_session' }));
const unauthorized = await client.me();
assert.equal(unauthorized.ok, false);
assert.equal(unauthorized.kind, 'unauthorized');
assert.equal(client.getAccessToken(), null, 'A rejected bearer session must be cleared from memory.');
assert.equal(client.getUserId(), null);

queue.push(response(200, {
  user_id: 'user-2',
  access_token: 'access-token-3',
  expires_in: 900,
  refresh_expires_at: '2030-03-01T00:00:00.000Z',
}));
await client.login({ email: 'second@example.test', password: 'another-password' });
assert.equal(client.getUserId(), 'user-2');

queue.push(new Error('offline'));
const logoutOffline = await client.logout();
assert.equal(logoutOffline.ok, false);
assert.equal(logoutOffline.kind, 'network_error');
assert.equal(client.getAccessToken(), null, 'Local logout must clear the in-memory access token even if the network is unavailable.');
assert.equal(client.getUserId(), null);

queue.push(response(401, { error: 'invalid_refresh_token' }));
const refreshRejected = await client.refresh();
assert.equal(refreshRejected.ok, false);
assert.equal(refreshRejected.kind, 'unauthorized');
assert.equal(client.getAccessToken(), null);

queue.push(response(200, {
  user_id: 'user-3',
  access_token: 'access-token-4',
  expires_in: 900,
  refresh_expires_at: '2030-04-01T00:00:00.000Z',
}));
await client.login({ email: 'third@example.test', password: 'third-password' });
queue.push(response(200, { revoked: true }));
const logout = await client.logout();
assert.equal(logout.ok, true);
assert.equal(logout.revoked, true);
assert.equal(client.getAccessToken(), null);
assert.equal(client.getUserId(), null);

const source = await fs.readFile(new URL('../client/ccg-auth-client.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie/, 'The passive auth client must not persist or inspect browser credential storage.');
assert.doesNotMatch(source, /refresh_token/, 'The browser client must never expect a raw refresh token in JSON.');

console.log('CCG auth client contract passed: construction is passive, refresh cookies remain browser-managed, bearer tokens stay in memory, and logout/401 clear local session state.');
