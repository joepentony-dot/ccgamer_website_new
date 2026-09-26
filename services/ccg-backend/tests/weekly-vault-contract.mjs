import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { seedForWeek, sanitizeGhostPath, validateWeeklyResult, weekStartUtc } from '../src/weekly-vault.mjs';
import { createWeeklyVaultHttp } from '../src/weekly-vault-http.mjs';

assert.equal(weekStartUtc(Date.UTC(2026, 8, 6, 12, 0, 0)), '2026-08-31');
assert.equal(weekStartUtc(Date.UTC(2026, 8, 7, 0, 0, 0)), '2026-09-07');
assert.equal(seedForWeek('2026-08-31'), 'CCQ-WEEKLY-20260831');

assert.deepEqual(sanitizeGhostPath([
  { f: 1, x: 10.9, y: 20.1, t: 100 },
  { f: 2, x: 9999, y: -5, t: 90 },
  { f: 8, x: 512, y: 512, t: 200 },
]), [
  { f: 1, x: 10, y: 20, t: 100 },
  { f: 5, x: 512, y: 512, t: 200 },
]);

const valid = validateWeeklyResult({
  score: 12345,
  deepestFloor: 3,
  durationMs: 90_000,
  level: 4,
  completed: false,
  kills: 12,
  secrets: 2,
  ghostPath: [
    { f: 1, x: 20, y: 30, t: 0 },
    { f: 3, x: 40, y: 50, t: 89_000 },
  ],
}, new Date(Date.UTC(2030, 0, 7, 11, 57, 0)), Date.UTC(2030, 0, 7, 12, 0, 0));
assert.equal(valid.score, 12345);
assert.equal(valid.deepestFloor, 3);
assert.equal(valid.path.length, 2);

assert.throws(
  () => validateWeeklyResult({ completed: true, deepestFloor: 4 }, new Date(0), 120_000),
  (error) => error?.statusCode === 422 && error?.code === 'weekly_completed_floor_mismatch'
);
assert.throws(
  () => validateWeeklyResult({ deepestFloor: 1, durationMs: 1_000, ghostPath: [{ f: 2, x: 1, y: 1, t: 500 }] }, new Date(0), 120_000),
  (error) => error?.statusCode === 422 && error?.code === 'weekly_ghost_floor_integrity_failed'
);

function request(body, { authorization = '', contentType = 'application/json', forwarded = '203.0.113.10' } = {}) {
  const bytes = Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8');
  const stream = Readable.from([bytes]);
  stream.method = 'POST';
  stream.headers = {
    'content-type': contentType,
    'content-length': String(bytes.length),
    'user-agent': 'CCG weekly contract browser',
    'x-forwarded-for': forwarded,
    ...(authorization ? { authorization } : {}),
  };
  stream.socket = { remoteAddress: '127.0.0.1' };
  return stream;
}

const authCalls = [];
const auth = {
  async verifyBearer(header) {
    authCalls.push(header);
    if (header !== 'Bearer contract-token') {
      const error = new Error('invalid_bearer_token');
      error.statusCode = 401;
      error.code = 'invalid_bearer_token';
      throw error;
    }
    return { userId: 'contract-user' };
  },
};

const serviceCalls = [];
const weeklyVault = {
  async status(input) {
    serviceCalls.push(['status', input]);
    return { ok: true, ready: true, signedIn: Boolean(input.userId) };
  },
  async ghost(input) {
    serviceCalls.push(['ghost', input]);
    return { ok: true, ghost: null };
  },
  async start(input) {
    serviceCalls.push(['start', input]);
    return { ok: true, attempt: { id: 'attempt' } };
  },
  async finish(input) {
    serviceCalls.push(['finish', input]);
    return { ok: true, idempotent: false };
  },
};

const http = createWeeklyVaultHttp({ auth, weeklyVault });
assert.equal(http.handles('POST', '/v1/lost-sizzler/weekly-vault'), true);
assert.equal(http.handles('GET', '/v1/lost-sizzler/weekly-vault'), false);

const anonymous = await http.handle(request({ action: 'status' }), '/v1/lost-sizzler/weekly-vault');
assert.equal(anonymous.statusCode, 200);
assert.equal(serviceCalls[0][0], 'status');
assert.equal(serviceCalls[0][1].userId, null);
assert.match(serviceCalls[0][1].fingerprint, /127\.0\.0\.1\|203\.0\.113\.10\|CCG weekly contract browser/);
assert.equal(authCalls.length, 0, 'Public weekly status must not require a bearer token.');

const signedStatus = await http.handle(
  request({ action: 'status' }, { authorization: 'Bearer contract-token' }),
  '/v1/lost-sizzler/weekly-vault'
);
assert.equal(signedStatus.body.signedIn, true);
assert.equal(authCalls.length, 1);
assert.equal(serviceCalls[1][1].userId, 'contract-user');

await assert.rejects(
  http.handle(request({ action: 'start' }), '/v1/lost-sizzler/weekly-vault'),
  (error) => error?.statusCode === 401 && error?.code === 'authentication_required'
);

await http.handle(
  request({ action: 'ghost' }, { authorization: 'Bearer contract-token' }),
  '/v1/lost-sizzler/weekly-vault'
);
await http.handle(
  request({ action: 'start' }, { authorization: 'Bearer contract-token' }),
  '/v1/lost-sizzler/weekly-vault'
);
await http.handle(
  request({ action: 'finish', attemptId: 'attempt-id', result: { score: 1 } }, { authorization: 'Bearer contract-token' }),
  '/v1/lost-sizzler/weekly-vault'
);
const finishCall = serviceCalls.at(-1);
assert.equal(finishCall[0], 'finish');
assert.equal(finishCall[1].attemptId, 'attempt-id');
assert.deepEqual(finishCall[1].result, { score: 1 });

await assert.rejects(
  http.handle(request({ action: 'nope' }), '/v1/lost-sizzler/weekly-vault'),
  (error) => error?.statusCode === 400 && error?.code === 'unknown_weekly_action'
);
await assert.rejects(
  http.handle(request({ action: 'status' }, { contentType: 'text/plain' }), '/v1/lost-sizzler/weekly-vault'),
  (error) => error?.statusCode === 415 && error?.code === 'content_type_must_be_json'
);

console.log('CCG Weekly Vault contract passed: week identity, ghost/result integrity and authenticated/public HTTP boundaries match the migration plan.');
