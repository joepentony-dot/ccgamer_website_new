import assert from 'node:assert/strict';
import { createLostSizzlerCommerceService } from '../src/lost-sizzler-commerce.mjs';

const PRODUCT_SLUG = 'the-lost-sizzler-full-game';
const product = {
  product_slug: PRODUCT_SLUG,
  game_slug: 'the-lost-sizzler',
  title: 'C64 Dungeon Carnage — Full Game',
  currency: 'GBP',
  price_minor: 199,
  entitlement_kind: 'permanent',
  includes_all_updates: true,
  active: true,
};

function createFakeDatabase() {
  const purchases = new Map();
  const entitlements = new Map();

  async function query(sql, params = []) {
    const text = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();

    if (text.includes('from game_products')) return { rows: [product] };

    if (text.includes('from game_entitlements e')) {
      const row = entitlements.get(`${params[0]}:${params[1]}`) || null;
      return { rows: row ? [{ ...row, includes_all_updates: true }] : [] };
    }

    if (text.startsWith('insert into game_purchase_orders')) {
      const [id, userId, productSlug, amountMinor, currency] = params;
      purchases.set(id, {
        id,
        user_id: userId,
        product_slug: productSlug,
        provider_order_id: null,
        provider_capture_id: null,
        amount_minor: amountMinor,
        currency,
        status: 'creating',
        provider_status: null,
        failure_code: null,
      });
      return { rows: [] };
    }

    if (text.includes("set provider_order_id = $2") && text.includes("status = 'created'")) {
      const [id, providerOrderId, providerStatus] = params;
      const row = purchases.get(id);
      if (row && row.status === 'creating') {
        row.provider_order_id = providerOrderId;
        row.provider_status = providerStatus;
        row.status = 'created';
      }
      return { rows: [] };
    }

    if (text.includes('where provider_order_id = $1 and user_id = $2')) {
      const [providerOrderId, userId] = params;
      const row = [...purchases.values()].find((candidate) => candidate.provider_order_id === providerOrderId && candidate.user_id === userId);
      return { rows: row ? [{ ...row }] : [] };
    }

    if (text.includes('for update') && text.includes('where id = $1 and user_id = $2')) {
      const [id, userId] = params;
      const row = purchases.get(id);
      return { rows: row && row.user_id === userId ? [{ ...row }] : [] };
    }

    if (text.includes("set provider_capture_id = $2") && text.includes("status = 'completed'")) {
      const [id, providerCaptureId] = params;
      const row = purchases.get(id);
      row.provider_capture_id = providerCaptureId;
      row.provider_status = 'COMPLETED';
      row.status = 'completed';
      row.failure_code = null;
      return { rows: [] };
    }

    if (text.startsWith('insert into game_entitlements')) {
      const [userId, productSlug, purchaseId] = params;
      const key = `${userId}:${productSlug}`;
      const existing = entitlements.get(key);
      entitlements.set(key, {
        product_slug: productSlug,
        entitlement_kind: 'permanent',
        status: 'active',
        granted_at: existing?.status === 'active' ? existing.granted_at : new Date('2026-09-12T00:00:00Z'),
        source_provider: 'paypal',
        source_purchase_id: purchaseId,
      });
      return { rows: [] };
    }

    if (text.includes("set status = 'failed'")) {
      const [id, failureCode] = params;
      const row = purchases.get(id);
      if (row && ['creating', 'created'].includes(row.status)) {
        row.status = 'failed';
        row.failure_code = failureCode;
      }
      return { rows: [] };
    }

    throw new Error(`Unexpected fake-database query: ${text}`);
  }

  return {
    query,
    transaction: async (work) => work({ query }),
    purchases,
    entitlements,
  };
}

const database = createFakeDatabase();
let createCalls = 0;
let captureCalls = 0;
let mismatchCapture = false;
let nextOrderId = 'PAYPALORDER199';

const gateway = Object.freeze({
  publicConfig() {
    return { environment: 'sandbox', clientId: 'public-sandbox-client-id' };
  },
  async createOrder({ localOrderId, amountMinor, currency, description }) {
    createCalls += 1;
    assert.match(localOrderId, /^[0-9a-f-]{36}$/i);
    assert.equal(amountMinor, 199);
    assert.equal(currency, 'GBP');
    assert.match(description, /C64 Dungeon Carnage/);
    return { orderId: nextOrderId, status: 'CREATED' };
  },
  async captureOrder({ orderId }) {
    captureCalls += 1;
    const row = [...database.purchases.values()].find((candidate) => candidate.provider_order_id === orderId);
    assert.ok(row, 'Capture must correspond to a locally recorded order.');
    return {
      orderId,
      orderStatus: 'COMPLETED',
      customId: row.id,
      captureId: `CAPTURE-${captureCalls}`,
      captureStatus: 'COMPLETED',
      currency: mismatchCapture ? 'USD' : row.currency,
      value: (row.amount_minor / 100).toFixed(2),
    };
  },
});

let uuidCounter = 1;
const commerce = createLostSizzlerCommerceService({
  database,
  gateway,
  commerceEnabled: true,
  randomUuidImpl: () => `00000000-0000-4000-8000-${String(uuidCounter++).padStart(12, '0')}`,
});

const offer = await commerce.offer();
assert.equal(offer.product.title, 'C64 Dungeon Carnage — Full Game');
assert.equal(offer.product.price_minor, 199);
assert.equal(offer.product.currency, 'GBP');
assert.equal(offer.product.permanent, true);
assert.equal(offer.product.includes_all_updates, true);
assert.match(offer.message, /all future game updates/i);

const before = await commerce.entitlement('owner-1');
assert.equal(before.owned, false);

const created = await commerce.createOrder('owner-1');
assert.equal(created.order_id, 'PAYPALORDER199');
assert.equal(createCalls, 1);

const captured = await commerce.captureOrder('owner-1', 'PAYPALORDER199');
assert.equal(captured.completed, true);
assert.equal(captured.entitlement.owned, true);
assert.equal(captured.entitlement.permanent, true);
assert.equal(captured.entitlement.includes_all_updates, true);
assert.equal(captureCalls, 1);

const replay = await commerce.captureOrder('owner-1', 'PAYPALORDER199');
assert.equal(replay.entitlement.owned, true);
assert.equal(captureCalls, 1, 'Completed capture replay must not call PayPal a second time.');

const alreadyOwned = await commerce.createOrder('owner-1');
assert.equal(alreadyOwned.already_owned, true);
assert.equal(createCalls, 1, 'Already-owned account must not create another PayPal order.');

nextOrderId = 'PAYPALMISMATCH1';
mismatchCapture = true;
const mismatchCreated = await commerce.createOrder('owner-2');
assert.equal(mismatchCreated.order_id, 'PAYPALMISMATCH1');
await assert.rejects(
  commerce.captureOrder('owner-2', 'PAYPALMISMATCH1'),
  (error) => error?.statusCode === 409 && error?.code === 'purchase_reconciliation_required'
);
assert.equal((await commerce.entitlement('owner-2')).owned, false, 'Provider mismatch must never grant entitlement.');
const mismatchRow = [...database.purchases.values()].find((row) => row.provider_order_id === 'PAYPALMISMATCH1');
assert.equal(mismatchRow.status, 'failed');
assert.equal(mismatchRow.failure_code, 'paypal_capture_mismatch');

const disabled = createLostSizzlerCommerceService({ database, commerceEnabled: false });
assert.equal((await disabled.offer()).commerce_available, false);
await assert.rejects(
  disabled.createOrder('owner-3'),
  (error) => error?.statusCode === 503 && error?.code === 'commerce_unavailable'
);

console.log('C64 Dungeon Carnage commerce entitlement service contract passed: server price is authoritative, verified capture grants one permanent entitlement, replay is idempotent, ownership suppresses repurchase, and provider mismatches fail closed.');
