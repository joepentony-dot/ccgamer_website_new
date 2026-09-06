import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createAuthRecoveryHttp } from '../src/auth-recovery-http.mjs';

function request(body, headers = {}) {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(body, 'utf8')]);
  stream.headers = {
    'content-type': 'application/json',
    'user-agent': 'auth-recovery-http-contract',
    ...headers,
  };
  stream.socket = { remoteAddress: '127.0.0.1' };
  return stream;
}

const calls = [];
const recovery = {
  async request(input) {
    calls.push({ method: 'request', input });
    return { accepted: true };
  },
  async confirm(input) {
    calls.push({ method: 'confirm', input });
    return { reset: true, user_id: 'must-not-leak' };
  },
};
const http = createAuthRecoveryHttp(recovery);

assert.equal(http.handles('POST', '/v1/auth/recover'), true);
assert.equal(http.handles('POST', '/v1/auth/reset-password'), true);
assert.equal(http.handles('GET', '/v1/auth/recover'), false);
assert.equal(http.handles('POST', '/v1/auth/login'), false);

const requested = await http.handle(
  request(JSON.stringify({ email: 'player@example.test' })),
  '/v1/auth/recover'
);
assert.equal(requested.statusCode, 202);
assert.deepEqual(requested.body, { accepted: true });
assert.equal(calls[0].method, 'request');
assert.equal(calls[0].input.email, 'player@example.test');
assert.equal(calls[0].input.fingerprint, '127.0.0.1|auth-recovery-http-contract');

const reset = await http.handle(
  request(JSON.stringify({ token: 'A'.repeat(43), new_password: 'new-contract-password' })),
  '/v1/auth/reset-password'
);
assert.equal(reset.statusCode, 200);
assert.deepEqual(reset.body, { reset: true }, 'Recovery HTTP responses must not disclose the owning user ID.');
assert.deepEqual(calls[1], {
  method: 'confirm',
  input: { token: 'A'.repeat(43), new_password: 'new-contract-password' },
});

await assert.rejects(
  () => http.handle(request('{not-json'), '/v1/auth/recover'),
  (error) => error?.statusCode === 400 && error?.code === 'invalid_json'
);
assert.equal(calls.length, 2, 'Malformed JSON must be rejected before reaching the recovery service.');

await assert.rejects(
  () => http.handle(
    request('{}', { 'content-length': String(16 * 1024 + 1) }),
    '/v1/auth/recover'
  ),
  (error) => error?.statusCode === 413 && error?.code === 'request_too_large'
);
assert.equal(calls.length, 2, 'Oversized recovery requests must fail before service invocation.');

await assert.rejects(
  () => http.handle(request('{}', { 'content-type': 'text/plain' }), '/v1/auth/recover'),
  (error) => error?.statusCode === 415 && error?.code === 'content_type_must_be_json'
);

console.log('CCG password recovery HTTP contract passed: routes are explicit, request bodies are bounded, reset ownership is not disclosed, and malformed input fails before recovery logic.');
