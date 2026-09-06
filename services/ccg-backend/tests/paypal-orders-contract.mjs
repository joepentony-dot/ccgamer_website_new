import assert from 'node:assert/strict';
import { createPayPalOrdersGateway } from '../src/paypal-orders.mjs';

const calls = [];
const responses = [
  new Response(JSON.stringify({ access_token: 'paypal-access-token', expires_in: 3600 }), { status: 200 }),
  new Response(JSON.stringify({ id: 'PAYPALORDER123', status: 'CREATED' }), { status: 201 }),
  new Response(JSON.stringify({
    id: 'PAYPALORDER123',
    status: 'COMPLETED',
    purchase_units: [{
      custom_id: '11111111-1111-4111-8111-111111111111',
      amount: { currency_code: 'GBP', value: '1.99' },
      payments: {
        captures: [{
          id: 'CAPTURE123',
          status: 'COMPLETED',
          amount: { currency_code: 'GBP', value: '1.99' },
        }],
      },
    }],
  }), { status: 201 }),
];

const fetchImpl = async (url, options = {}) => {
  calls.push({ url, options });
  const response = responses.shift();
  if (!response) throw new Error('Unexpected PayPal request.');
  return response;
};

const gateway = createPayPalOrdersGateway({
  environment: 'sandbox',
  clientId: 'merchant-client-id',
  clientSecret: 'merchant-client-secret',
  fetchImpl,
  now: () => 1_000_000,
});

assert.deepEqual(gateway.publicConfig(), {
  environment: 'sandbox',
  clientId: 'merchant-client-id',
});

const created = await gateway.createOrder({
  requestId: 'create:11111111-1111-4111-8111-111111111111',
  localOrderId: '11111111-1111-4111-8111-111111111111',
  amountMinor: 199,
  currency: 'GBP',
  description: 'The Lost Sizzler permanent unlock',
});
assert.deepEqual(created, { orderId: 'PAYPALORDER123', status: 'CREATED' });

assert.equal(calls[0].url, 'https://api-m.sandbox.paypal.com/v1/oauth2/token');
assert.equal(calls[0].options.method, 'POST');
assert.match(calls[0].options.headers.authorization, /^Basic /);
assert.equal(calls[0].options.body, 'grant_type=client_credentials');

assert.equal(calls[1].url, 'https://api-m.sandbox.paypal.com/v2/checkout/orders');
assert.equal(calls[1].options.headers.authorization, 'Bearer paypal-access-token');
assert.equal(calls[1].options.headers['paypal-request-id'], 'create:11111111-1111-4111-8111-111111111111');
const createBody = JSON.parse(calls[1].options.body);
assert.equal(createBody.intent, 'CAPTURE');
assert.equal(createBody.purchase_units.length, 1);
assert.equal(createBody.purchase_units[0].custom_id, '11111111-1111-4111-8111-111111111111');
assert.equal(createBody.purchase_units[0].amount.currency_code, 'GBP');
assert.equal(createBody.purchase_units[0].amount.value, '1.99', 'The provider amount must come from the server-authoritative minor-unit price.');

const captured = await gateway.captureOrder({
  orderId: 'PAYPALORDER123',
  requestId: 'capture:11111111-1111-4111-8111-111111111111',
});
assert.deepEqual(captured, {
  orderId: 'PAYPALORDER123',
  orderStatus: 'COMPLETED',
  customId: '11111111-1111-4111-8111-111111111111',
  captureId: 'CAPTURE123',
  captureStatus: 'COMPLETED',
  currency: 'GBP',
  value: '1.99',
});
assert.equal(calls.length, 3, 'OAuth access token must be reused rather than fetched for every provider request.');
assert.equal(calls[2].url, 'https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPALORDER123/capture');
assert.equal(calls[2].options.headers['paypal-request-id'], 'capture:11111111-1111-4111-8111-111111111111');

assert.throws(
  () => createPayPalOrdersGateway({ environment: 'production', clientId: 'x', clientSecret: 'y', fetchImpl }),
  /sandbox or live/
);
await assert.rejects(
  gateway.captureOrder({ orderId: '../bad', requestId: 'capture:bad' }),
  (error) => error?.code === 'invalid_paypal_order_id'
);

const unavailable = createPayPalOrdersGateway({
  environment: 'live',
  clientId: 'id',
  clientSecret: 'secret',
  fetchImpl: async () => { throw new Error('network down'); },
});
await assert.rejects(
  unavailable.createOrder({
    requestId: 'create:22222222-2222-4222-8222-222222222222',
    localOrderId: '22222222-2222-4222-8222-222222222222',
    amountMinor: 199,
    currency: 'GBP',
    description: 'The Lost Sizzler permanent unlock',
  }),
  (error) => error?.statusCode === 503 && error?.code === 'paypal_unavailable'
);

console.log('PayPal Orders contract passed: credentials stay server-side, Orders v2 receives the fixed GBP amount and local purchase id, capture is normalized and OAuth tokens are reused.');
