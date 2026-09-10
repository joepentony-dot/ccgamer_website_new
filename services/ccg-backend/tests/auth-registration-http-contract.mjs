import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createAuthRegistrationHttp } from '../src/auth-registration-http.mjs';

function request(body, headers = {}) {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(body, 'utf8')]);
  stream.headers = {
    'content-type': 'application/json',
    'user-agent': 'auth-registration-http-contract',
    ...headers,
  };
  stream.socket = { remoteAddress: '127.0.0.1' };
  return stream;
}

const calls = [];
const registration = {
  async register(input) {
    calls.push({ method: 'register', input });
    return { accepted: true, verification_required: true };
  },
  async confirmEmail(token) {
    calls.push({ method: 'confirmEmail', token });
    return { confirmed: true, user_id: 'ccg-user-1' };
  },
};

const http = createAuthRegistrationHttp(registration);

assert.equal(http.handles('POST', '/v1/auth/register'), true);
assert.equal(http.handles('POST', '/v1/auth/confirm-email'), true);
assert.equal(http.handles('GET', '/v1/auth/register'), false);
assert.equal(http.handles('POST', '/v1/auth/login'), false);

const preferences = {
  notify_new_games: true,
  notify_newsletter: false,
  notify_new_games_choice_recorded: true,
  notify_newsletter_choice_recorded: true,
};
const registered = await http.handle(
  request(JSON.stringify({
    email: 'player@example.test',
    password: 'registration-password',
    notification_preferences: preferences,
  })),
  '/v1/auth/register'
);
assert.equal(registered.statusCode, 202);
assert.deepEqual(registered.body, { accepted: true, verification_required: true });
assert.deepEqual(calls[0], {
  method: 'register',
  input: {
    email: 'player@example.test',
    password: 'registration-password',
    notificationPreferences: preferences,
    fingerprint: '127.0.0.1|auth-registration-http-contract',
  },
});

const registeredWithoutPreferences = await http.handle(
  request(JSON.stringify({
    email: 'plain@example.test',
    password: 'registration-password',
  })),
  '/v1/auth/register'
);
assert.equal(registeredWithoutPreferences.statusCode, 202);
assert.equal(calls[1].input.notificationPreferences, undefined);

const confirmed = await http.handle(
  request(JSON.stringify({ token: 'A'.repeat(43) })),
  '/v1/auth/confirm-email'
);
assert.equal(confirmed.statusCode, 200);
assert.deepEqual(confirmed.body, { confirmed: true, user_id: 'ccg-user-1' });
assert.deepEqual(calls[2], { method: 'confirmEmail', token: 'A'.repeat(43) });

await assert.rejects(
  () => http.handle(request('{not-json'), '/v1/auth/register'),
  (error) => error?.statusCode === 400 && error?.code === 'invalid_json'
);
assert.equal(calls.length, 3, 'Malformed JSON must be rejected before registration service invocation.');

await assert.rejects(
  () => http.handle(
    request('{}', { 'content-length': String(16 * 1024 + 1) }),
    '/v1/auth/register'
  ),
  (error) => error?.statusCode === 413 && error?.code === 'request_too_large'
);
assert.equal(calls.length, 3, 'Oversized registration requests must fail before service invocation.');

await assert.rejects(
  () => http.handle(request('{}', { 'content-type': 'text/plain' }), '/v1/auth/register'),
  (error) => error?.statusCode === 415 && error?.code === 'content_type_must_be_json'
);

console.log('CCG registration HTTP contract passed: routes are explicit, request bodies are bounded, and recorded notification preferences are forwarded without inventing them when absent.');
