import assert from 'node:assert/strict';
import { createLostSizzlerCommerceRouter } from '../src/lost-sizzler-commerce-router.mjs';

async function main() {
  const calls = [];
  const commerceHttp = {
    handles(method, pathname) {
      return method === 'GET' && pathname === '/v1/lost-sizzler/commerce/entitlement';
    },
    async handle(request, pathname) {
      calls.push(['commerce', request.method, pathname]);
      return { statusCode: 200, body: { entitlement: { active: true } }, headers: {} };
    },
  };
  const paypalWebhookHttp = {
    handles(method, pathname) {
      return method === 'POST' && pathname === '/v1/lost-sizzler/commerce/paypal/webhook';
    },
    async handle(request, pathname) {
      calls.push(['webhook', request.method, pathname, request.rawBody]);
      return { statusCode: 200, body: { received: true }, headers: {} };
    },
  };

  const router = createLostSizzlerCommerceRouter({ commerceHttp, paypalWebhookHttp });

  const entitlement = await router.handle({
    method: 'get',
    url: 'https://api.example.test/v1/lost-sizzler/commerce/entitlement?refresh=1',
    headers: { authorization: 'Bearer test' },
  });
  assert.equal(entitlement.statusCode, 200);
  assert.deepEqual(calls[0], ['commerce', 'GET', '/v1/lost-sizzler/commerce/entitlement']);

  const webhook = await router.handle({
    method: 'post',
    pathname: '/v1/lost-sizzler/commerce/paypal/webhook',
    headers: { 'paypal-transmission-id': 'tx-1' },
    body: { id: 'WH-1' },
    rawBody: '{"id":"WH-1"}',
  });
  assert.equal(webhook.statusCode, 200);
  assert.deepEqual(calls[1], [
    'webhook',
    'POST',
    '/v1/lost-sizzler/commerce/paypal/webhook',
    '{"id":"WH-1"}',
  ]);

  let commerceReached = false;
  const overlapRouter = createLostSizzlerCommerceRouter({
    commerceHttp: {
      handles() { return true; },
      async handle() {
        commerceReached = true;
        throw new Error('commerce boundary must not own PayPal webhook traffic');
      },
    },
    paypalWebhookHttp: {
      handles(method, pathname) {
        return method === 'POST' && pathname === '/v1/lost-sizzler/commerce/paypal/webhook';
      },
      async handle() {
        return { statusCode: 200, body: { received: true }, headers: {} };
      },
    },
  });
  await overlapRouter.handle({ method: 'POST', pathname: '/v1/lost-sizzler/commerce/paypal/webhook' });
  assert.equal(commerceReached, false, 'PayPal webhook must stay owned by its verification boundary');

  await assert.rejects(
    () => router.handle({ method: 'GET', pathname: '/v1/lost-sizzler/commerce/unknown' }),
    (error) => error?.statusCode === 404 && error?.code === 'not_found'
  );

  await assert.rejects(
    () => router.handle({ method: 'GET', url: 'http://[invalid' }),
    (error) => error?.statusCode === 400 && error?.code === 'invalid_request_url'
  );

  assert.throws(
    () => createLostSizzlerCommerceRouter({ commerceHttp: {}, paypalWebhookHttp }),
    /authenticated commerce HTTP boundary/
  );
  assert.throws(
    () => createLostSizzlerCommerceRouter({ commerceHttp, paypalWebhookHttp: {} }),
    /verified PayPal webhook HTTP boundary/
  );

  console.log('C64 Dungeon Carnage commerce router composition contract passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
