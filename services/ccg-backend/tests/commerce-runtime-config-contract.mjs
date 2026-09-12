import assert from 'node:assert/strict';
import { createLostSizzlerCommerceRuntimeConfig } from '../src/lost-sizzler-commerce-runtime-config.mjs';

{
  const config = createLostSizzlerCommerceRuntimeConfig({});
  assert.deepEqual(config, { commerceEnabled: false });
}

{
  const config = createLostSizzlerCommerceRuntimeConfig({
    CCG_COMMERCE_ENABLED: 'false',
    CCG_COMMERCE_PAYPAL_CLIENT_SECRET: 'must-not-be-read-while-disabled',
  });
  assert.deepEqual(config, { commerceEnabled: false });
}

{
  const config = createLostSizzlerCommerceRuntimeConfig({
    CCG_COMMERCE_ENABLED: 'true',
    CCG_COMMERCE_PAYPAL_ENVIRONMENT: 'sandbox',
    CCG_COMMERCE_PAYPAL_CLIENT_ID: 'sandbox-client-id',
    CCG_COMMERCE_PAYPAL_CLIENT_SECRET: 'sandbox-secret',
    CCG_COMMERCE_PAYPAL_WEBHOOK_ID: 'sandbox-webhook-id',
  });
  assert.deepEqual(config, {
    commerceEnabled: true,
    paypalEnvironment: 'sandbox',
    paypalClientId: 'sandbox-client-id',
    paypalClientSecret: 'sandbox-secret',
    paypalWebhookId: 'sandbox-webhook-id',
  });
}

{
  assert.throws(
    () => createLostSizzlerCommerceRuntimeConfig({ CCG_COMMERCE_ENABLED: 'maybe' }),
    /must be a boolean value/
  );
}

{
  assert.throws(
    () => createLostSizzlerCommerceRuntimeConfig({
      CCG_COMMERCE_ENABLED: 'true',
      CCG_COMMERCE_PAYPAL_ENVIRONMENT: 'sandbox',
    }),
    /CCG_COMMERCE_PAYPAL_CLIENT_ID/
  );
}

{
  assert.throws(
    () => createLostSizzlerCommerceRuntimeConfig({
      CCG_COMMERCE_ENABLED: 'true',
      CCG_COMMERCE_PAYPAL_ENVIRONMENT: 'live',
      CCG_COMMERCE_PAYPAL_CLIENT_ID: 'live-client-id',
      CCG_COMMERCE_PAYPAL_CLIENT_SECRET: 'live-secret',
      CCG_COMMERCE_PAYPAL_WEBHOOK_ID: 'live-webhook-id',
    }),
    /CCG_COMMERCE_LIVE_ACKNOWLEDGED=true/
  );
}

{
  const config = createLostSizzlerCommerceRuntimeConfig({
    CCG_COMMERCE_ENABLED: 'true',
    CCG_COMMERCE_LIVE_ACKNOWLEDGED: 'true',
    CCG_COMMERCE_PAYPAL_ENVIRONMENT: 'live',
    CCG_COMMERCE_PAYPAL_CLIENT_ID: 'live-client-id',
    CCG_COMMERCE_PAYPAL_CLIENT_SECRET: 'live-secret',
    CCG_COMMERCE_PAYPAL_WEBHOOK_ID: 'live-webhook-id',
  });
  assert.equal(config.commerceEnabled, true);
  assert.equal(config.paypalEnvironment, 'live');
}

console.log('C64 Dungeon Carnage commerce runtime config contract passed.');
