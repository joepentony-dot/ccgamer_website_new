import assert from 'node:assert/strict';
import { createLostSizzlerCommerceHttp } from '../src/lost-sizzler-commerce-http.mjs';

const calls = [];
const auth = Object.freeze({
  async verifyBearer(value) {
    calls.push(['auth', value]);
    if (value !== 'Bearer valid-token') {
      const error = new Error('invalid_access_token');
      error.statusCode = 401;
      error.code = 'invalid_access_token';
      throw error;
    }
    return { userId: 'http-commerce-user' };
  },
});

const commerce = Object.freeze({
  async offer() {
    calls.push(['offer']);
    return { commerce_available: true, requires_account: true };
  },
  async entitlement(userId) {
    calls.push(['entitlement', userId]);
    return { owned: false, permanent: true, includes_all_updates: true };
  },
  async createOrder(userId) {
    calls.push(['create', userId]);
    return { already_owned: false, order_id: 'PAYPALHTTP123' };
  },
  async captureOrder(userId, orderId) {
    calls.push(['capture', userId, orderId]);
    return { completed: true, entitlement: { owned: true, permanent: true, includes_all_updates: true } };
  },
});

const http = createLostSizzlerCommerceHttp({ auth, commerce });
assert.equal(http.handles('GET', '/v1/lost-sizzler/commerce/offer'), true);
assert.equal(http.handles('GET', '/v1/lost-sizzler/commerce/entitlement'), true);
assert.equal(http.handles('POST', '/v1/lost-sizzler/commerce/orders'), true);
assert.equal(http.handles('POST', '/v1/lost-sizzler/commerce/orders/PAYPALHTTP123/capture'), true);
assert.equal(http.handles('POST', '/v1/lost-sizzler/commerce/orders/../capture'), false);

const publicOffer = await http.handle({ method: 'GET', headers: {} }, '/v1/lost-sizzler/commerce/offer');
assert.equal(publicOffer.statusCode, 200);
assert.equal(publicOffer.body.requires_account, true);
assert.deepEqual(calls, [['offer']], 'Public offer lookup must not authenticate or create an order.');

await assert.rejects(
  http.handle({ method: 'GET', headers: {} }, '/v1/lost-sizzler/commerce/entitlement'),
  (error) => error?.statusCode === 401
);
assert.equal(calls.some((entry) => entry[0] === 'entitlement'), false, 'Unauthenticated entitlement lookup must never reach the commerce service.');

const entitlement = await http.handle(
  { method: 'GET', headers: { authorization: 'Bearer valid-token' } },
  '/v1/lost-sizzler/commerce/entitlement'
);
assert.equal(entitlement.body.entitlement.owned, false);

const created = await http.handle(
  { method: 'POST', headers: { authorization: 'Bearer valid-token' } },
  '/v1/lost-sizzler/commerce/orders'
);
assert.equal(created.body.order_id, 'PAYPALHTTP123');

const captured = await http.handle(
  { method: 'POST', headers: { authorization: 'Bearer valid-token' } },
  '/v1/lost-sizzler/commerce/orders/PAYPALHTTP123/capture'
);
assert.equal(captured.body.entitlement.owned, true);
assert.deepEqual(calls.slice(-2), [
  ['auth', 'Bearer valid-token'],
  ['capture', 'http-commerce-user', 'PAYPALHTTP123'],
]);

console.log('Lost Sizzler commerce HTTP contract passed: offer metadata is public, but entitlement, order creation and capture are account-gated before the commerce service can act.');
