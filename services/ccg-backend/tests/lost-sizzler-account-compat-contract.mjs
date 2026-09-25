import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createLostSizzlerSupabaseCompat } from '../client/lost-sizzler-supabase-compat.mjs';

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
  if (!queue.length) throw new Error(`Unexpected request: ${url}`);
  return queue.shift();
};

const bridge = createLostSizzlerSupabaseCompat({
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  fetchImpl,
  cryptoImpl: crypto.webcrypto,
  WebSocketImpl: PassiveWebSocket,
});
const client = await bridge.getClient();

queue.push(response(200, {
  user_id: 'auth-only-user',
  access_token: 'ccg-access-auth-only',
  expires_in: 900,
  refresh_expires_at: '2030-01-01T00:00:00.000Z',
}));
queue.push(response(200, {
  user_id: 'auth-only-user',
  email: 'auth-only@example.test',
  email_confirmed_at: '2026-09-01T12:00:00.000Z',
  profile: null,
}));

const signedIn = await client.auth.signInWithPassword({
  email: 'auth-only@example.test',
  password: 'existing-migrated-password',
});
assert.equal(signedIn.error, null);
assert.equal(signedIn.data.user.id, 'auth-only-user');
assert.equal(signedIn.data.user.email, 'auth-only@example.test');
assert.equal(signedIn.data.user.email_confirmed_at, '2026-09-01T12:00:00.000Z');
assert.deepEqual(signedIn.data.user.user_metadata, {});
assert.equal(calls[0].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/login');
assert.equal(calls[1].url, 'https://auth.cheekycommodoregamer.co.uk/v1/me');
assert.equal(calls[1].options.headers.authorization, 'Bearer ccg-access-auth-only');

const context = await bridge.getCurrentUserContext();
assert.equal(context.isAuthenticated, true);
assert.equal(context.user.email, 'auth-only@example.test');
assert.deepEqual(context.account, {
  email: 'auth-only@example.test',
  email_confirmed_at: '2026-09-01T12:00:00.000Z',
});
assert.equal(context.profile, null, 'The compatibility bridge must not fabricate a profile for auth-only users.');
assert.equal(context.permissions.canRate, true);
assert.equal(context.permissions.canComment, true);
assert.equal(context.permissions.canModerate, false);
assert.equal(calls.length, 2, 'Reading hydrated auth-only context must not trigger another request.');
assert.equal(PassiveWebSocket.instances, 0, 'Account hydration must not activate multiplayer realtime.');
assert.equal(bridge.getDiagnostics().accountLoaded, true);
assert.equal(bridge.getDiagnostics().profileLoaded, false);

queue.push(response(200, { revoked: true }));
const signedOut = await client.auth.signOut();
assert.equal(signedOut.error, null);
assert.equal(bridge.getDiagnostics().authenticated, false);
assert.equal(bridge.getDiagnostics().accountLoaded, false);

console.log('Lost Sizzler account compatibility contract passed: migrated auth-only accounts retain email/session identity without fabricated profiles, extra requests, or realtime activation.');
