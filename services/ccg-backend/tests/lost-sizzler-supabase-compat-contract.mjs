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
  const next = queue.shift();
  if (next instanceof Error) throw next;
  return next;
};

const bridge = createLostSizzlerSupabaseCompat({
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  fetchImpl,
  cryptoImpl: crypto.webcrypto,
  WebSocketImpl: PassiveWebSocket,
});

assert.equal(calls.length, 0, 'Constructing the compatibility bridge must perform zero HTTP requests.');
assert.equal(PassiveWebSocket.instances, 0, 'Constructing the compatibility bridge must perform zero WebSocket connections.');
assert.equal(bridge.__ccgBackendCompat, true);

const client = await bridge.getClient();
assert.equal(calls.length, 0, 'getClient must remain passive.');
assert.equal(PassiveWebSocket.instances, 0, 'getClient must not open realtime.');
assert.equal(typeof client.functions.invoke, 'function');
assert.equal(typeof client.channel, 'function');
assert.equal(typeof client.auth.getUser, 'function');
assert.equal(typeof client.auth.signInWithPassword, 'function');

queue.push(response(200, {
  ready: true,
  signedIn: false,
  locked: false,
  weekStart: '2030-01-07',
  seed: 'CCQ-WEEKLY-20300107',
  leaderboard: [],
  ghostReplay: null,
}));
const anonymousWeekly = await client.functions.invoke('ccq-weekly-challenge', {
  body: { action: 'status' },
});
assert.equal(anonymousWeekly.error, null);
assert.equal(anonymousWeekly.data.ok, true);
assert.equal(anonymousWeekly.data.signedIn, false);
assert.equal(calls[0].url, 'https://auth.cheekycommodoregamer.co.uk/v1/lost-sizzler/weekly-vault');
assert.equal(calls[0].options.headers.authorization, undefined);

const unsupportedFunction = await client.functions.invoke('not-a-real-function', { body: {} });
assert.equal(unsupportedFunction.data, null);
assert.equal(unsupportedFunction.error.code, 'unsupported_edge_function');
assert.equal(calls.length, 1, 'Unsupported legacy functions must fail locally.');

queue.push(response(401, { error: 'refresh_session_not_found' }));
const anonymousSession = await bridge.waitForAuth();
assert.equal(anonymousSession, null, 'A browser without a refresh cookie remains an anonymous online player.');
assert.equal(calls[1].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/refresh');
assert.equal(calls[1].options.credentials, 'include');
assert.equal(PassiveWebSocket.instances, 0, 'Auth hydration must not activate multiplayer realtime.');

queue.push(response(200, {
  user_id: 'user-1',
  access_token: 'ccg-access-1',
  expires_in: 900,
  refresh_expires_at: '2030-01-01T00:00:00.000Z',
}));
queue.push(response(200, {
  user_id: 'user-1',
  profile: {
    username: 'player-one',
    display_name: 'Player One',
    role: 'member',
    supporter: true,
  },
}));
const signedIn = await client.auth.signInWithPassword({
  email: 'player@example.test',
  password: 'existing-migrated-password',
});
assert.equal(signedIn.error, null);
assert.equal(signedIn.data.user.id, 'user-1');
assert.equal(signedIn.data.user.user_metadata.display_name, 'Player One');
assert.equal(signedIn.data.user.app_metadata.role, 'member');
assert.equal(calls[2].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/login');
assert.equal(calls[2].options.credentials, 'include');
assert.equal(calls[3].url, 'https://auth.cheekycommodoregamer.co.uk/v1/me');
assert.equal(calls[3].options.headers.authorization, 'Bearer ccg-access-1');

const sessionResult = await client.auth.getSession();
assert.equal(sessionResult.error, null);
assert.equal(sessionResult.data.session.user.id, 'user-1');
assert.equal(calls.length, 4, 'Reading an already-hydrated session must not make another request.');

const context = await bridge.waitForSessionReady({ timeoutMs: 5000 });
assert.equal(context.isAuthenticated, true);
assert.equal(context.profile.display_name, 'Player One');
assert.equal(context.permissions.canRate, true);
assert.equal(context.permissions.canModerate, false);
assert.equal(calls.length, 4, 'Resolved account context must be served from the hydrated CCG session/profile.');

queue.push(response(200, {
  success: true,
  already_rated: false,
}));
const ratingStatus = await client.functions.invoke('lost-sizzler-feedback', {
  body: { action: 'rating_status' },
});
assert.equal(ratingStatus.error, null);
assert.equal(ratingStatus.data.success, true);
assert.equal(ratingStatus.data.already_rated, false);
assert.equal(calls[4].url, 'https://auth.cheekycommodoregamer.co.uk/v1/lost-sizzler/feedback');
assert.equal(calls[4].options.headers.authorization, 'Bearer ccg-access-1');
assert.deepEqual(JSON.parse(calls[4].options.body), { action: 'rating_status' });

queue.push(response(200, { success: true }));
const telemetry = await client.functions.invoke('lost-sizzler-feedback', {
  body: {
    action: 'telemetry',
    event: 'pilot-check',
    page_url: 'https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/',
  },
});
assert.equal(telemetry.error, null);
assert.equal(telemetry.data.success, true);
assert.equal(calls[5].url, 'https://auth.cheekycommodoregamer.co.uk/v1/lost-sizzler/feedback');
assert.equal(calls[5].options.headers.authorization, 'Bearer ccg-access-1');
assert.deepEqual(JSON.parse(calls[5].options.body), {
  action: 'telemetry',
  event: 'pilot-check',
  page_url: 'https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/',
});

queue.push(response(200, { success: true, feedback_id: 'feedback-1' }));
const feedbackSubmit = await client.functions.invoke('lost-sizzler-feedback', {
  body: {
    email: 'player@example.test',
    message: 'Compatibility bridge feedback test',
    page_url: 'https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/',
  },
});
assert.equal(feedbackSubmit.error, null);
assert.equal(feedbackSubmit.data.success, true);
assert.equal(feedbackSubmit.data.feedback_id, 'feedback-1');
assert.equal(calls[6].url, 'https://auth.cheekycommodoregamer.co.uk/v1/lost-sizzler/feedback');
assert.equal(calls[6].options.headers.authorization, undefined, 'Ordinary feedback remains anonymous by default.');
assert.deepEqual(JSON.parse(calls[6].options.body), {
  email: 'player@example.test',
  message: 'Compatibility bridge feedback test',
  page_url: 'https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/',
});

queue.push(response(200, {
  ready: true,
  signedIn: true,
  locked: true,
  weekStart: '2030-01-07',
  playerName: 'Player One',
  attempt: { id: 'attempt-1', status: 'started' },
  ghostReplay: null,
}));
const weeklyStart = await client.functions.invoke('ccq-weekly-challenge', {
  body: { action: 'start' },
});
assert.equal(weeklyStart.error, null);
assert.equal(weeklyStart.data.attempt.id, 'attempt-1');
assert.equal(calls[7].options.headers.authorization, 'Bearer ccg-access-1');

const badWeekly = await client.functions.invoke('ccq-weekly-challenge', {
  body: { action: 'delete-everything' },
});
assert.equal(badWeekly.data, null);
assert.equal(badWeekly.error.code, 'unsupported_weekly_action');
assert.equal(calls.length, 8, 'Unsupported Weekly Vault actions must fail before a request.');

const invalidFeedback = await client.functions.invoke('lost-sizzler-feedback', {
  body: ['not-an-object'],
});
assert.equal(invalidFeedback.data, null);
assert.equal(invalidFeedback.error.code, 'invalid_feedback_payload');
assert.equal(calls.length, 8, 'Invalid feedback payloads must fail locally before a request.');

const channel = client.channel('ccg-quest:AB12', {
  config: { presence: { key: 'player_1234' } },
});
assert.equal(typeof channel.subscribe, 'function');
assert.equal(typeof channel.track, 'function');
assert.equal(typeof channel.send, 'function');
assert.equal(PassiveWebSocket.instances, 0, 'Creating a Supabase-shaped channel must remain passive until subscribe().');
assert.equal(bridge.getDiagnostics().realtime.channelCount, 1);
await client.removeChannel(channel);
assert.equal(bridge.getDiagnostics().realtime.channelCount, 0);
assert.equal(PassiveWebSocket.instances, 0, 'Closing an unused channel must not create a WebSocket.');

queue.push(response(200, { revoked: true }));
const signedOut = await client.auth.signOut();
assert.equal(signedOut.error, null);
assert.equal(calls[8].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/logout');
assert.equal(calls[8].options.credentials, 'include');
const afterLogout = await client.auth.getSession();
assert.equal(afterLogout.data.session, null);
assert.equal(bridge.getDiagnostics().authenticated, false);

console.log('Lost Sizzler CCG compatibility contract passed: construction stays passive, legacy Weekly Vault and feedback Function calls map onto the CCG backend, migrated auth/profile state hydrates through first-party endpoints, and Supabase-shaped realtime remains opt-in.');
