import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createAuthHttp } from '../src/auth-http.mjs';

function request(method, { body = null, cookie = '', contentType = 'application/json', userAgent = 'CCG contract browser' } = {}) {
  const chunks = body == null ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8')];
  const stream = Readable.from(chunks);
  stream.method = method;
  stream.headers = {
    ...(body == null ? {} : { 'content-type': contentType, 'content-length': String(chunks[0].length) }),
    ...(cookie ? { cookie } : {}),
    'user-agent': userAgent,
  };
  stream.socket = { remoteAddress: '127.0.0.1' };
  return stream;
}

const calls = [];
const auth = {
  jwks() {
    return { keys: [{ kty: 'OKP', crv: 'Ed25519', x: 'public-contract-x', kid: 'contract-key' }] };
  },
  async login(input) {
    calls.push(['login', input]);
    return {
      user_id: 'contract-user',
      access_token: 'access-token-1',
      expires_in: 900,
      refresh_token: 'refresh-token-login-contract-1234567890',
      refresh_expires_at: '2030-01-02T03:04:05.000Z',
    };
  },
  async refresh(token) {
    calls.push(['refresh', token]);
    return {
      user_id: 'contract-user',
      access_token: 'access-token-2',
      expires_in: 900,
      refresh_token: 'refresh-token-rotated-contract-0987654321',
      refresh_expires_at: '2030-02-03T04:05:06.000Z',
    };
  },
  async logout(token) {
    calls.push(['logout', token]);
    return { revoked: true };
  },
};

const http = createAuthHttp(auth);

assert.equal(http.handles('GET', '/.well-known/jwks.json'), true);
assert.equal(http.handles('POST', '/v1/auth/login'), true);
assert.equal(http.handles('GET', '/v1/auth/login'), false);
assert.equal(http.handles('POST', '/anything-else'), false);

const jwks = await http.handle(request('GET'), '/.well-known/jwks.json');
assert.equal(jwks.statusCode, 200);
assert.equal(jwks.body.keys.length, 1);
assert.equal(jwks.body.keys[0].d, undefined);

const login = await http.handle(
  request('POST', { body: { email: 'Player@Example.test', password: 'contract-password' } }),
  '/v1/auth/login'
);
assert.equal(login.statusCode, 200);
assert.equal(login.body.user_id, 'contract-user');
assert.equal(login.body.access_token, 'access-token-1');
assert.equal(login.body.refresh_token, undefined, 'Raw refresh tokens must not be exposed in the JSON response.');
assert.match(login.headers['set-cookie'], /^ccg_refresh=refresh-token-login-contract-1234567890;/);
assert.match(login.headers['set-cookie'], /HttpOnly/);
assert.match(login.headers['set-cookie'], /Secure/);
assert.match(login.headers['set-cookie'], /SameSite=Strict/);
assert.match(login.headers['set-cookie'], /Path=\/v1\/auth/);
assert.equal(calls[0][0], 'login');
assert.equal(calls[0][1].email, 'Player@Example.test');
assert.match(calls[0][1].fingerprint, /^127\.0\.0\.1\|CCG contract browser$/);

const refresh = await http.handle(
  request('POST', { cookie: 'other=value; ccg_refresh=refresh-token-login-contract-1234567890' }),
  '/v1/auth/refresh'
);
assert.equal(refresh.statusCode, 200);
assert.equal(refresh.body.access_token, 'access-token-2');
assert.equal(refresh.body.refresh_token, undefined);
assert.match(refresh.headers['set-cookie'], /^ccg_refresh=refresh-token-rotated-contract-0987654321;/);
assert.deepEqual(calls[1], ['refresh', 'refresh-token-login-contract-1234567890']);

const logout = await http.handle(
  request('POST', { cookie: 'ccg_refresh=refresh-token-rotated-contract-0987654321' }),
  '/v1/auth/logout'
);
assert.equal(logout.statusCode, 200);
assert.equal(logout.body.revoked, true);
assert.match(logout.headers['set-cookie'], /^ccg_refresh=;/);
assert.match(logout.headers['set-cookie'], /Max-Age=0/);
assert.deepEqual(calls[2], ['logout', 'refresh-token-rotated-contract-0987654321']);

const noCookieLogout = await http.handle(request('POST'), '/v1/auth/logout');
assert.equal(noCookieLogout.body.revoked, false);
assert.equal(calls.length, 3, 'Cookie-less logout must not invoke a token lookup.');

await assert.rejects(
  http.handle(request('POST'), '/v1/auth/refresh'),
  (error) => error?.statusCode === 401 && error?.code === 'invalid_refresh_token'
);

await assert.rejects(
  http.handle(request('POST', { body: { email: 'x', password: 'y' }, contentType: 'text/plain' }), '/v1/auth/login'),
  (error) => error?.statusCode === 415 && error?.code === 'content_type_must_be_json'
);

const oversized = 'x'.repeat(17 * 1024);
await assert.rejects(
  http.handle(request('POST', { body: oversized }), '/v1/auth/login'),
  (error) => error?.statusCode === 413 && error?.code === 'request_too_large'
);

console.log('CCG auth HTTP contract passed: local-auth endpoints are explicit, refresh tokens stay in Secure HttpOnly cookies, and refresh/logout use cookie-bound rotation/revocation.');
