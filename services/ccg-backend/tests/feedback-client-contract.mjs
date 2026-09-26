import assert from 'node:assert/strict';
import { createLostSizzlerFeedbackClient } from '../client/lost-sizzler-feedback.mjs';

function response(status, body, headers = {}) {
  const normalized = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return normalized.get(String(name).toLowerCase()) ?? null;
      },
    },
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

const client = createLostSizzlerFeedbackClient({
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  fetchImpl,
  getAccessToken: () => accessToken,
});

assert.equal(calls.length, 0, 'Constructing the feedback client must perform zero requests.');

queue.push(response(200, { success: true, authenticated: false, rated: false }));
const anonymousStatus = await client.ratingStatus();
assert.equal(anonymousStatus.ok, true);
assert.equal(anonymousStatus.authenticated, false);
assert.equal(calls[0].options.headers.authorization, undefined);
assert.equal(JSON.parse(calls[0].options.body).action, 'rating_status');

accessToken = 'ccg-access-feedback';
queue.push(response(200, { success: true, authenticated: true, rated: true }));
const authenticatedStatus = await client.ratingStatus();
assert.equal(authenticatedStatus.ok, true);
assert.equal(authenticatedStatus.rated, true);
assert.equal(calls[1].options.headers.authorization, 'Bearer ccg-access-feedback');

queue.push(response(200, { success: true, id: 44 }));
const telemetry = await client.telemetry({
  event_type: 'run_started',
  device_type: 'desktop',
  session_token: 'session-1',
});
assert.equal(telemetry.ok, true);
assert.equal(telemetry.id, 44);
assert.equal(JSON.parse(calls[2].options.body).action, 'telemetry');
assert.equal(calls[2].options.headers.authorization, 'Bearer ccg-access-feedback');

queue.push(response(200, { success: true, id: 17, email_status: 'sent' }));
const feedback = await client.submit({
  type: 'bug',
  message: 'This is a contract feedback message.',
  email: 'player@example.test',
  action: 'must-not-override',
});
assert.equal(feedback.ok, true);
assert.equal(feedback.email_status, 'sent');
assert.equal(JSON.parse(calls[3].options.body).action, undefined);
assert.equal(calls[3].options.headers.authorization, undefined);

queue.push(response(429, {
  success: false,
  error: 'Too many requests. Please try again shortly.',
}, { 'retry-after': '27' }));
const limited = await client.telemetry({ event_type: 'run_started' });
assert.equal(limited.ok, false);
assert.equal(limited.kind, 'rate_limited');
assert.equal(limited.retry_after, 27);

queue.push(new Error('offline'));
const networkFailure = await client.ratingStatus();
assert.deepEqual(networkFailure, {
  ok: false,
  kind: 'network_error',
  status: 0,
  error: 'network_error',
});

assert.throws(
  () => createLostSizzlerFeedbackClient({
    baseUrl: 'http://example.com',
    fetchImpl,
  }),
  /requires_https/
);

console.log('Lost Sizzler feedback client contract passed: construction is passive, auth is optional, actions preserve the source payload shape and failures remain contained.');
