import assert from 'node:assert/strict';
import { createLostSizzlerPurchaseClient } from '../client/lost-sizzler-purchase.mjs';

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

const calls = [];
let accessToken = '';
const responses = [];
const fetchImpl = async (url, options = {}) => {
  calls.push({ url, options });
  const response = responses.shift();
  if (!response) throw new Error('Unexpected purchase-client request.');
  return response;
};

const client = createLostSizzlerPurchaseClient({
  baseUrl: 'https://api.cheekycommodoregamer.co.uk/',
  getAccessToken: () => accessToken,
  fetchImpl,
});
assert.equal(calls.length, 0, 'Constructing the purchase client must perform zero network requests.');

responses.push(jsonResponse({
  commerce_available: true,
  requires_account: true,
  product: {
    product_slug: 'the-lost-sizzler-full-game',
    currency: 'GBP',
    price_minor: 199,
    permanent: true,
    includes_all_updates: true,
  },
  paypal: { environment: 'sandbox', client_id: 'public-id' },
}));
const offer = await client.getOffer();
assert.equal(offer.product.price_minor, 199);
assert.equal(offer.product.currency, 'GBP');
assert.equal(offer.product.permanent, true);
assert.equal(offer.product.includes_all_updates, true);
assert.equal(calls[0].url, 'https://api.cheekycommodoregamer.co.uk/v1/lost-sizzler/commerce/offer');
assert.equal(calls[0].options.headers.authorization, undefined);

await assert.rejects(
  client.getEntitlement(),
  (error) => error?.statusCode === 401 && error?.code === 'authentication_required'
);
assert.equal(calls.length, 1, 'Missing authentication must refuse locally before making an entitlement request.');

accessToken = 'ccg-access-token';
responses.push(jsonResponse({ entitlement: {
  product_slug: 'the-lost-sizzler-full-game',
  owned: false,
  permanent: true,
  includes_all_updates: true,
  granted_at: null,
} }));
const entitlement = await client.getEntitlement();
assert.equal(entitlement.owned, false);
assert.equal(calls[1].options.headers.authorization, 'Bearer ccg-access-token');

responses.push(jsonResponse({ already_owned: false, order_id: 'PAYPALORDER123' }));
const created = await client.createOrder();
assert.equal(created.order_id, 'PAYPALORDER123');
assert.equal(calls[2].options.method, 'POST');
assert.equal(calls[2].options.headers.authorization, 'Bearer ccg-access-token');

responses.push(jsonResponse({ completed: true, provider_status: 'COMPLETED' }));
const captured = await client.captureOrder('PAYPALORDER123');
assert.equal(captured.completed, true);
assert.match(calls[3].url, /PAYPALORDER123\/capture$/);

await assert.rejects(
  client.captureOrder('../bad'),
  (error) => error?.statusCode === 400 && error?.code === 'invalid_paypal_order_id'
);
assert.equal(calls.length, 4, 'Invalid provider order IDs must be rejected before network access.');

responses.push(
  jsonResponse({ completed: true, provider_status: 'COMPLETED' }),
  jsonResponse({ entitlement: {
    product_slug: 'the-lost-sizzler-full-game',
    owned: true,
    permanent: true,
    includes_all_updates: true,
    granted_at: '2026-09-12T07:00:00Z',
  } })
);
const confirmed = await client.captureAndConfirmOwnership('PAYPALORDER456');
assert.equal(confirmed.capture.completed, true);
assert.equal(confirmed.entitlement.owned, true);
assert.equal(confirmed.entitlement.permanent, true);
assert.equal(confirmed.entitlement.includes_all_updates, true);
assert.match(calls[4].url, /PAYPALORDER456\/capture$/);
assert.match(calls[5].url, /commerce\/entitlement$/);

responses.push(
  jsonResponse({ completed: true, provider_status: 'COMPLETED' }),
  jsonResponse({ entitlement: {
    product_slug: 'the-lost-sizzler-full-game',
    owned: false,
    permanent: true,
    includes_all_updates: true,
    granted_at: null,
  } })
);
await assert.rejects(
  client.captureAndConfirmOwnership('PAYPALORDER789'),
  (error) => error?.statusCode === 409 && error?.code === 'entitlement_not_confirmed'
);
assert.equal(calls.length, 8, 'A provider capture response alone must never be treated as ownership.');

const offline = createLostSizzlerPurchaseClient({
  baseUrl: 'https://api.cheekycommodoregamer.co.uk',
  getAccessToken: () => 'token',
  fetchImpl: async () => { throw new Error('offline'); },
});
await assert.rejects(
  offline.getEntitlement(),
  (error) => error?.statusCode === 503 && error?.code === 'network_unavailable'
);

const rateLimited = createLostSizzlerPurchaseClient({
  baseUrl: 'https://api.cheekycommodoregamer.co.uk',
  getAccessToken: () => 'token',
  fetchImpl: async () => jsonResponse({ error: 'rate_limited' }, 429, { 'retry-after': '30' }),
});
await assert.rejects(
  rateLimited.createOrder(),
  (error) => error?.statusCode === 429 && error?.code === 'rate_limited' && error?.retryAfterSeconds === 30
);

assert.throws(
  () => createLostSizzlerPurchaseClient({
    baseUrl: 'http://example.com',
    getAccessToken: () => '',
    fetchImpl,
  }),
  /requires HTTPS/
);

console.log('C64 Dungeon Carnage purchase-client contract passed: public offer lookup is passive, account operations require authentication, provider order IDs fail closed, and capture must be followed by server entitlement confirmation before ownership is accepted.');
