function requireCallback(value, label) {
  if (typeof value !== 'function') throw new Error(`${label} must be a function.`);
  return value;
}

function requireMount(value) {
  if (!value || typeof value !== 'object') throw new Error('C64 Dungeon Carnage PayPal renderer requires a DOM mount element.');
  return value;
}

function requirePayPal(value) {
  if (!value || typeof value !== 'object' || typeof value.Buttons !== 'function') {
    throw new Error('C64 Dungeon Carnage PayPal renderer requires an already-loaded PayPal Buttons provider.');
  }
  return value;
}

function requireOrderId(value, label = 'PayPal order id') {
  const orderId = String(value || '').trim();
  if (!/^[A-Za-z0-9-]{1,128}$/.test(orderId)) throw new Error(`${label} is invalid.`);
  return orderId;
}

function requireBridge(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('C64 Dungeon Carnage PayPal renderer requires a checkout bridge.');
  }
  return Object.freeze({
    createOrder: requireCallback(value.createOrder, 'checkoutBridge.createOrder'),
    approve: requireCallback(value.approve, 'checkoutBridge.approve'),
    cancel: requireCallback(value.cancel, 'checkoutBridge.cancel'),
  });
}

export function createLostSizzlerPayPalButtonsRenderer({
  paypal,
  mount,
  onError = () => {},
  style = Object.freeze({ layout: 'vertical', shape: 'rect', label: 'paypal' }),
} = {}) {
  const provider = requirePayPal(paypal);
  const target = requireMount(mount);
  const reportError = requireCallback(onError, 'onError');
  if (!style || typeof style !== 'object' || Array.isArray(style)) {
    throw new Error('C64 Dungeon Carnage PayPal renderer style must be an object.');
  }

  let destroyed = false;
  let activeButtons = null;

  function ensureActive() {
    if (destroyed) throw new Error('C64 Dungeon Carnage PayPal renderer has been destroyed.');
  }

  async function closeButtons() {
    const current = activeButtons;
    activeButtons = null;
    if (current && typeof current.close === 'function') await current.close();
  }

  async function onCheckoutRequested(checkoutBridge) {
    ensureActive();
    const bridge = requireBridge(checkoutBridge);
    await closeButtons();

    let providerOrderCreated = false;
    const buttons = provider.Buttons({
      style: { ...style },
      async createOrder() {
        ensureActive();
        const orderId = requireOrderId(await bridge.createOrder(), 'server-created PayPal order id');
        providerOrderCreated = true;
        return orderId;
      },
      async onApprove(data) {
        ensureActive();
        const orderId = requireOrderId(data?.orderID, 'approved PayPal order id');
        return bridge.approve(orderId);
      },
      onCancel() {
        if (destroyed) return;
        providerOrderCreated = false;
        bridge.cancel();
      },
      onError(error) {
        if (!destroyed && providerOrderCreated) {
          providerOrderCreated = false;
          try { bridge.cancel(); } catch {}
        }
        reportError(error instanceof Error ? error : new Error('paypal_checkout_error'));
      },
    });

    if (!buttons || typeof buttons.render !== 'function') {
      throw new Error('PayPal Buttons provider returned an invalid renderer.');
    }
    if (typeof buttons.isEligible === 'function' && buttons.isEligible() !== true) {
      throw new Error('PayPal Buttons are not eligible in this browser context.');
    }

    activeButtons = buttons;
    try {
      await buttons.render(target);
    } catch (error) {
      activeButtons = null;
      if (providerOrderCreated) {
        providerOrderCreated = false;
        try { bridge.cancel(); } catch {}
      }
      throw error;
    }
    return buttons;
  }

  async function destroy() {
    if (destroyed) return;
    destroyed = true;
    await closeButtons();
  }

  return Object.freeze({
    onCheckoutRequested,
    destroy,
  });
}
