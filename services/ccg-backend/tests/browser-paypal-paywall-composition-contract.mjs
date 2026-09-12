import assert from 'node:assert/strict';
import test from 'node:test';
import { mountLostSizzlerPayPalPaywall } from '../client/lost-sizzler-paypal-paywall-composition.mjs';

function baseConfig(overrides = {}) {
  return {
    enabled: true,
    baseUrl: 'https://commerce.example.test',
    getAccessToken() { return 'token'; },
    onDownloadGrant() {},
    checkoutEnabled: false,
    ...overrides,
  };
}

test('disabled composition is inert before document, fetch, adapter, or paywall access', () => {
  let adapterCalls = 0;
  let paywallCalls = 0;
  const result = mountLostSizzlerPayPalPaywall({
    config: { enabled: false },
    get documentRef() { throw new Error('disabled composition touched document'); },
    get fetchImpl() { throw new Error('disabled composition touched fetch'); },
    checkoutAdapterFactory() { adapterCalls += 1; },
    paywallEntryFactory() { paywallCalls += 1; },
  });
  assert.deepEqual(result, { enabled: false, mounted: false, reason: 'disabled' });
  assert.equal(adapterCalls, 0);
  assert.equal(paywallCalls, 0);
});

test('checkout-disabled paywall bypasses PayPal composition entirely', () => {
  let adapterCalls = 0;
  let received = null;
  const expected = Object.freeze({ enabled: true, mounted: true, destroy() {} });
  const config = baseConfig();
  const result = mountLostSizzlerPayPalPaywall({
    config,
    documentRef: {},
    fetchImpl: () => {},
    checkoutAdapterFactory() { adapterCalls += 1; },
    paywallEntryFactory(options) { received = options; return expected; },
  });
  assert.equal(result, expected);
  assert.equal(adapterCalls, 0);
  assert.equal(received.config, config);
  assert.equal(received.config.checkoutEnabled, false);
});

test('checkout-enabled composition injects one dormant PayPal callback without starting checkout', async () => {
  const events = [];
  const paypalMount = { id: 'stable-provider-mount' };
  const documentRef = {};
  let composedConfig = null;
  const adapter = {
    source: 'https://www.paypal.com/sdk/js?client-id=public-client-id',
    async onCheckoutRequested(bridge) { events.push(['checkout', bridge]); return 'rendered'; },
    async destroy() { events.push(['adapter-destroy']); },
  };
  const paywall = {
    enabled: true,
    mounted: true,
    checkoutEnabled: true,
    destroy() { events.push(['paywall-destroy']); },
  };
  const config = baseConfig({
    checkoutEnabled: true,
    paypalClientId: 'public-client-id',
  });

  const result = mountLostSizzlerPayPalPaywall({
    config,
    documentRef,
    fetchImpl: () => {},
    paypalMount,
    checkoutAdapterFactory(options) {
      events.push(['adapter-created', options]);
      return adapter;
    },
    paywallEntryFactory(options) {
      events.push(['paywall-mounted']);
      composedConfig = options.config;
      return paywall;
    },
  });

  assert.equal(result.provider, 'paypal');
  assert.equal(events.length, 2, 'composition may construct boundaries but must not start checkout');
  assert.equal(events[0][0], 'adapter-created');
  assert.equal(events[0][1].document, documentRef);
  assert.equal(events[0][1].clientId, 'public-client-id');
  assert.equal(events[0][1].currency, 'GBP');
  assert.equal(events[0][1].intent, 'capture');
  assert.equal(events[0][1].namespace, 'paypal');
  assert.equal(events[0][1].mount, paypalMount);
  assert.equal(events[1][0], 'paywall-mounted');
  assert.equal(composedConfig.enabled, true);
  assert.equal(composedConfig.checkoutEnabled, true);
  assert.equal(composedConfig.onCheckoutRequested, adapter.onCheckoutRequested);
  assert.equal(config.onCheckoutRequested, undefined, 'source config must not be mutated');

  const bridge = Object.freeze({ createOrder() {}, approve() {}, cancel() {} });
  assert.equal(await composedConfig.onCheckoutRequested(bridge), 'rendered');
  assert.deepEqual(events[2], ['checkout', bridge]);

  await result.destroy();
  assert.deepEqual(events.slice(-2), [['paywall-destroy'], ['adapter-destroy']]);
  await result.destroy();
  assert.equal(events.filter(([name]) => name === 'adapter-destroy').length, 1);
});

test('checkout-enabled composition fails closed without an explicit provider mount', () => {
  assert.throws(() => mountLostSizzlerPayPalPaywall({
    config: baseConfig({ checkoutEnabled: true, paypalClientId: 'public-client-id' }),
    documentRef: {},
    fetchImpl: () => {},
  }), /explicit provider mount/i);
});

test('composition refuses a competing provider callback when PayPal checkout is selected', () => {
  assert.throws(() => mountLostSizzlerPayPalPaywall({
    config: baseConfig({
      checkoutEnabled: true,
      paypalClientId: 'public-client-id',
      onCheckoutRequested() {},
    }),
    documentRef: {},
    fetchImpl: () => {},
    paypalMount: {},
  }), /competing checkout renderer/i);
});
