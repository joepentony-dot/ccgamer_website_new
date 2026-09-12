import { createHash } from 'node:crypto';

const PRODUCT_SLUG = 'the-lost-sizzler-full-game';
const REVOCATION_EVENTS = new Map([
  ['PAYMENT.CAPTURE.REFUNDED', 'paypal_refunded'],
  ['PAYMENT.CAPTURE.REVERSED', 'paypal_reversed'],
]);

function requireText(value, code, max = 160) {
  const text = String(value || '').trim();
  if (!text || text.length > max) {
    const error = new Error(code);
    error.code = code;
    error.statusCode = 400;
    throw error;
  }
  return text;
}

function payloadHash(rawPayload) {
  const source = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload ?? {});
  return createHash('sha256').update(source).digest('hex');
}

export function createLostSizzlerCommerceReconciliation({ database } = {}) {
  if (!database?.query || !database?.transaction) {
    throw new Error('C64 Dungeon Carnage commerce reconciliation requires a database.');
  }

  return Object.freeze({
    async applyVerifiedPayPalEvent({ eventId, eventType, providerOrderId = null, providerCaptureId = null, rawPayload } = {}) {
      const id = requireText(eventId, 'invalid_paypal_event_id');
      const type = requireText(eventType, 'invalid_paypal_event_type');
      const orderId = providerOrderId ? requireText(providerOrderId, 'invalid_paypal_order_id', 128) : null;
      const captureId = providerCaptureId ? requireText(providerCaptureId, 'invalid_paypal_capture_id', 128) : null;
      const sha256 = payloadHash(rawPayload);

      return database.transaction(async (tx) => {
        const existing = await tx.query(
          `select event_id, processing_status, outcome
             from paypal_webhook_events
            where event_id = $1
            for update`,
          [id]
        );
        const prior = existing.rows?.[0] || null;
        if (prior?.processing_status === 'processed' || prior?.processing_status === 'ignored') {
          return Object.freeze({ replay: true, status: String(prior.processing_status), outcome: prior.outcome || null });
        }

        if (!prior) {
          await tx.query(
            `insert into paypal_webhook_events
              (event_id, event_type, provider_order_id, provider_capture_id, payload_sha256, processing_status)
             values ($1, $2, $3, $4, $5, 'received')`,
            [id, type, orderId, captureId, sha256]
          );
        }

        const reason = REVOCATION_EVENTS.get(type);
        if (!reason) {
          await tx.query(
            `update paypal_webhook_events
                set processing_status = 'ignored', processed_at = now(), outcome = $2
              where event_id = $1`,
            [id, 'event_not_relevant_to_entitlement']
          );
          return Object.freeze({ replay: false, status: 'ignored', outcome: 'event_not_relevant_to_entitlement' });
        }

        if (!captureId) {
          await tx.query(
            `update paypal_webhook_events
                set processing_status = 'failed', processed_at = now(), outcome = $2
              where event_id = $1`,
            [id, 'missing_capture_id']
          );
          const error = new Error('missing_capture_id');
          error.code = 'missing_capture_id';
          error.statusCode = 409;
          throw error;
        }

        const purchaseResult = await tx.query(
          `select id, user_id, product_slug, status
             from game_purchase_orders
            where provider_capture_id = $1
            for update`,
          [captureId]
        );
        const purchase = purchaseResult.rows?.[0] || null;
        if (!purchase || String(purchase.product_slug) !== PRODUCT_SLUG) {
          await tx.query(
            `update paypal_webhook_events
                set processing_status = 'failed', processed_at = now(), outcome = $2
              where event_id = $1`,
            [id, 'purchase_not_found']
          );
          const error = new Error('purchase_not_found');
          error.code = 'purchase_not_found';
          error.statusCode = 409;
          throw error;
        }

        const targetStatus = reason === 'paypal_refunded' ? 'refunded' : 'reversed';
        await tx.query(
          `update game_purchase_orders
              set status = $2, provider_status = $3, updated_at = now()
            where id = $1`,
          [purchase.id, targetStatus, type]
        );

        await tx.query(
          `update game_entitlements
              set status = 'revoked', revoked_at = coalesce(revoked_at, now()), revoked_reason = $3, updated_at = now()
            where user_id = $1
              and product_slug = $2
              and source_provider = 'paypal'
              and source_purchase_id = $4
              and status = 'active'`,
          [purchase.user_id, PRODUCT_SLUG, reason, purchase.id]
        );

        await tx.query(
          `update paypal_webhook_events
              set processing_status = 'processed', processed_at = now(), outcome = $2
            where event_id = $1`,
          [id, reason]
        );

        return Object.freeze({ replay: false, status: 'processed', outcome: reason, entitlement_revoked: true });
      });
    },
  });
}
