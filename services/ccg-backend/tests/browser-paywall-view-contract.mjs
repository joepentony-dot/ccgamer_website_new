import assert from 'node:assert/strict';
import { buildLostSizzlerPaywallViewModel, mountLostSizzlerPaywallView } from '../client/lost-sizzler-paywall-view.mjs';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = new Map();
    this.textContent = '';
    this.className = '';
    this.disabled = false;
    this.type = '';
    this.href = '';
    this.attributes = new Map();
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  async click() {
    if (this.disabled) return;
    const listener = this.listeners.get('click');
    if (listener) await listener({ currentTarget: this, preventDefault() {} });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

class FakeDocument {
  createElement(tagName) { return new FakeElement(tagName); }
}

function descendants(root) {
  const result = [];
  const visit = (node) => {
    result.push(node);
    for (const child of node.children || []) visit(child);
  };
  for (const child of root.children || []) visit(child);
  return result;
}

function byText(root, text) {
  return descendants(root).find((node) => node.textContent === text);
}

function createController({ checkoutEnabled = false } = {}) {
  let state = Object.freeze({
    phase: 'available',
    offer: Object.freeze({ price_minor: 199, currency: 'GBP', permanent: true, includes_all_updates: true }),
    entitlement: Object.freeze({ owned: false, permanent: false }),
    authenticated: true,
    canCheckout: checkoutEnabled,
    canDownload: false,
    error: null,
  });
  const calls = { refresh: 0, createOrder: 0, approve: 0, cancel: 0, download: 0 };
  return {
    calls,
    get state() { return state; },
    setState(next) { state = Object.freeze({ ...state, ...next }); },
    async refresh() { calls.refresh += 1; return state; },
    async requestDownload() {
      calls.download += 1;
      return Object.freeze({
        product_slug: 'the-lost-sizzler-full-game',
        download: Object.freeze({ kind: 'signed-url', url: 'https://private.example.test/signed', expires_at: '2026-09-12T15:05:00.000Z' }),
        package: Object.freeze({ package_id: 'c64-dungeon-carnage', version: '10.42', sha256: 'a'.repeat(64), bytes: 123456 }),
      });
    },
    cancelProviderOrder() { calls.cancel += 1; return state; },
    checkout: Object.freeze({
      enabled: checkoutEnabled,
      async createOrder() { calls.createOrder += 1; return 'ORDER-1'; },
      async approve() { calls.approve += 1; return { ok: true }; },
    }),
  };
}

{
  const model = buildLostSizzlerPaywallViewModel({ phase: 'available', canCheckout: false, offer: { price_minor: 199, currency: 'GBP' } });
  assert.equal(model.showCheckout, false);
  assert.match(model.message, /Purchasing is not enabled on this build/);
}

{
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  const controller = createController({ checkoutEnabled: false });
  const errors = [];
  const view = mountLostSizzlerPaywallView({ controller, root, documentRef: doc, onError: (error) => errors.push(error) });
  view.render();
  assert.equal(byText(root, 'Buy Offline Edition — £1.99'), undefined, 'disabled checkout must not render a buy button');
  assert.equal(controller.calls.createOrder, 0, 'rendering disabled checkout must not create an order');
  assert.equal(errors.length, 0);
}

{
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  const controller = createController();
  controller.setState({ phase: 'sign-in-required', authenticated: false, canCheckout: false });
  const view = mountLostSizzlerPaywallView({ controller, root, documentRef: doc });
  view.render();
  const link = byText(root, 'Sign in to purchase or restore');
  assert.ok(link, 'signed-out state must offer sign-in');
  assert.equal(link.href, '/auth/login.html?returnTo=%2Farcade%2Flost-sizzler%2F');
}

{
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  const controller = createController();
  controller.setState({
    phase: 'owned',
    entitlement: { owned: true, permanent: true },
    canCheckout: false,
    canDownload: true,
  });
  let grant = null;
  const view = mountLostSizzlerPaywallView({ controller, root, documentRef: doc, onDownloadGrant: (value) => { grant = value; } });
  view.render();
  const button = byText(root, 'Download / Re-download Offline Edition');
  assert.ok(button, 'owner state must render re-download');
  await button.click();
  assert.equal(controller.calls.download, 1);
  assert.equal(grant?.download?.kind, 'signed-url');
  assert.equal(grant?.download?.url, 'https://private.example.test/signed');
}

{
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  const controller = createController();
  controller.setState({
    phase: 'owned',
    entitlement: { owned: true, permanent: true },
    canCheckout: false,
    canDownload: true,
  });
  const view = mountLostSizzlerPaywallView({ controller, root, documentRef: doc });
  assert.throws(
    () => view.render(),
    /requires onDownloadGrant/,
    'owner download must fail closed rather than silently discarding a signed grant',
  );
  assert.equal(controller.calls.download, 0);
}

{
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  const controller = createController({ checkoutEnabled: true });
  let checkoutBridge = null;
  const view = mountLostSizzlerPaywallView({
    controller,
    root,
    documentRef: doc,
    onCheckoutRequested: (bridge) => { checkoutBridge = bridge; },
  });
  view.render();
  const buy = byText(root, 'Buy Offline Edition — £1.99');
  assert.ok(buy, 'explicitly enabled checkout may expose the provider-neutral purchase action');
  await buy.click();
  assert.equal(controller.calls.createOrder, 0, 'view must not create an order merely because the user clicked the provider-neutral action');
  assert.equal(controller.calls.approve, 0, 'view must not capture an order itself');
  assert.ok(checkoutBridge, 'view must hand an explicit narrow checkout bridge to the later provider renderer');
  await checkoutBridge.createOrder();
  assert.equal(controller.calls.createOrder, 1, 'provider renderer can deliberately invoke the controller order boundary');
}

{
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  const controller = createController({ checkoutEnabled: true });
  const view = mountLostSizzlerPaywallView({ controller, root, documentRef: doc });
  assert.throws(
    () => view.render(),
    /requires onCheckoutRequested/,
    'enabled checkout must fail closed when no provider renderer is configured',
  );
  assert.equal(controller.calls.createOrder, 0);
}

{
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  const controller = createController();
  assert.throws(
    () => mountLostSizzlerPaywallView({ controller, root, documentRef: doc, signInPath: 'https://evil.example/' }),
    /root-relative path/,
  );
  assert.throws(
    () => mountLostSizzlerPaywallView({ controller, root, documentRef: doc, signInPath: '//evil.example/' }),
    /root-relative path/,
  );
}

{
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  const controller = createController();
  const view = mountLostSizzlerPaywallView({ controller, root, documentRef: doc });
  await view.refresh();
  assert.equal(controller.calls.refresh, 1);
  view.destroy();
  assert.equal(root.children.length, 0);
  assert.throws(() => view.render(), /destroyed/);
}

console.log('C64 Dungeon Carnage browser paywall view contract passed.');
