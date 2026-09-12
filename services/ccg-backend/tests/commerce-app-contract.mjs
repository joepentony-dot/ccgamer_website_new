import assert from 'node:assert/strict';
import { createLostSizzlerCommerceApplication } from '../src/lost-sizzler-commerce-app.mjs';

const productRow = Object.freeze({
  product_slug: 'the-lost-sizzler-full-game',
  game_slug: 'the-lost-sizzler',
  title: 'C64 Dungeon Carnage — Full Game',
  currency: 'GBP',
  price_minor: 199,
  entitlement_kind: 'permanent',
  includes_all_updates: true,
  active: true,
});

function createDatabase() {
  return {
    async query(sql) {
      if (sql.includes('from game_products')) return { rows: [productRow] };
      if (sql.includes('from game_entitlements')) return { rows: [] };
      throw new Error(`Unexpected query: ${sql}`);
    },
    async transaction(callback) {
      return callback(this);
    },
  };
}

function createAuth() {
  const calls = [];
  return {
    calls,
    async verifyBearer(value) {
      calls.push(value);
      return value === 'Bearer valid-token' ? { userId: 'user-123' } : null;
    },
  };
}

async function expectRejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error?.code === code);
}

{
  let fetchCalls = 0;
  const auth = createAuth();
  const app = createLostSizzlerCommerceApplication({
    database: createDatabase(),
    auth,
    config: { commerceEnabled: false },
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('disabled commerce must not reach PayPal');
    },
  });

  assert.deepEqual(app.status, {
    commerce_enabled: false,
    provider: null,
    webhook_enabled: false,
  });

  const offer = await app.router.handle({
    method: 'GET',
    url: '/v1/lost-sizzler/commerce/offer',
    headers: {},
  });
  assert.equal(offer.statusCode, 200);
  assert.equal(offer.body.commerce_available, false);
  assert.equal(offer.body.product.price_minor, 199);
  assert.equal(offer.body.product.currency, 'GBP');
  assert.equal(offer.body.product.permanent, true);
  assert.equal(offer.body.product.includes_all_updates, true);
  assert.equal(offer.body.paypal, null);
  assert.equal(fetchCalls, 0);

  await expectRejectsCode(
    app.router.handle({
      method: 'POST',
      url: '/v1/lost-sizzler/commerce/paypal/webhook',
      headers: {},
      body: { id: 'WH-1', event_type: 'PAYMENT.CAPTURE.REFUNDED' },
    }),
    'commerce_unavailable'
  );
  assert.equal(fetchCalls, 0);
}

{
  assert.throws(
    () => createLostSizzlerCommerceApplication({
      database: createDatabase(),
      auth: createAuth(),
      config: { commerceEnabled: true },
    }),
    /PayPal environment sandbox or live/
  );
}

{
  let fetchCalls = 0;
  const auth = createAuth();
  const app = createLostSizzlerCommerceApplication({
    database: createDatabase(),
    auth,
    config: {
      commerceEnabled: true,
      paypalEnvironment: 'sandbox',
      paypalClientId: 'public-client-id-for-contract',
      paypalClientSecret: 'runtime-secret-for-contract-only',
      paypalWebhookId: 'webhook-id-for-contract',
    },
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('offer and entitlement reads must not call PayPal');
    },
  });

  assert.deepEqual(app.status, {
    commerce_enabled: true,
    provider: 'paypal',
    webhook_enabled: true,
  });

  const offer = await app.router.handle({
    method: 'GET',
    pathname: '/v1/lost-sizzler/commerce/offer',
    headers: {},
  });
  assert.equal(offer.body.commerce_available, true);
  assert.deepEqual(offer.body.paypal, {
    environment: 'sandbox',
    client_id: 'public-client-id-for-contract',
  });
  assert.equal(JSON.stringify(offer.body).includes('runtime-secret-for-contract-only'), false);
  assert.equal(fetchCalls, 0);

  const entitlement = await app.router.handle({
    method: 'GET',
    url: '/v1/lost-sizzler/commerce/entitlement?cache=0',
    headers: { authorization: 'Bearer valid-token' },
  });
  assert.equal(entitlement.statusCode, 200);
  assert.equal(entitlement.body.entitlement.owned, false);
  assert.equal(entitlement.body.entitlement.permanent, true);
  assert.equal(entitlement.body.entitlement.includes_all_updates, true);
  assert.deepEqual(auth.calls, ['Bearer valid-token']);
  assert.equal(fetchCalls, 0);
}

{
  assert.throws(
    () => createLostSizzlerCommerceApplication({ database: {}, auth: createAuth() }),
    /requires a database adapter/
  );
  assert.throws(
    () => createLostSizzlerCommerceApplication({ database: createDatabase(), auth: {} }),
    /requires an authentication adapter/
  );
}

console.log('C64 Dungeon Carnage commerce application composition contract passed.');
