import assert from 'node:assert/strict';
import { createLostSizzlerPaywallBootstrap } from '../client/lost-sizzler-paywall-bootstrap.mjs';

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

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get() { return null; } },
    async json() { return body; },
  };
}

const OFFER = Object.freeze({
  commerce_available: true,
  requires_account: true,
  product: Object.freeze({
    product_slug: 'the-lost-sizzler-full-game',
    currency: 'GBP',
    price_minor: 199,
    permanent: true,
    includes_all_updates: true,
  }),
});

{
  const calls = [];
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  const bootstrap = createLostSizzlerPaywallBootstrap({
    baseUrl: 'https://commerce.example.test',
    getAccessToken: async () => '',
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      assert.match(url, /\/commerce\/offer$/);
      return response(OFFER);
    },
    root,
    documentRef: doc,
    onDownloadGrant() {},
  });

  assert.equal(bootstrap.checkoutEnabled, false, 'checkout must default disabled');
  assert.equal(bootstrap.started, false);
  assert.equal(calls.length, 0, 'constructing the bootstrap must not make commerce requests');
  bootstrap.render();
  assert.equal(calls.length, 0, 'rendering idle state must remain passive');
  assert.equal(byText(root, 'Buy Offline Edition — £1.99'), undefined);

  await bootstrap.start();
  assert.equal(bootstrap.started, true);
  assert.equal(calls.length, 1, 'explicit start may fetch the public offer before auth is requested');
  assert.equal(bootstrap.controller.state.phase, 'sign-in-required');
  assert.ok(byText(root, 'Sign in to purchase or restore'));
  bootstrap.destroy();
  assert.equal(root.children.length, 0);
  assert.throws(() => bootstrap.render(), /destroyed/);
}

{
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  assert.throws(
    () => createLostSizzlerPaywallBootstrap({
      baseUrl: 'https://commerce.example.test',
      getAccessToken: async () => 'token',
      root,
      documentRef: doc,
    }),
    /onDownloadGrant must be a function/,
    'bootstrap must never silently discard signed download grants',
  );
}

{
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  assert.throws(
    () => createLostSizzlerPaywallBootstrap({
      baseUrl: 'https://commerce.example.test',
      getAccessToken: async () => 'token',
      root,
      documentRef: doc,
      checkoutEnabled: true,
      onDownloadGrant() {},
    }),
    /requires onCheckoutRequested/,
    'checkout cannot be enabled without an explicit provider renderer boundary',
  );
}

{
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  assert.throws(
    () => createLostSizzlerPaywallBootstrap({
      baseUrl: 'http://commerce.example.test',
      getAccessToken: async () => 'token',
      root,
      documentRef: doc,
      onDownloadGrant() {},
    }),
    /requires HTTPS/,
  );
}

{
  const calls = [];
  const doc = new FakeDocument();
  const root = new FakeElement('div');
  let providerBridge = null;
  const bootstrap = createLostSizzlerPaywallBootstrap({
    baseUrl: 'https://commerce.example.test',
    getAccessToken: async () => 'account-token',
    checkoutEnabled: true,
    fetchImpl: async (url, options = {}) => {
      calls.push([url, options]);
      if (url.endsWith('/commerce/offer')) return response(OFFER);
      if (url.endsWith('/commerce/entitlement')) return response({ entitlement: { owned: false, permanent: false } });
      if (url.endsWith('/commerce/orders') && options.method === 'POST') return response({ order_id: 'ORDER-1' });
      throw new Error(`Unexpected request: ${options.method || 'GET'} ${url}`);
    },
    root,
    documentRef: doc,
    onCheckoutRequested: (bridge) => { providerBridge = bridge; },
    onDownloadGrant() {},
  });

  assert.equal(calls.length, 0);
  await bootstrap.start();
  assert.equal(bootstrap.controller.state.phase, 'available');
  const buy = byText(root, 'Buy Offline Edition — £1.99');
  assert.ok(buy);
  const beforeClick = calls.length;
  await buy.click();
  assert.equal(calls.length, beforeClick, 'generic Buy action must not itself create an order');
  assert.ok(providerBridge, 'explicit provider bridge must be handed to the configured renderer');
  const orderId = await providerBridge.createOrder();
  assert.equal(orderId, 'ORDER-1');
  assert.equal(calls.filter(([url]) => url.endsWith('/commerce/orders')).length, 1);
  assert.equal(bootstrap.controller.state.phase, 'checkout-pending');
  providerBridge.cancel();
  assert.equal(bootstrap.controller.state.phase, 'available');
}

console.log('C64 Dungeon Carnage browser paywall bootstrap contract passed.');
