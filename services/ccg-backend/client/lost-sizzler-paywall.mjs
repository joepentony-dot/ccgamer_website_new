function paywallError(statusCode, code) {
  const error = new Error(code);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function requirePurchaseClient(client) {
  const required = [
    'getOffer',
    'getEntitlement',
    'createOrder',
    'captureAndConfirmOwnership',
    'requestOfflineDownload',
  ];
  if (!client || typeof client !== 'object') throw new Error('C64 Dungeon Carnage paywall requires a purchase client.');
  for (const method of required) {
    if (typeof client[method] !== 'function') throw new Error(`C64 Dungeon Carnage paywall purchase client requires ${method}().`);
  }
  return client;
}

function normalizeOffer(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw paywallError(503, 'offer_unavailable');
  if (value.commerce_available !== true || value.requires_account !== true) throw paywallError(503, 'offer_unavailable');
  const product = value.product;
  if (!product || typeof product !== 'object') throw paywallError(503, 'offer_unavailable');
  const priceMinor = Number(product.price_minor);
  if (String(product.currency || '').toUpperCase() !== 'GBP' || priceMinor !== 199) throw paywallError(503, 'offer_unavailable');
  if (product.permanent !== true || product.includes_all_updates !== true) throw paywallError(503, 'offer_unavailable');
  const productSlug = String(product.product_slug || '').trim();
  if (!productSlug) throw paywallError(503, 'offer_unavailable');
  return Object.freeze({
    product_slug: productSlug,
    currency: 'GBP',
    price_minor: 199,
    permanent: true,
    includes_all_updates: true,
  });
}

function ownedEntitlement(value) {
  return Boolean(value?.owned === true && value?.permanent === true);
}

function freezeState(value) {
  return Object.freeze({ ...value });
}

export function createLostSizzlerPaywallController({
  purchaseClient,
  checkoutEnabled = false,
  onStateChange = () => {},
} = {}) {
  const client = requirePurchaseClient(purchaseClient);
  if (typeof onStateChange !== 'function') throw new Error('C64 Dungeon Carnage paywall requires onStateChange to be a function.');
  const checkoutAllowed = checkoutEnabled === true;
  let state = freezeState({
    phase: 'idle',
    offer: null,
    entitlement: null,
    authenticated: false,
    canCheckout: false,
    canDownload: false,
    error: null,
  });
  let pendingOrderId = null;

  function publish(next) {
    state = freezeState(next);
    onStateChange(state);
    return state;
  }

  function publicState() {
    return state;
  }

  async function refresh() {
    pendingOrderId = null;
    publish({ ...state, phase: 'loading', error: null, canCheckout: false, canDownload: false });
    let offer;
    try {
      offer = normalizeOffer(await client.getOffer());
    } catch (error) {
      publish({
        phase: 'error',
        offer: null,
        entitlement: null,
        authenticated: false,
        canCheckout: false,
        canDownload: false,
        error: String(error?.code || 'offer_unavailable'),
      });
      throw error;
    }

    try {
      const entitlement = await client.getEntitlement();
      if (ownedEntitlement(entitlement)) {
        return publish({
          phase: 'owned',
          offer,
          entitlement,
          authenticated: true,
          canCheckout: false,
          canDownload: true,
          error: null,
        });
      }
      return publish({
        phase: 'available',
        offer,
        entitlement,
        authenticated: true,
        canCheckout: checkoutAllowed,
        canDownload: false,
        error: null,
      });
    } catch (error) {
      if (error?.statusCode === 401 && error?.code === 'authentication_required') {
        return publish({
          phase: 'sign-in-required',
          offer,
          entitlement: null,
          authenticated: false,
          canCheckout: false,
          canDownload: false,
          error: null,
        });
      }
      publish({
        phase: 'error',
        offer,
        entitlement: null,
        authenticated: false,
        canCheckout: false,
        canDownload: false,
        error: String(error?.code || 'entitlement_unavailable'),
      });
      throw error;
    }
  }

  async function createProviderOrder() {
    if (!checkoutAllowed) throw paywallError(503, 'checkout_disabled');
    if (!state.authenticated) throw paywallError(401, 'authentication_required');
    if (state.canDownload) throw paywallError(409, 'already_owned');
    const created = await client.createOrder();
    if (created?.already_owned === true) {
      await refresh();
      throw paywallError(409, 'already_owned');
    }
    const orderId = String(created?.order_id || '').trim();
    if (!/^[A-Za-z0-9-]{1,128}$/.test(orderId)) throw paywallError(503, 'checkout_unavailable');
    pendingOrderId = orderId;
    publish({ ...state, phase: 'checkout-pending', canCheckout: false, error: null });
    return orderId;
  }

  async function approveProviderOrder(orderIdValue) {
    if (!checkoutAllowed) throw paywallError(503, 'checkout_disabled');
    const orderId = String(orderIdValue || '').trim();
    if (!pendingOrderId || orderId !== pendingOrderId) throw paywallError(409, 'provider_order_mismatch');
    const confirmed = await client.captureAndConfirmOwnership(orderId);
    pendingOrderId = null;
    const entitlement = confirmed?.entitlement;
    if (!ownedEntitlement(entitlement)) throw paywallError(409, 'entitlement_not_confirmed');
    publish({
      phase: 'owned',
      offer: state.offer,
      entitlement,
      authenticated: true,
      canCheckout: false,
      canDownload: true,
      error: null,
    });
    return confirmed;
  }

  function cancelProviderOrder() {
    pendingOrderId = null;
    if (state.phase === 'checkout-pending') {
      publish({ ...state, phase: 'available', canCheckout: checkoutAllowed, error: null });
    }
    return state;
  }

  async function requestDownload() {
    if (!ownedEntitlement(state.entitlement) || !state.canDownload) throw paywallError(403, 'permanent_entitlement_required');
    return client.requestOfflineDownload();
  }

  return Object.freeze({
    get state() { return publicState(); },
    refresh,
    requestDownload,
    cancelProviderOrder,
    checkout: Object.freeze({
      enabled: checkoutAllowed,
      createOrder: createProviderOrder,
      approve: approveProviderOrder,
    }),
  });
}
