import assert from 'node:assert/strict';
import test from 'node:test';
import { createLostSizzlerPayPalCheckoutAdapter } from '../client/lost-sizzler-paypal-checkout-adapter.mjs';

function createHarness() {
  const scripts = [];
  const buttonConfigs = [];
  const renderedTargets = [];
  let closeCount = 0;
  const view = {};
  const mount = { id: 'paypal-mount' };
  const paypal = {
    Buttons(config) {
      buttonConfigs.push(config);
      return {
        isEligible() { return true; },
        async render(target) { renderedTargets.push(target); },
        async close() { closeCount += 1; },
      };
    },
  };
  const head = {
    appendChild(script) {
      scripts.push(script);
      queueMicrotask(() => {
        view.paypal = paypal;
        script.emit('load');
      });
      return script;
    },
  };
  function createScript() {
    const listeners = new Map();
    return {
      src: '', async: false, dataset: {},
      addEventListener(type, fn) { listeners.set(type, fn); },
      removeEventListener(type) { listeners.delete(type); },
      emit(type) { listeners.get(type)?.(); },
    };
  }
  const document = {
    defaultView: view,
    head,
    documentElement: head,
    baseURI: 'https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/',
    createElement(tag) { assert.equal(tag, 'script'); return createScript(); },
    querySelectorAll(selector) { assert.equal(selector, 'script[src]'); return scripts; },
  };
  return { document, mount, paypal, scripts, buttonConfigs, renderedTargets, get closeCount() { return closeCount; } };
}

function createBridge(events) {
  return {
    async createOrder() { events.push('create'); return 'ORDER-123'; },
    async approve(orderId) { events.push(`approve:${orderId}`); return { owned: true }; },
    cancel() { events.push('cancel'); },
  };
}

test('adapter is passive until checkout is explicitly requested', async () => {
  const harness = createHarness();
  const events = [];
  const adapter = createLostSizzlerPayPalCheckoutAdapter({
    document: harness.document,
    clientId: 'public-client-id',
    mount: harness.mount,
  });

  assert.equal(harness.scripts.length, 0);
  assert.equal(harness.buttonConfigs.length, 0);
  assert.match(adapter.source, /^https:\/\/www\.paypal\.com\/sdk\/js\?/);

  await adapter.onCheckoutRequested(createBridge(events));
  assert.equal(harness.scripts.length, 1);
  assert.equal(harness.buttonConfigs.length, 1);
  assert.deepEqual(harness.renderedTargets, [harness.mount]);
  assert.deepEqual(events, []);

  const providerConfig = harness.buttonConfigs[0];
  assert.equal(await providerConfig.createOrder(), 'ORDER-123');
  assert.deepEqual(events, ['create']);
  assert.deepEqual(await providerConfig.onApprove({ orderID: 'ORDER-123' }), { owned: true });
  assert.deepEqual(events, ['create', 'approve:ORDER-123']);
  providerConfig.onCancel();
  assert.deepEqual(events, ['create', 'approve:ORDER-123', 'cancel']);
});

test('adapter reuses the loaded SDK and replaces an earlier Buttons renderer safely', async () => {
  const harness = createHarness();
  const adapter = createLostSizzlerPayPalCheckoutAdapter({
    document: harness.document,
    clientId: 'public-client-id',
    mount: harness.mount,
  });

  await adapter.onCheckoutRequested(createBridge([]));
  await adapter.onCheckoutRequested(createBridge([]));
  assert.equal(harness.scripts.length, 1);
  assert.equal(harness.buttonConfigs.length, 2);
  assert.equal(harness.closeCount, 1);
});

test('adapter reuses an existing provider without adding the PayPal SDK script', async () => {
  const harness = createHarness();
  harness.document.defaultView.paypal = harness.paypal;
  const adapter = createLostSizzlerPayPalCheckoutAdapter({
    document: harness.document,
    clientId: 'public-client-id',
    mount: harness.mount,
  });
  await adapter.onCheckoutRequested(createBridge([]));
  assert.equal(harness.scripts.length, 0);
  assert.equal(harness.buttonConfigs.length, 1);
});

test('destroy closes active Buttons and prevents later checkout activation', async () => {
  const harness = createHarness();
  const adapter = createLostSizzlerPayPalCheckoutAdapter({
    document: harness.document,
    clientId: 'public-client-id',
    mount: harness.mount,
  });
  await adapter.onCheckoutRequested(createBridge([]));
  await adapter.destroy();
  assert.equal(harness.closeCount, 1);
  await assert.rejects(adapter.onCheckoutRequested(createBridge([])), /destroyed/i);
});
