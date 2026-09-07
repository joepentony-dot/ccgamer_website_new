import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createLostSizzlerFeedbackHttp } from '../src/lost-sizzler-feedback-http.mjs';

function request(method, body, headers = {}) {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(body, 'utf8')]);
  stream.method = method;
  stream.headers = {
    'content-type': 'application/json',
    'user-agent': 'feedback-http-contract-agent',
    ...headers,
  };
  stream.socket = { remoteAddress: '127.0.0.1' };
  return stream;
}

const calls = [];
const service = {
  async ratingStatus(input) {
    calls.push({ method: 'ratingStatus', input });
    return { success: true, authenticated: Boolean(input.authUserId), rated: false };
  },
  async recordTelemetry(input) {
    calls.push({ method: 'recordTelemetry', input });
    return { success: true, id: 22 };
  },
  async submitFeedback(input) {
    calls.push({ method: 'submitFeedback', input });
    if (input.payload.message === 'limit this feedback') {
      const error = new Error('Too many requests. Please try again shortly.');
      error.statusCode = 429;
      error.code = 'too_many_requests';
      error.retryAfterSeconds = 19;
      throw error;
    }
    return { success: true, id: 23, email_status: 'failed' };
  },
};
const auth = {
  async verifyBearer(value) {
    if (value === 'Bearer valid') return { userId: 'http-contract-user' };
    throw Object.assign(new Error('invalid token'), { statusCode: 401 });
  },
};
const http = createLostSizzlerFeedbackHttp({ service, auth });

assert.equal(http.handles('POST', '/v1/lost-sizzler/feedback'), true);
assert.equal(http.handles('POST', '/v1/lost-sizzler/other'), false);

const methodNotAllowed = await http.handle(request('GET'));
assert.equal(methodNotAllowed.statusCode, 405);
assert.equal(methodNotAllowed.headers.allow, 'POST, OPTIONS');

const anonymousRating = await http.handle(request(
  'POST',
  JSON.stringify({ action: 'rating_status' }),
  { 'x-forwarded-for': '198.51.100.15, 10.0.0.2' }
));
assert.equal(anonymousRating.statusCode, 200);
assert.equal(anonymousRating.body.authenticated, false);
assert.match(calls[0].input.fingerprint, /^[0-9a-f]{24}$/);
assert.equal(calls[0].input.fingerprint.includes('198.51.100.15'), false);

const authenticatedRating = await http.handle(request(
  'POST',
  JSON.stringify({ action: 'rating_status' }),
  { authorization: 'Bearer valid' }
));
assert.equal(authenticatedRating.body.authenticated, true);
assert.equal(calls[1].input.authUserId, 'http-contract-user');

const invalidBearerTelemetry = await http.handle(request(
  'POST',
  JSON.stringify({ action: 'telemetry', event_type: 'run_started' }),
  { authorization: 'Bearer invalid' }
));
assert.equal(invalidBearerTelemetry.statusCode, 200);
assert.equal(calls[2].method, 'recordTelemetry');
assert.equal(calls[2].input.authUserId, null);

const submitted = await http.handle(request(
  'POST',
  JSON.stringify({ type: 'bug', message: 'A valid feedback message.' })
));
assert.equal(submitted.statusCode, 200);
assert.equal(calls[3].method, 'submitFeedback');

const invalidJson = await http.handle(request('POST', '{not-json'));
assert.equal(invalidJson.statusCode, 400);
assert.equal(invalidJson.body.error, 'Invalid JSON');

const limited = await http.handle(request(
  'POST',
  JSON.stringify({ message: 'limit this feedback' })
));
assert.equal(limited.statusCode, 429);
assert.equal(limited.headers['retry-after'], '19');

console.log('Lost Sizzler feedback HTTP contract passed: the compatibility endpoint routes actions, hashes request identity, treats invalid bearer tokens as anonymous and preserves retry guidance.');
