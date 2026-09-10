import assert from 'node:assert/strict';
import { createDatabase } from '../src/db.mjs';
import { createLostSizzlerCommerceService } from '../src/lost-sizzler-commerce.mjs';

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required for the commerce database contract.');

const database = createDatabase(databaseUrl);
const userId = 'commerce-contract-user';
const mismatchUserId = 'commerce-mismatch-user';
let createCalls = 0;
let captureCalls = 0;
let nextOrderId = 'PAYPALORDER199';
let mismatchMode = false;

const gateway = Object.freeze({
  publicConfig() {
    return Object.freeze({ environment: 'sandbox', clientId: 'public-sandbox-client-id' });
  },
  async createOrder({ localOrderId, amountMinor, currency }) {
    createCalls += 1;
    assert.match(localOrderId, /^[0-9a-f-]{36}$/i);
    assert.equal(amountMinor, 199);
    assert.equal(currency, 'GBP');
    return Object.freeze({ orderId: nextOrderId, status: 'CREATED' });
  },
  async captureOrder({ orderId }) {
    captureCalls += 1;
    const result = await database.query(
      `select id, amount_minor, currency from game_purchase_orders where provider_order_id = $1`,
      [orderId]
    );
    const row = result.rows[0];
    return Object.freeze({
      orderId,
      orderStatus: 'COMPLETED',
      customId: String(row.id),
      captureId: `CAPTURE${captureCalls}`,
      captureStatus: 'COMPLETED',
      currency: mismatchMode ? 'USD' : String(row.currency),
      value: mismatchMode ? '1.99' : (Number(row.amount_minor) / 100).toFixed(2),
    });
  },
});

let uuidCounter = 1;
const randomUuidImpl = () => `00000000-0000-4000-8000-${String(uuidCounter++).padStart(12, '0')}`;
const commerce = createLostSizzlerCommerceService({
  database,
  gateway,
  commerceEnabled: true,
  randomUuidImpl,
});

try {
  await database.query(
    `insert into ccg_users (user_id) values ($1), ($2) on conflict (user_id) do nothing`,
    [userId, mismatchUserId]
  );
  await database.query(`delete from game_entitlements where user_id in ($1, $2)`, [userId, mismatchUserId]);
  await database.query(`delete from game_purchase_orders where user_id in ($1, $2)`, [userId, mismatchUserId]);

  const offer = await commerce.offer();
  assert.equal(offer.commerce_available, true);
  assert.equal(offer.requires_account, true);
  assert.equal(offer.product.product_slug, 'the-lost-sizzler-full-game');
  assert.equal(offer.product.currency, 'GBP');
  assert.equal(offer.product.price_minor, 199);
  assert.equal(offer.product.permanent, true);
  assert.equal(offer.product.includes_all_updates, true);
  assert.equal(offer.paypal.client_id, 'public-sandbox-client-id');
  assert.match(offer.message, /permanently/i);
  assert.match(offer.message, /all future game updates/i);

  const before = await commerce.entitlement(userId);
  assert.deepEqual(before, {
    product_slug: 'the-lost-sizzler-full-game',
    owned: false,
    permanent: true,
    includes_all_updates: true,
    granted_at: null,
  });

  const created = await commerce.createOrder(userId);
  assert.equal(created.already_owned, false);
  assert.equal(created.order_id, 'PAYPALORDER199');
  assert.equal(created.product.price_minor, 199);
  assert.equal(createCalls, 1);

  const purchaseRow = await database.query(
    `select user_id, amount_minor, currency, status, provider_order_id
       from game_purchase_orders
      where provider_order_id = 'PAYPALORDER199'`
  );
  assert.deepEqual(purchaseRow.rows[0], {
    user_id: userId,
    amount_minor: 199,
    currency: 'GBP',
    status: 'created',
    provider_order_id: 'PAYPALORDER199',
  });

  const captured = await commerce.captureOrder(userId, 'PAYPALORDER199');
  assert.equal(captured.completed, true);
  assert.equal(captured.entitlement.owned, true);
  assert.equal(captured.entitlement.permanent, true);
  assert.equal(captured.entitlement.includes_all_updates, true);
  assert.equal(captureCalls, 1);

  const entitlementRow = await database.query(
    `select e.status, e.entitlement_kind, e.source_provider, e.source_purchase_id,
            p.includes_all_updates
       from game_entitlements e
       join game_products p on p.product_slug = e.product_slug
      where e.user_id = $1 and e.product_slug = 'the-lost-sizzler-full-game'`,
    [userId]
  );
  assert.equal(entitlementRow.rows[0].status, 'active');
  assert.equal(entitlementRow.rows[0].entitlement_kind, 'permanent');
  assert.equal(entitlementRow.rows[0].source_provider, 'paypal');
  assert.equal(entitlementRow.rows[0].includes_all_updates, true);
  assert.match(String(entitlementRow.rows[0].source_purchase_id), /^[0-9a-f-]{36}$/i);

  const repeatedCapture = await commerce.captureOrder(userId, 'PAYPALORDER199');
  assert.equal(repeatedCapture.entitlement.owned, true);
  assert.equal(captureCalls, 1, 'Completed purchase replay must not capture PayPal twice.');

  const repeatCreate = await commerce.createOrder(userId);
  assert.equal(repeatCreate.already_owned, true);
  assert.equal(createCalls, 1, 'An already-owned account must not create another PayPal order.');

  nextOrderId = 'PAYPALMISMATCH1';
  mismatchMode = true;
  const mismatchCreated = await commerce.createOrder(mismatchUserId);
  assert.equal(mismatchCreated.order_id, 'PAYPALMISMATCH1');
  await assert.rejects(
    commerce.captureOrder(mismatchUserId, 'PAYPALMISMATCH1'),
    (error) => error?.statusCode === 409 && error?.code === 'purchase_reconciliation_required'
  );
  const mismatchEntitlement = await commerce.entitlement(mismatchUserId);
  assert.equal(mismatchEntitlement.owned, false, 'Mismatched provider amount/currency must never grant an entitlement.');
  const mismatchPurchase = await database.query(
    `select status, failure_code from game_purchase_orders where provider_order_id = 'PAYPALMISMATCH1'`
  );
  assert.equal(mismatchPurchase.rows[0].status, 'failed');
  assert.equal(mismatchPurchase.rows[0].failure_code, 'paypal_capture_mismatch');

  const disabledCommerce = createLostSizzlerCommerceService({ database, commerceEnabled: false });
  const disabledOffer = await disabledCommerce.offer();
  assert.equal(disabledOffer.commerce_available, false);
  assert.equal(disabledOffer.paypal, null);
  await assert.rejects(
    disabledCommerce.createOrder(mismatchUserId),
    (error) => error?.statusCode === 503 && error?.code === 'commerce_unavailable'
  );

  console.log('Lost Sizzler commerce PostgreSQL contract passed: £1.99 is server-authoritative, completed PayPal capture grants one permanent account entitlement including future updates, replay is idempotent and mismatches fail closed.');
} finally {
  await database.query(`delete from game_entitlements where user_id in ($1, $2)`, [userId, mismatchUserId]);
  await database.query(`delete from game_purchase_orders where user_id in ($1, $2)`, [userId, mismatchUserId]);
  await database.query(`delete from ccg_users where user_id in ($1, $2)`, [userId, mismatchUserId]);
  await database.close();
}
