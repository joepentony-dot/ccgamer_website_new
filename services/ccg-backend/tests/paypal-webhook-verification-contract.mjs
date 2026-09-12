import assert from 'node:assert/strict';
import { createPayPalWebhookVerifier } from '../src/paypal-webhooks.mjs';

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return JSON.stringify(payload); },
  };
}

const calls = [];
const fetchImpl = async (url, options = {}) => {
  calls.push({ url, options });
  if (url.endsWith('/v1/oauth2/token')) return response(200, { access_token: 'sandbox-token', expires_in: 300 });
  if (url.endsWith('/v1/notifications/verify-webhook-signature')) return response(200, { verification_status: 'SUCCESS' });
  throw new Error(`Unexpected URL ${url}`);
};

const verifier = createPayPalWebhookVerifier({
  environment: 'sandbox',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  webhookId: 'WH-TEST-ID',
  fetchImpl,
  now: () => 1_000_000,
});

const headers = {
  'paypal-transmission-id': 'transmission-1',
  'paypal-transmission-time': '2026-09-12T05:00:00Z',
  'paypal-transmission-sig': 'signature-value',
  'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs/test.pem',
  'paypal-auth-algo': 'SHA256withRSA',
};
const event = {
  id: 'WH-EVENT-1',
  event_type: 'PAYMENT.CAPTURE.REFUNDED',
  resource: { id: 'CAPTURE-1' },
};

const verified = await verifier.verify({ headers, event });
assert.equal(verified.verified, true);
assert.equal(verified.event, event);
assert.equal(calls.length, 2);
assert.match(calls[0].url, /api-m\.sandbox\.paypal\.com\/v1\/oauth2\/token$/);
assert.match(calls[1].url, /api-m\.sandbox\.paypal\.com\/v1\/notifications\/verify-webhook-signature$/);
const verifyBody = JSON.parse(calls[1].options.body);
assert.equal(verifyBody.webhook_id, 'WH-TEST-ID');
assert.equal(verifyBody.transmission_id, headers['paypal-transmission-id']);
assert.equal(verifyBody.transmission_time, headers['paypal-transmission-time']);
assert.equal(verifyBody.transmission_sig, headers['paypal-transmission-sig']);
assert.equal(verifyBody.cert_url, headers['paypal-cert-url']);
assert.equal(verifyBody.auth_algo, headers['paypal-auth-algo']);
assert.deepEqual(verifyBody.webhook_event, event);
assert.equal(calls[1].options.headers.authorization, 'Bearer sandbox-token');

let missingHeader = null;
try {
  await verifier.verify({ headers: { ...headers, 'paypal-transmission-sig': '' }, event });
} catch (error) { missingHeader = error; }
assert.equal(missingHeader?.code, 'missing_paypal_transmission_sig');
assert.equal(missingHeader?.statusCode, 400);

let unsafeCert = null;
try {
  await verifier.verify({ headers: { ...headers, 'paypal-cert-url': 'file:///tmp/paypal.pem' }, event });
} catch (error) { unsafeCert = error; }
assert.equal(unsafeCert?.code, 'invalid_paypal_cert_url');

const invalidVerifier = createPayPalWebhookVerifier({
  environment: 'sandbox',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  webhookId: 'WH-TEST-ID',
  fetchImpl: async (url) => {
    if (url.endsWith('/v1/oauth2/token')) return response(200, { access_token: 'token', expires_in: 300 });
    return response(200, { verification_status: 'FAILURE' });
  },
});
let invalidSignature = null;
try { await invalidVerifier.verify({ headers, event }); } catch (error) { invalidSignature = error; }
assert.equal(invalidSignature?.code, 'paypal_webhook_signature_invalid');
assert.equal(invalidSignature?.statusCode, 401);

const outageVerifier = createPayPalWebhookVerifier({
  environment: 'live',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  webhookId: 'WH-LIVE-ID',
  fetchImpl: async () => { throw new Error('network down'); },
});
let outage = null;
try { await outageVerifier.verify({ headers, event }); } catch (error) { outage = error; }
assert.equal(outage?.code, 'paypal_unavailable');
assert.equal(outage?.statusCode, 503);

console.log('C64 Dungeon Carnage PayPal webhook verification contract passed.');
