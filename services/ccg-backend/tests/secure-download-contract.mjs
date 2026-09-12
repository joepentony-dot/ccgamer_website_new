import assert from 'node:assert/strict';
import { createLostSizzlerSecureDownloadService } from '../src/lost-sizzler-secure-download.mjs';
import { createLostSizzlerSecureDownloadHttp } from '../src/lost-sizzler-secure-download-http.mjs';

const NOW = Date.parse('2026-09-12T08:00:00.000Z');
const SHA = 'a'.repeat(64);

function entitlement(overrides = {}) {
  return {
    product_slug: 'the-lost-sizzler-full-game',
    owned: true,
    permanent: true,
    includes_all_updates: true,
    granted_at: '2026-09-12T07:00:00.000Z',
    ...overrides,
  };
}

function issued(overrides = {}) {
  return {
    kind: 'signed-url',
    url: 'https://downloads.example.test/c64-dungeon-carnage.zip?token=first',
    expiresAt: new Date(NOW + 10 * 60 * 1000).toISOString(),
    package: {
      package_id: 'c64-dungeon-carnage-windows',
      version: 'V10.42',
      sha256: SHA,
      bytes: 123456789,
    },
    ...overrides,
  };
}

let currentEntitlement = entitlement();
const entitlementCalls = [];
const commerce = {
  async entitlement(userId) {
    entitlementCalls.push(userId);
    return currentEntitlement;
  },
};

const deliveryCalls = [];
let nextIssued = issued();
const delivery = {
  async issueDownload(input) {
    deliveryCalls.push(input);
    return nextIssued;
  },
};

const downloads = createLostSizzlerSecureDownloadService({ commerce, delivery, now: () => NOW });
let verifiedBearer = null;
const auth = {
  async verifyBearer(value) {
    verifiedBearer = value;
    if (value !== 'Bearer owner-token') {
      const error = new Error('Invalid bearer token');
      error.statusCode = 401;
      throw error;
    }
    return { userId: 'owner-123' };
  },
};
const http = createLostSizzlerSecureDownloadHttp({ auth, downloads });

assert.equal(http.handles('POST', '/v1/lost-sizzler/commerce/downloads/offline'), true);
assert.equal(http.handles('GET', '/v1/lost-sizzler/commerce/downloads/offline'), false);

await assert.rejects(
  http.handle({ method: 'POST', headers: {} }, '/v1/lost-sizzler/commerce/downloads/offline'),
  (error) => error?.statusCode === 401
);
assert.equal(entitlementCalls.length, 0, 'Unauthenticated download requests must never reach entitlement lookup.');
assert.equal(deliveryCalls.length, 0, 'Unauthenticated download requests must never reach package delivery.');

currentEntitlement = entitlement({ owned: false });
await assert.rejects(
  http.handle({ method: 'POST', headers: { authorization: 'Bearer owner-token' } }, '/v1/lost-sizzler/commerce/downloads/offline'),
  (error) => error?.statusCode === 403 && error?.code === 'entitlement_required'
);
assert.equal(deliveryCalls.length, 0, 'A non-owner must never receive a package-delivery request.');

currentEntitlement = entitlement({ permanent: false });
await assert.rejects(
  http.handle({ method: 'POST', headers: { authorization: 'Bearer owner-token' } }, '/v1/lost-sizzler/commerce/downloads/offline'),
  (error) => error?.statusCode === 403 && error?.code === 'permanent_entitlement_required'
);
assert.equal(deliveryCalls.length, 0);

currentEntitlement = entitlement();
nextIssued = issued();
const first = await http.handle(
  { method: 'POST', headers: { authorization: 'Bearer owner-token' } },
  '/v1/lost-sizzler/commerce/downloads/offline'
);
assert.equal(first.statusCode, 200);
assert.equal(first.headers['cache-control'], 'no-store, private');
assert.equal(first.headers.pragma, 'no-cache');
assert.equal(first.body.product_slug, 'the-lost-sizzler-full-game');
assert.equal(first.body.download.kind, 'signed-url');
assert.match(first.body.download.url, /^https:\/\//);
assert.equal(first.body.package.sha256, SHA);
assert.equal(deliveryCalls.length, 1);
assert.deepEqual(deliveryCalls[0], {
  userId: 'owner-123',
  productSlug: 'the-lost-sizzler-full-game',
  purpose: 'desktop-offline',
  maxTtlSeconds: 900,
});
assert.equal(verifiedBearer, 'Bearer owner-token');

nextIssued = issued({
  url: 'https://downloads.example.test/c64-dungeon-carnage.zip?token=second',
  expiresAt: new Date(NOW + 9 * 60 * 1000).toISOString(),
});
const second = await http.handle(
  { method: 'POST', headers: { authorization: 'Bearer owner-token' } },
  '/v1/lost-sizzler/commerce/downloads/offline'
);
assert.notEqual(second.body.download.url, first.body.download.url, 'Re-download should be able to issue a fresh signed URL.');
assert.equal(entitlementCalls.at(-1), 'owner-123');
assert.equal(deliveryCalls.length, 2, 'Each re-download must re-authorize and issue fresh private delivery.');

currentEntitlement = entitlement({ owned: false });
await assert.rejects(
  http.handle({ method: 'POST', headers: { authorization: 'Bearer owner-token' } }, '/v1/lost-sizzler/commerce/downloads/offline'),
  (error) => error?.statusCode === 403 && error?.code === 'entitlement_required'
);
assert.equal(deliveryCalls.length, 2, 'A revoked/non-active entitlement must block future re-downloads.');

currentEntitlement = entitlement();
nextIssued = issued({ kind: 'public-url' });
await assert.rejects(
  downloads.issueOfflineDownload('owner-123'),
  (error) => error?.statusCode === 503 && error?.code === 'secure_download_unavailable'
);

nextIssued = issued({ url: 'http://downloads.example.test/game.zip?token=x' });
await assert.rejects(
  downloads.issueOfflineDownload('owner-123'),
  (error) => error?.statusCode === 503 && error?.code === 'secure_download_unavailable'
);

nextIssued = issued({ expiresAt: new Date(NOW + 16 * 60 * 1000).toISOString() });
await assert.rejects(
  downloads.issueOfflineDownload('owner-123'),
  (error) => error?.statusCode === 503 && error?.code === 'secure_download_unavailable'
);

nextIssued = issued({ package: { ...issued().package, sha256: 'bad' } });
await assert.rejects(
  downloads.issueOfflineDownload('owner-123'),
  (error) => error?.statusCode === 503 && error?.code === 'secure_download_unavailable'
);

await assert.rejects(
  http.handle({ method: 'GET', headers: { authorization: 'Bearer owner-token' } }, '/v1/lost-sizzler/commerce/downloads/offline'),
  (error) => error?.statusCode === 404 && error?.code === 'not_found'
);

assert.throws(
  () => createLostSizzlerSecureDownloadService({ commerce, delivery: {} }),
  /private package delivery adapter/
);

console.log('C64 Dungeon Carnage secure-download contract passed: authentication and permanent server entitlement are required, only short-lived HTTPS signed URLs are accepted, package provenance is validated, revoked ownership blocks re-download, and no permanent public download URL is exposed.');
