import { createLostSizzlerPayPalCheckoutAdapter } from './lost-sizzler-paypal-checkout-adapter.mjs';
import { mountLostSizzlerPaywallEntry } from './lost-sizzler-paywall-entry.mjs';

const DISABLED_RESULT = Object.freeze({
  enabled: false,
  mounted: false,
  reason: 'disabled',
});

function requireFactory(value, label) {
  if (typeof value !== 'function') throw new Error(`${label} must be a function.`);
  return value;
}

function requireConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('C64 Dungeon Carnage PayPal paywall composition requires a configuration object.');
  }
  return value;
}

function requirePaypalMount(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('C64 Dungeon Carnage PayPal checkout requires an explicit provider mount.');
  }
  return value;
}

export function mountLostSizzlerPayPalPaywall(options = {}) {
  const config = options?.config ?? globalThis.__CCG_DUNGEON_CARNAGE_COMMERCE__;
  if (!config || config.enabled !== true) return DISABLED_RESULT;

  const sourceConfig = requireConfig(config);
  const documentRef = options.documentRef ?? globalThis.document;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? (() => Date.now());
  const paypalMount = options.paypalMount ?? null;
  const checkoutAdapterFactory = options.checkoutAdapterFactory ?? createLostSizzlerPayPalCheckoutAdapter;
  const paywallEntryFactory = options.paywallEntryFactory ?? mountLostSizzlerPaywallEntry;
  const mountPaywall = requireFactory(paywallEntryFactory, 'paywallEntryFactory');
  const checkoutEnabled = sourceConfig.checkoutEnabled === true;

  if (!checkoutEnabled) {
    return mountPaywall({
      config: sourceConfig,
      documentRef,
      fetchImpl,
      now,
    });
  }

  if (sourceConfig.onCheckoutRequested != null) {
    throw new Error('C64 Dungeon Carnage PayPal composition refuses a competing checkout renderer callback.');
  }

  const createCheckoutAdapter = requireFactory(checkoutAdapterFactory, 'checkoutAdapterFactory');
  const providerMount = requirePaypalMount(paypalMount);
  const checkoutAdapter = createCheckoutAdapter({
    document: documentRef,
    clientId: sourceConfig.paypalClientId,
    currency: 'GBP',
    intent: 'capture',
    namespace: 'paypal',
    mount: providerMount,
    onError: typeof sourceConfig.onError === 'function' ? sourceConfig.onError : () => {},
  });

  if (!checkoutAdapter || typeof checkoutAdapter.onCheckoutRequested !== 'function' || typeof checkoutAdapter.destroy !== 'function') {
    throw new Error('C64 Dungeon Carnage PayPal checkout adapter factory returned an invalid boundary.');
  }

  const composedConfig = Object.freeze({
    ...sourceConfig,
    onCheckoutRequested: checkoutAdapter.onCheckoutRequested,
  });

  let paywall;
  try {
    paywall = mountPaywall({
      config: composedConfig,
      documentRef,
      fetchImpl,
      now,
    });
  } catch (error) {
    void checkoutAdapter.destroy();
    throw error;
  }

  if (!paywall || typeof paywall.destroy !== 'function') {
    void checkoutAdapter.destroy();
    throw new Error('C64 Dungeon Carnage PayPal composition received an invalid paywall boundary.');
  }

  let destroyed = false;
  return Object.freeze({
    ...paywall,
    provider: 'paypal',
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      try {
        await paywall.destroy();
      } finally {
        await checkoutAdapter.destroy();
      }
    },
  });
}

export { DISABLED_RESULT };
