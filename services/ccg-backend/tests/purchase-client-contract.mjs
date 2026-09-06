import assert from 'node:assert/strict';
import { createLostSizzlerPurchaseClient } from '../client/lost-sizzler-purchase.mjs';

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

responses.push(new Response(JSON.stringify({
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
}), { status: 200, headers: { 'content-type': 'application/json' } }));
const offer = await client.getOffer();
assert.equal(offer.product.price_minor, 199);
assert.equal(calls[0].url, 'https://api.cheekycommodoregamer.co.uk/v1/lost-sizzler/commerce/offer');
assert.equal(calls[0].options.headers.authorization, undefined);

await assert.rejects(
  client.getEntitlement(),
  (error) => error?.statusCode === 401 && error?.code === 'authentication_required'
);
assert.equal(calls.length, 1, 'Missing authentication must refuse locally before making an entitlement request.');

accessToken = 'ccg-access-token';
responses.push(new Response(JSON.stringify({ entitlement: {
  product_slug: 'the-lost-sizzler-full-game',
  owned: false,
  permanent: true,
  includes_all_updates: true,
  granted_at: null,
} }), { status: 200, headers: { 'content-type': 'application/json' } }));
const entitlement = await client.getEntitlement();
assert.equal(entitlement.owned, false);
assert.equal(calls[1].options.headers.authorization, 'Bearer ccg-access-token');

responses.push(new Response(JSON.stringify({
  already_owned: false,
  order_id: 'PAYPALORDER123',
}), { status: 200, headers: { 'content-type': 'application/json' } }));
const created = await client.createOrder();
assert.equal(created.order_id, 'PAYPALORDER123');
assert.equal(calls[2].options.method, 'POST');

responses.push(new Response(JSON.stringify({
  completed: true,
  entitlement: {
    owned: true,
    permanent: true,
    includes_all_updates: true,
  },
}), { status: 200, headers: { 'content-type': 'application/json' } }));
const captured = await client.captureOrder('PAYPALORDER123');
assert.equal(captured.entitlement.owned, true);
assert.equal(captured.entitlement.includes_all_updates, true);
assert.match(calls[3].url, /PAYPALORDER123\/capture$/);

await assert.rejects(
  client.captureOrder('../bad'),
  (error) => error?.statusCode === 400 && error?.code === 'invalid_paypal_order_id'
);
assert.equal(calls.length, 4, 'Invalid provider order IDs must be rejected before network access.');

const offline = createLostSizzlerPurchaseClient({
  baseUrl: 'https://api.cheekycommodoregamer.co.uk',
  getAccessToken: () => 'token',
  fetchImpl: async () => { throw new Error('offline'); },
});
await assert.rejects(
  offline.getEntitlement(),
  (error) => error?.statusCode === 503 && error?.code === 'network_unavailable'
);

assert.throws(
  () => createLostSizzlerPurchaseClient({
    baseUrl: 'http://example.com',
    getAccessToken: () => '',
    fetchImpl,
  }),
  /requires HTTPS/
);

console.log('Lost Sizzler purchase-client contract passed: it is passive, public offer lookup is separate from authenticated entitlement/order calls, invalid order IDs fail locally and network failure cannot fabricate ownership.');
