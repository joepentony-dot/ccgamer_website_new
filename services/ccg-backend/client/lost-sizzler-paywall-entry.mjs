import { createLostSizzlerPaywallBootstrap } from './lost-sizzler-paywall-bootstrap.mjs';

const DEFAULT_ROOT_SELECTOR = '#ccg-dungeon-carnage-paywall';

function requireCallback(value, label) {
  if (typeof value !== 'function') throw new Error(`${label} must be a function.`);
  return value;
}

function optionalCallback(value, label) {
  if (value == null) return null;
  return requireCallback(value, label);
}

function requireHttpsBaseUrl(value) {
  let url;
  try {
    url = new URL(String(value || ''));
  } catch {
    throw new Error('C64 Dungeon Carnage commerce base URL must be a valid HTTPS URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('C64 Dungeon Carnage commerce base URL must be a credential-free HTTPS URL without a fragment.');
  }
  return url.toString().replace(/\/$/, '');
}

function resolveRoot(documentRef, selector) {
  if (!documentRef || typeof documentRef.querySelector !== 'function') {
    throw new Error('C64 Dungeon Carnage paywall entry requires a document query boundary.');
  }
  if (selector !== DEFAULT_ROOT_SELECTOR) {
    throw new Error(`C64 Dungeon Carnage paywall root selector must remain ${DEFAULT_ROOT_SELECTOR}.`);
  }
  const root = documentRef.querySelector(selector);
  if (!root) throw new Error('C64 Dungeon Carnage paywall root is not present.');
  return root;
}

export function mountLostSizzlerPaywallEntry({
  config = globalThis.__CCG_DUNGEON_CARNAGE_COMMERCE__,
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  bootstrapFactory = createLostSizzlerPaywallBootstrap,
} = {}) {
  if (!config || config.enabled !== true) {
    return Object.freeze({
      enabled: false,
      mounted: false,
      reason: 'disabled',
    });
  }

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('C64 Dungeon Carnage commerce configuration must be an object.');
  }

  const factory = requireCallback(bootstrapFactory, 'bootstrapFactory');
  const baseUrl = requireHttpsBaseUrl(config.baseUrl);
  const getAccessToken = requireCallback(config.getAccessToken, 'getAccessToken');
  const onDownloadGrant = requireCallback(config.onDownloadGrant, 'onDownloadGrant');
  const onStateChange = optionalCallback(config.onStateChange, 'onStateChange') || (() => {});
  const onError = optionalCallback(config.onError, 'onError') || (() => {});
  const checkoutEnabled = config.checkoutEnabled === true;
  const onCheckoutRequested = optionalCallback(config.onCheckoutRequested, 'onCheckoutRequested');

  if (checkoutEnabled && !onCheckoutRequested) {
    throw new Error('C64 Dungeon Carnage checkout cannot be enabled without an explicit provider renderer callback.');
  }

  const root = resolveRoot(documentRef, config.rootSelector || DEFAULT_ROOT_SELECTOR);
  const bootstrap = factory({
    baseUrl,
    getAccessToken,
    root,
    documentRef,
    fetchImpl,
    now,
    checkoutEnabled,
    signInPath: '/auth/login.html?returnTo=%2Farcade%2Flost-sizzler%2F',
    onCheckoutRequested,
    onDownloadGrant,
    onStateChange,
    onError,
  });

  if (!bootstrap || typeof bootstrap.start !== 'function' || typeof bootstrap.destroy !== 'function') {
    throw new Error('C64 Dungeon Carnage paywall bootstrap factory returned an invalid boundary.');
  }

  return Object.freeze({
    enabled: true,
    mounted: true,
    checkoutEnabled,
    bootstrap,
    start() {
      return bootstrap.start();
    },
    refresh() {
      return bootstrap.refresh ? bootstrap.refresh() : bootstrap.start();
    },
    destroy() {
      return bootstrap.destroy();
    },
  });
}
