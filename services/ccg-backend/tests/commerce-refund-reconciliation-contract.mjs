import assert from 'node:assert/strict';
import { createLostSizzlerCommerceReconciliation } from '../src/lost-sizzler-commerce-reconciliation.mjs';

function makeDb() {
  const state = {
    events: new Map(),
    purchases: new Map([['CAP-1', { id: '11111111-1111-1111-1111-111111111111', user_id: 'user-1', product_slug: 'the-lost-sizzler-full-game', status: 'completed' }]]),
    entitlement: { user_id: 'user-1', product_slug: 'the-lost-sizzler-full-game', status: 'active', source_purchase_id: '11111111-1111-1111-1111-111111111111' },
  };

  async function query(sql, params = []) {
    const text = String(sql).replace(/\s+/g, ' ').trim();
    if (text.includes('from paypal_webhook_events') && text.includes('for update')) {
      const row = state.events.get(params[0]);
      return { rows: row ? [row] : [] };
    }
    if (text.startsWith('insert into paypal_webhook_events')) {
      state.events.set(params[0], { event_id: params[0], event_type: params[1], provider_order_id: params[2], provider_capture_id: params[3], payload_sha256: params[4], processing_status: 'received', outcome: null });
      return { rows: [] };
    }
    if (text.includes('from game_purchase_orders') && text.includes('provider_capture_id = $1')) {
      const row = state.purchases.get(params[0]);
      return { rows: row ? [row] : [] };
    }
    if (text.startsWith('update game_purchase_orders')) {
      for (const row of state.purchases.values()) {
        if (row.id === params[0]) row.status = params[1];
      }
      return { rows: [] };
    }
    if (text.startsWith('update game_entitlements')) {
      if (state.entitlement.user_id === params[0] && state.entitlement.source_purchase_id === params[3] && state.entitlement.status === 'active') {
        state.entitlement.status = 'revoked';
        state.entitlement.revoked_reason = params[2];
      }
      return { rows: [] };
    }
    if (text.startsWith('update paypal_webhook_events')) {
      const row = state.events.get(params[0]);
      if (row) {
        if (text.includes("processing_status = 'processed'")) row.processing_status = 'processed';
        else if (text.includes("processing_status = 'ignored'")) row.processing_status = 'ignored';
        else if (text.includes("processing_status = 'failed'")) row.processing_status = 'failed';
        row.outcome = params[1];
      }
      return { rows: [] };
    }
    throw new Error(`Unexpected SQL in reconciliation contract: ${text}`);
  }

  return {
    state,
    query,
    async transaction(fn) { return fn({ query }); },
  };
}

const db = makeDb();
const service = createLostSizzlerCommerceReconciliation({ database: db });
const raw = JSON.stringify({ id: 'WH-REFUND-1', event_type: 'PAYMENT.CAPTURE.REFUNDED' });

const first = await service.applyVerifiedPayPalEvent({
  eventId: 'WH-REFUND-1',
  eventType: 'PAYMENT.CAPTURE.REFUNDED',
  providerCaptureId: 'CAP-1',
  rawPayload: raw,
});
assert.equal(first.status, 'processed');
assert.equal(first.outcome, 'paypal_refunded');
assert.equal(db.state.entitlement.status, 'revoked');
assert.equal(db.state.entitlement.revoked_reason, 'paypal_refunded');
assert.equal(db.state.purchases.get('CAP-1').status, 'refunded');
assert.match(db.state.events.get('WH-REFUND-1').payload_sha256, /^[0-9a-f]{64}$/);

const replay = await service.applyVerifiedPayPalEvent({
  eventId: 'WH-REFUND-1',
  eventType: 'PAYMENT.CAPTURE.REFUNDED',
  providerCaptureId: 'CAP-1',
  rawPayload: raw,
});
assert.equal(replay.replay, true);
assert.equal(replay.status, 'processed');

const ignored = await service.applyVerifiedPayPalEvent({
  eventId: 'WH-OTHER-1',
  eventType: 'CHECKOUT.ORDER.APPROVED',
  providerCaptureId: 'CAP-1',
  rawPayload: '{}',
});
assert.equal(ignored.status, 'ignored');
assert.equal(db.state.entitlement.status, 'revoked');

const db2 = makeDb();
const service2 = createLostSizzlerCommerceReconciliation({ database: db2 });
const reversed = await service2.applyVerifiedPayPalEvent({
  eventId: 'WH-REV-1',
  eventType: 'PAYMENT.CAPTURE.REVERSED',
  providerCaptureId: 'CAP-1',
  rawPayload: '{}',
});
assert.equal(reversed.outcome, 'paypal_reversed');
assert.equal(db2.state.purchases.get('CAP-1').status, 'reversed');
assert.equal(db2.state.entitlement.status, 'revoked');

await assert.rejects(
  () => service2.applyVerifiedPayPalEvent({ eventId: 'WH-MISSING-1', eventType: 'PAYMENT.CAPTURE.REFUNDED', rawPayload: '{}' }),
  error => error?.code === 'missing_capture_id'
);

console.log('C64 Dungeon Carnage commerce refund/reversal reconciliation contract passed.');
