import assert from 'node:assert/strict';
import { createLostSizzlerPurchaseClient } from '../client/lost-sizzler-purchase.mjs';

const NOW = Date.parse('2026-09-12T13:00:00Z');
const SHA = 'a'.repeat(64);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function grant(url, expiresAt = new Date(NOW + 5 * 60 * 1000).toISOString()) {
  return {
    product_slug: 'the-lost-sizzler-full-game',
    download: { kind: 'signed-url', url, expires_at: expiresAt },
    package: {
      package_id: 'c64-dungeon-carnage-windows',
      version: '10.42',
      sha256: SHA,
      bytes: 123456,
    },
  };
}

const calls = [];
const responses = [
  jsonResponse(grant('https://private-download.example.test/package.zip?sig=one')),
  jsonResponse(grant('https://private-download.example.test/package.zip?sig=two')),
];
const client = createLostSizzlerPurchaseClient({
  baseUrl: 'https://api.cheekycommodoregamer.co.uk',
  getAccessToken: () => 'account-token',
  now: () => NOW,
  fetchImpl: async (url, options = {}) => {
    calls.push({ url, options });
    const response = responses.shift();
    if (!response) throw new Error('unexpected request');
    return response;
  },
});

const first = await client.requestOfflineDownload();
const second = await client.requestOfflineDownload();
assert.equal(calls.length, 2, 'A permanent owner must be able to request a fresh re-download grant later.');
for (const call of calls) {
  assert.equal(call.url, 'https://api.cheekycommodoregamer.co.uk/v1/lost-sizzler/commerce/downloads/offline');
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.headers.authorization, 'Bearer account-token');
  assert.equal(call.options.credentials, 'include');
}
assert.notEqual(first.download.url, second.download.url, 're-download requests should accept independently issued short-lived grants.');
assert.equal(first.package.sha256, SHA);
assert.equal(first.package.bytes, 123456);
assert.equal(first.download.expires_at, new Date(NOW + 5 * 60 * 1000).toISOString());

const unauthenticatedCalls = [];
const unauthenticated = createLostSizzlerPurchaseClient({
  baseUrl: 'https://api.cheekycommodoregamer.co.uk',
  getAccessToken: () => '',
  now: () => NOW,
  fetchImpl: async (...args) => { unauthenticatedCalls.push(args); return jsonResponse(grant('https://private.example.test/file.zip')); },
});
await assert.rejects(
  unauthenticated.requestOfflineDownload(),
  (error) => error?.statusCode === 401 && error?.code === 'authentication_required'
);
assert.equal(unauthenticatedCalls.length, 0, 'Missing authentication must fail locally before requesting a purchaser download.');

for (const invalidGrant of [
  grant('http://private.example.test/file.zip'),
  grant('https://user:pass@private.example.test/file.zip'),
  grant('https://private.example.test/file.zip#fragment'),
  grant('https://private.example.test/file.zip', new Date(NOW + 16 * 60 * 1000).toISOString()),
  { ...grant('https://private.example.test/file.zip'), package: { ...grant('https://private.example.test/file.zip').package, sha256: 'bad' } },
]) {
  const invalid = createLostSizzlerPurchaseClient({
    baseUrl: 'https://api.cheekycommodoregamer.co.uk',
    getAccessToken: () => 'account-token',
    now: () => NOW,
    fetchImpl: async () => jsonResponse(invalidGrant),
  });
  await assert.rejects(
    invalid.requestOfflineDownload(),
    (error) => error?.statusCode === 503 && error?.code === 'secure_download_unavailable'
  );
}

const revoked = createLostSizzlerPurchaseClient({
  baseUrl: 'https://api.cheekycommodoregamer.co.uk',
  getAccessToken: () => 'account-token',
  now: () => NOW,
  fetchImpl: async () => jsonResponse({ error: 'entitlement_required' }, 403),
});
await assert.rejects(
  revoked.requestOfflineDownload(),
  (error) => error?.statusCode === 403 && error?.code === 'entitlement_required'
);

console.log('C64 Dungeon Carnage browser re-download client contract passed: authenticated owners can request fresh signed grants repeatedly, missing/revoked ownership fails closed, and malformed or overlong grants never reach browser UI.');
