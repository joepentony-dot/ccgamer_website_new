function requireController(controller) {
  if (!controller || typeof controller !== 'object') throw new Error('C64 Dungeon Carnage paywall view requires a controller.');
  if (typeof controller.refresh !== 'function') throw new Error('C64 Dungeon Carnage paywall view requires controller.refresh().');
  if (typeof controller.requestDownload !== 'function') throw new Error('C64 Dungeon Carnage paywall view requires controller.requestDownload().');
  if (typeof controller.cancelProviderOrder !== 'function') throw new Error('C64 Dungeon Carnage paywall view requires controller.cancelProviderOrder().');
  if (!controller.checkout || typeof controller.checkout !== 'object') throw new Error('C64 Dungeon Carnage paywall view requires controller.checkout.');
  if (typeof controller.checkout.createOrder !== 'function') throw new Error('C64 Dungeon Carnage paywall view requires controller.checkout.createOrder().');
  if (typeof controller.checkout.approve !== 'function') throw new Error('C64 Dungeon Carnage paywall view requires controller.checkout.approve().');
  return controller;
}

function requireRoot(root) {
  if (!root || typeof root.replaceChildren !== 'function' || typeof root.append !== 'function') {
    throw new Error('C64 Dungeon Carnage paywall view requires a DOM root.');
  }
  return root;
}

function requireDocument(documentRef) {
  if (!documentRef || typeof documentRef.createElement !== 'function') {
    throw new Error('C64 Dungeon Carnage paywall view requires a document.');
  }
  return documentRef;
}

function requireLocalPath(value, label) {
  const path = String(value || '').trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || /[\u0000-\u001f\u007f]/.test(path)) {
    throw new Error(`${label} must be a root-relative path.`);
  }
  return path;
}

function requireCallback(value, label) {
  if (typeof value !== 'function') throw new Error(`${label} must be a function.`);
  return value;
}

function money(priceMinor, currency) {
  if (currency === 'GBP' && priceMinor === 199) return '£1.99';
  return `${currency || ''} ${(Number(priceMinor || 0) / 100).toFixed(2)}`.trim();
}

export function buildLostSizzlerPaywallViewModel(state = {}) {
  const phase = String(state?.phase || 'idle');
  const offer = state?.offer || null;
  const price = offer ? money(Number(offer.price_minor), String(offer.currency || '').toUpperCase()) : '£1.99';
  const base = {
    phase,
    title: 'C64 Dungeon Carnage — Offline Edition',
    price,
    canCheckout: state?.canCheckout === true,
    canDownload: state?.canDownload === true,
    showSignIn: false,
    showCheckout: false,
    showDownload: false,
    message: '',
  };

  if (phase === 'loading') return Object.freeze({ ...base, message: 'Checking purchase access…' });
  if (phase === 'sign-in-required') {
    return Object.freeze({
      ...base,
      showSignIn: true,
      message: `${price} one-off purchase. Sign in with your CCG account to buy or restore your permanent download entitlement.`,
    });
  }
  if (phase === 'owned') {
    return Object.freeze({
      ...base,
      showDownload: true,
      message: 'Permanent ownership confirmed. You can request a fresh short-lived download whenever you need it.',
    });
  }
  if (phase === 'available') {
    return Object.freeze({
      ...base,
      showCheckout: state?.canCheckout === true,
      message: state?.canCheckout === true
        ? `${price} one-off purchase with permanent ownership and all future updates included.`
        : `${price} one-off purchase with permanent ownership and all future updates included. Purchasing is not enabled on this build.`,
    });
  }
  if (phase === 'checkout-pending') {
    return Object.freeze({ ...base, message: 'Checkout is awaiting provider approval. No ownership is granted until the server confirms the entitlement.' });
  }
  if (phase === 'error') {
    return Object.freeze({ ...base, message: 'Purchase access is temporarily unavailable. Browser gameplay remains unaffected.' });
  }
  return Object.freeze({ ...base, message: 'Offline purchase access has not been checked yet.' });
}

function textNode(documentRef, tag, text, className = '') {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function actionButton(documentRef, text, className = '') {
  const button = documentRef.createElement('button');
  button.type = 'button';
  if (className) button.className = className;
  button.textContent = text;
  return button;
}

export function mountLostSizzlerPaywallView({
  controller,
  root,
  documentRef = globalThis.document,
  signInPath = '/auth/login.html?returnTo=%2Farcade%2Flost-sizzler%2F',
  onCheckoutRequested = () => {},
  onDownloadGrant = () => {},
  onError = () => {},
} = {}) {
  const paywall = requireController(controller);
  const mount = requireRoot(root);
  const doc = requireDocument(documentRef);
  const loginPath = requireLocalPath(signInPath, 'C64 Dungeon Carnage paywall sign-in path');
  const checkoutRequested = requireCallback(onCheckoutRequested, 'onCheckoutRequested');
  const downloadGrant = requireCallback(onDownloadGrant, 'onDownloadGrant');
  const reportError = requireCallback(onError, 'onError');
  let destroyed = false;
  let busy = false;

  function ensureActive() {
    if (destroyed) throw new Error('C64 Dungeon Carnage paywall view has been destroyed.');
  }

  async function guarded(action) {
    if (busy || destroyed) return;
    busy = true;
    try {
      await action();
    } catch (error) {
      reportError(error);
    } finally {
      busy = false;
      if (!destroyed) render(paywall.state);
    }
  }

  function render(state = paywall.state) {
    ensureActive();
    const model = buildLostSizzlerPaywallViewModel(state);
    const section = doc.createElement('section');
    section.className = 'ccg-dungeon-carnage-paywall';
    section.setAttribute?.('aria-live', 'polite');
    section.append(textNode(doc, 'h3', model.title));
    section.append(textNode(doc, 'p', model.message, 'ccg-dungeon-carnage-paywall-message'));

    const actions = doc.createElement('div');
    actions.className = 'ccg-dungeon-carnage-paywall-actions';

    if (model.showSignIn) {
      const signIn = doc.createElement('a');
      signIn.href = loginPath;
      signIn.textContent = 'Sign in to purchase or restore';
      actions.append(signIn);
    }

    if (model.showCheckout) {
      const buy = actionButton(doc, `Buy Offline Edition — ${model.price}`, 'ccg-dungeon-carnage-paywall-buy');
      buy.disabled = busy || paywall.checkout.enabled !== true;
      buy.addEventListener('click', () => guarded(async () => {
        if (paywall.checkout.enabled !== true) throw new Error('checkout_disabled');
        await checkoutRequested(Object.freeze({
          createOrder: paywall.checkout.createOrder,
          approve: paywall.checkout.approve,
          cancel: paywall.cancelProviderOrder,
        }));
      }));
      actions.append(buy);
    }

    if (model.showDownload) {
      const download = actionButton(doc, 'Download / Re-download Offline Edition', 'ccg-dungeon-carnage-paywall-download');
      download.disabled = busy;
      download.addEventListener('click', () => guarded(async () => {
        const grant = await paywall.requestDownload();
        await downloadGrant(grant);
      }));
      actions.append(download);
    }

    const refresh = actionButton(doc, 'Refresh purchase access', 'ccg-dungeon-carnage-paywall-refresh');
    refresh.disabled = busy;
    refresh.addEventListener('click', () => guarded(async () => {
      await paywall.refresh();
    }));
    actions.append(refresh);

    section.append(actions);
    mount.replaceChildren(section);
    return model;
  }

  async function refresh() {
    ensureActive();
    try {
      await paywall.refresh();
    } catch (error) {
      reportError(error);
    }
    return render(paywall.state);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    mount.replaceChildren();
  }

  return Object.freeze({ render, refresh, destroy });
}
