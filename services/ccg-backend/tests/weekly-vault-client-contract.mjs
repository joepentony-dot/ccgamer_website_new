import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createLostSizzlerWeeklyVault } from '../client/lost-sizzler-weekly-vault.mjs';

function response(status, body, retryAfter = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return String(name).toLowerCase() === 'retry-after' && retryAfter != null ? String(retryAfter) : null;
      },
    },
    async text() {
      return body === undefined ? '' : JSON.stringify(body);
    },
  };
}

let accessToken = '';
const calls = [];
const queue = [];
const fetchImpl = async (url, options) => {
  calls.push({ url, options: structuredClone(options) });
  if (!queue.length) throw new Error('Unexpected Weekly Vault request');
  const next = queue.shift();
  if (next instanceof Error) throw next;
  return next;
};

const weekly = createLostSizzlerWeeklyVault({
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk/',
  getAccessToken: () => accessToken,
  fetchImpl,
});

assert.equal(calls.length, 0, 'Constructing the Weekly Vault client must perform zero network requests.');
assert.throws(
  () => createLostSizzlerWeeklyVault({ baseUrl: 'http://remote.example.test', getAccessToken: () => '', fetchImpl }),
  /ccg_backend_requires_https/
);
assert.throws(
  () => createLostSizzlerWeeklyVault({ baseUrl: 'https://user:pass@example.test', getAccessToken: () => '', fetchImpl }),
  /ccg_backend_url_must_not_include_credentials/
);

queue.push(response(200, {
  ready: true,
  signedIn: false,
  locked: false,
  weekStart: '2030-01-07',
  seed: 'CCQ-WEEKLY-20300107',
  leaderboard: [],
  ghostReplay: null,
}));
const anonymous = await weekly.status();
assert.equal(anonymous.ok, true);
assert.equal(anonymous.signedIn, false);
assert.equal(calls[0].url, 'https://auth.cheekycommodoregamer.co.uk/v1/lost-sizzler/weekly-vault');
assert.equal(calls[0].options.method, 'POST');
assert.equal(calls[0].options.credentials, 'omit');
assert.equal(calls[0].options.headers.authorization, undefined);
assert.deepEqual(JSON.parse(calls[0].options.body), { action: 'status' });

const noAuthStart = await weekly.start();
assert.equal(noAuthStart.ok, false);
assert.equal(noAuthStart.kind, 'unauthenticated');
assert.equal(calls.length, 1, 'Authenticated Weekly Vault operations must fail locally when no token exists.');

accessToken = 'ccg-weekly-access-token';
queue.push(response(200, {
  ready: true,
  signedIn: true,
  locked: false,
  weekStart: '2030-01-07',
  seed: 'CCQ-WEEKLY-20300107',
  playerName: 'Contract Player',
  leaderboard: [],
  ghostReplay: null,
}));
const signedStatus = await weekly.status();
assert.equal(signedStatus.signedIn, true);
assert.equal(calls[1].options.headers.authorization, 'Bearer ccg-weekly-access-token');

queue.push(response(200, {
  signedIn: true,
  locked: true,
  weekStart: '2030-01-07',
  attempt: { id: '11111111-1111-4111-8111-111111111111' },
  leaderboard: [],
  ghostReplay: null,
}));
const started = await weekly.start();
assert.equal(started.ok, true);
assert.equal(started.locked, true);
assert.deepEqual(JSON.parse(calls[2].options.body), { action: 'start' });

queue.push(response(200, {
  locked: true,
  idempotent: false,
  weekStart: '2030-01-07',
  leaderboard: [{ player_name: 'Contract Player', score: 12345 }],
  ghostReplay: null,
}));
const finished = await weekly.finish({
  attemptId: '11111111-1111-4111-8111-111111111111',
  result: { score: 12345, deepestFloor: 3, durationMs: 60000, level: 4, completed: false, ghostPath: [] },
});
assert.equal(finished.ok, true);
assert.equal(finished.idempotent, false);
const finishBody = JSON.parse(calls[3].options.body);
assert.equal(finishBody.action, 'finish');
assert.equal(finishBody.attemptId, '11111111-1111-4111-8111-111111111111');
assert.equal(finishBody.result.score, 12345);

const invalidFinish = await weekly.finish({ attemptId: '', result: null });
assert.equal(invalidFinish.ok, false);
assert.equal(invalidFinish.kind, 'invalid_request');
assert.equal(calls.length, 4);

queue.push(response(429, { error: 'weekly_rate_limited' }, 37));
const limited = await weekly.ghost();
assert.equal(limited.ok, false);
assert.equal(limited.kind, 'rate_limited');
assert.equal(limited.retry_after_seconds, 37);

queue.push(new Error('offline'));
const offline = await weekly.status();
assert.equal(offline.ok, false);
assert.equal(offline.kind, 'network_error');

const source = await fs.readFile(new URL('../client/lost-sizzler-weekly-vault.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie/, 'Weekly Vault must not persist or inspect browser credentials.');
assert.doesNotMatch(source, /supabase/i, 'The CCG Weekly Vault client must not depend on Supabase.');

console.log('CCG Weekly Vault browser contract passed: public status is passive, authenticated actions use only the in-memory CCG bearer token, and no browser credential persistence is introduced.');
