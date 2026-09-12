import assert from 'node:assert/strict';
import { createLostSizzlerCommerceApplication } from '../src/lost-sizzler-commerce-app.mjs';

const NOW = Date.parse('2026-09-12T08:00:00.000Z');
const PRODUCT = Object.freeze({
  product_slug: 'the-lost-sizzler-full-game',
  game_slug: 'the-lost-sizzler',
  title: 'C64 Dungeon Carnage — Full Game',
  currency: 'GBP',
  price_minor: 199,
  entitlement_kind: 'permanent',
  includes_all_updates: true,
  active: true,
});
const ENTITLEMENT = Object.freeze({
  product_slug: 'the-lost-sizzler-full-game',
  entitlement_kind: 'permanent',
  status: 'active',
  granted_at: '2026-09-12T07:00:00.000Z',
  includes_all_updates: true,
});

function database() {
  return {
    async query(sql) {
      if (sql.includes('from game_products')) return { rows: [PRODUCT] };
      if (sql.includes('from game_entitlements')) return { rows: [ENTITLEMENT] };
      throw new Error(`Unexpected query: ${sql}`);
    },
    async transaction(callback) {
      return callback(this);
    },
  };
}

function auth() {
  return {
    async verifyBearer(value) {
      return value === 'Bearer owner-token' ? { userId: 'owner-1' } : null;
    },
  };
}

function packageDelivery() {
  const calls = [];
  return {
    calls,
    async issueDownload(request) {
      calls.push(request);
      return {
        kind: 'signed-url',
        url: 'https://private-download.example.test/c64-dungeon-carnage.zip?sig=contract',
        expiresAt: new Date(NOW + 10 * 60 * 1000).toISOString(),
        package: {
          package_id: 'c64-dungeon-carnage-windows',
          version: '2026.09.12.1',
          sha256: 'a'.repeat(64),
          bytes: 123456789,
        },
      };
    },
  };
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error?.code === code);
}

{
  const delivery = packageDelivery();
  const app = createLostSizzlerCommerceApplication({
    database: database(),
    auth: auth(),
    config: { commerceEnabled: false },
    packageDelivery: delivery,
    now: () => NOW,
  });

  assert.equal(app.status.secure_download_enabled, true);
  assert.equal(app.status.commerce_enabled, false);

  await rejectsCode(
    app.router.handle({
      method: 'POST',
      url: '/v1/lost-sizzler/commerce/downloads/offline',
      headers: {},
    }),
    'authentication_required'
  );
  assert.equal(delivery.calls.length, 0, 'unauthenticated requests must never reach private delivery');

  const response = await app.router.handle({
    method: 'POST',
    url: '/v1/lost-sizzler/commerce/downloads/offline?fresh=1',
    headers: { authorization: 'Bearer owner-token' },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.product_slug, 'the-lost-sizzler-full-game');
  assert.equal(response.body.download.kind, 'signed-url');
  assert.equal(response.body.download.url.startsWith('https://'), true);
  assert.equal(response.body.package.package_id, 'c64-dungeon-carnage-windows');
  assert.equal(response.headers['cache-control'], 'no-store, private');
  assert.equal(response.headers.pragma, 'no-cache');
  assert.equal(delivery.calls.length, 1);
  assert.deepEqual(delivery.calls[0], {
    userId: 'owner-1',
    productSlug: 'the-lost-sizzler-full-game',
    purpose: 'desktop-offline',
    maxTtlSeconds: 900,
  });
}

{
  const app = createLostSizzlerCommerceApplication({
    database: database(),
    auth: auth(),
    config: { commerceEnabled: false },
    now: () => NOW,
  });

  assert.equal(app.status.secure_download_enabled, false);
  await rejectsCode(
    app.router.handle({
      method: 'POST',
      url: '/v1/lost-sizzler/commerce/downloads/offline',
      headers: { authorization: 'Bearer owner-token' },
    }),
    'not_found'
  );
}

{
  assert.throws(
    () => createLostSizzlerCommerceApplication({
      database: database(),
      auth: auth(),
      config: { commerceEnabled: false },
      packageDelivery: {},
      now: () => NOW,
    }),
    /requires a private package delivery adapter/
  );
}

console.log('C64 Dungeon Carnage secure download composition contract passed.');
