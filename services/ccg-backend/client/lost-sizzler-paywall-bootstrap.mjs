import { createLostSizzlerPurchaseClient } from './lost-sizzler-purchase.mjs';
import { createLostSizzlerPaywallController } from './lost-sizzler-paywall.mjs';
import { mountLostSizzlerPaywallView } from './lost-sizzler-paywall-view.mjs';

function requireCallback(value, label) {
  if (typeof value !== 'function') throw new Error(`${label} must be a function.`);
  return value;
}

function optionalCallback(value, label) {
  if (value == null) return null;
  return requireCallback(value, label);
}

export function createLostSizzlerPaywallBootstrap({
  baseUrl,
  getAccessToken,
  root,
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  checkoutEnabled = false,
  signInPath = '/auth/login.html?returnTo=%2Farcade%2Flost-sizzler%2F',
  onCheckoutRequested = null,
  onDownloadGrant,
  onStateChange = () => {},
  onError = () => {},
} = {}) {
  const checkoutRequested = optionalCallback(onCheckoutRequested, 'onCheckoutRequested');
  const downloadGrant = requireCallback(onDownloadGrant, 'onDownloadGrant');
  const stateChanged = requireCallback(onStateChange, 'onStateChange');
  const reportError = requireCallback(onError, 'onError');
  const checkoutAllowed = checkoutEnabled === true;

  if (checkoutAllowed && !checkoutRequested) {
    throw new Error('C64 Dungeon Carnage paywall bootstrap requires onCheckoutRequested before checkout can be enabled.');
  }

  let view = null;
  let started = false;
  let destroyed = false;

  const purchaseClient = createLostSizzlerPurchaseClient({
    baseUrl,
    getAccessToken,
    fetchImpl,
    now,
  });
  const controller = createLostSizzlerPaywallController({
    purchaseClient,
    checkoutEnabled: checkoutAllowed,
    onStateChange(nextState) {
      stateChanged(nextState);
      if (view && !destroyed) view.render(nextState);
    },
  });
  view = mountLostSizzlerPaywallView({
    controller,
    root,
    documentRef,
    signInPath,
    onCheckoutRequested: checkoutRequested,
    onDownloadGrant: downloadGrant,
    onError: reportError,
  });

  function ensureActive() {
    if (destroyed) throw new Error('C64 Dungeon Carnage paywall bootstrap has been destroyed.');
  }

  function render() {
    ensureActive();
    return view.render(controller.state);
  }

  async function start() {
    ensureActive();
    started = true;
    return view.refresh();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    view.destroy();
  }

  return Object.freeze({
    purchaseClient,
    controller,
    view,
    get started() { return started; },
    get destroyed() { return destroyed; },
    get checkoutEnabled() { return checkoutAllowed; },
    render,
    start,
    refresh: start,
    destroy,
  });
}
