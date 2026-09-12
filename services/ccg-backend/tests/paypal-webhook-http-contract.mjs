import assert from 'node:assert/strict';
import { createLostSizzlerPayPalWebhookHttp } from '../src/lost-sizzler-paypal-webhook-http.mjs';

function sampleEvent(overrides = {}) {
  return {
    id: 'WH-TEST-1',
    event_type: 'PAYMENT.CAPTURE.REFUNDED',
    resource: {
      id: 'CAPTURE-123',
      supplementary_data: {
        related_ids: {
          order_id: 'ORDER-456',
        },
      },
    },
    ...overrides,
  };
}

async function main() {
  const calls = [];
  const event = sampleEvent();
  const verifier = {
    async verify(input) {
      calls.push(['verify', input]);
      return { verified: true, event: input.event };
    },
  };
  const reconciliation = {
    async applyVerifiedPayPalEvent(input) {
      calls.push(['reconcile', input]);
      return { status: 'processed', replay: false, outcome: 'paypal_refunded' };
    },
  };
  const boundary = createLostSizzlerPayPalWebhookHttp({ verifier, reconciliation });

  assert.equal(boundary.handles('POST', '/v1/lost-sizzler/commerce/paypal/webhook'), true);
  assert.equal(boundary.handles('GET', '/v1/lost-sizzler/commerce/paypal/webhook'), false);

  const response = await boundary.handle({
    method: 'POST',
    headers: { 'paypal-transmission-id': 'tx-1' },
    body: event,
    rawBody: '{"raw":true}',
  }, '/v1/lost-sizzler/commerce/paypal/webhook');

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    received: true,
    status: 'processed',
    replay: false,
    outcome: 'paypal_refunded',
  });
  assert.equal(calls[0][0], 'verify');
  assert.equal(calls[0][1].event, event);
  assert.equal(calls[1][0], 'reconcile');
  assert.equal(calls[1][1].eventId, 'WH-TEST-1');
  assert.equal(calls[1][1].eventType, 'PAYMENT.CAPTURE.REFUNDED');
  assert.equal(calls[1][1].providerCaptureId, 'CAPTURE-123');
  assert.equal(calls[1][1].providerOrderId, 'ORDER-456');
  assert.equal(calls[1][1].rawPayload, '{"raw":true}');

  let reconcileReached = false;
  const rejectingBoundary = createLostSizzlerPayPalWebhookHttp({
    verifier: {
      async verify() {
        const error = new Error('paypal_webhook_signature_invalid');
        error.code = 'paypal_webhook_signature_invalid';
        error.statusCode = 401;
        throw error;
      },
    },
    reconciliation: {
      async applyVerifiedPayPalEvent() {
        reconcileReached = true;
      },
    },
  });

  await assert.rejects(
    () => rejectingBoundary.handle({ method: 'POST', headers: {}, body: event }, '/v1/lost-sizzler/commerce/paypal/webhook'),
    (error) => error?.code === 'paypal_webhook_signature_invalid' && error?.statusCode === 401
  );
  assert.equal(reconcileReached, false, 'unverified webhook must never reach reconciliation');

  const forgedVerifierBoundary = createLostSizzlerPayPalWebhookHttp({
    verifier: {
      async verify() {
        return { verified: false, event };
      },
    },
    reconciliation,
  });
  await assert.rejects(
    () => forgedVerifierBoundary.handle({ method: 'POST', headers: {}, body: event }, '/v1/lost-sizzler/commerce/paypal/webhook'),
    (error) => error?.code === 'paypal_webhook_not_verified' && error?.statusCode === 401
  );

  const replacementEventBoundary = createLostSizzlerPayPalWebhookHttp({
    verifier: {
      async verify() {
        return { verified: true, event: sampleEvent({ id: 'WH-OTHER' }) };
      },
    },
    reconciliation,
  });
  await assert.rejects(
    () => replacementEventBoundary.handle({ method: 'POST', headers: {}, body: event }, '/v1/lost-sizzler/commerce/paypal/webhook'),
    (error) => error?.code === 'paypal_webhook_not_verified'
  );

  await assert.rejects(
    () => boundary.handle({ method: 'POST', headers: {}, body: null }, '/v1/lost-sizzler/commerce/paypal/webhook'),
    (error) => error?.code === 'invalid_paypal_webhook_body' && error?.statusCode === 400
  );

  await assert.rejects(
    () => boundary.handle({ method: 'GET', headers: {}, body: event }, '/v1/lost-sizzler/commerce/paypal/webhook'),
    (error) => error?.code === 'not_found' && error?.statusCode === 404
  );

  const relatedCaptureEvent = sampleEvent({
    event_type: 'PAYMENT.CAPTURE.REVERSED',
    resource: {
      id: 'RESOURCE-IGNORED',
      supplementary_data: {
        related_ids: {
          order_id: 'ORDER-999',
          capture_id: 'CAPTURE-RELATED',
        },
      },
    },
  });
  let relatedInput = null;
  const relatedBoundary = createLostSizzlerPayPalWebhookHttp({
    verifier: { async verify({ event: verifiedEvent }) { return { verified: true, event: verifiedEvent }; } },
    reconciliation: {
      async applyVerifiedPayPalEvent(input) {
        relatedInput = input;
        return { status: 'processed', replay: false, outcome: 'paypal_reversed' };
      },
    },
  });
  await relatedBoundary.handle({ method: 'POST', headers: {}, body: relatedCaptureEvent }, '/v1/lost-sizzler/commerce/paypal/webhook');
  assert.equal(relatedInput.providerCaptureId, 'CAPTURE-RELATED');
  assert.equal(relatedInput.providerOrderId, 'ORDER-999');

  console.log('C64 Dungeon Carnage PayPal webhook HTTP contract passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
