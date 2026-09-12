#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createLostSizzlerPayPalButtonsRenderer } from '../client/lost-sizzler-paypal-buttons-renderer.mjs';

function fakeProvider({ eligible = true, renderError = null } = {}) {
  const state = { options: null, renders: 0, closes: 0, mount: null };
  return {
    state,
    paypal: {
      Buttons(options) {
        state.options = options;
        return {
          isEligible() { return eligible; },
          async render(mount) {
            state.renders += 1;
            state.mount = mount;
            if (renderError) throw renderError;
          },
          async close() { state.closes += 1; },
        };
      },
    },
  };
}

const mount = Object.freeze({ nodeType: 1 });

{
  assert.throws(() => createLostSizzlerPayPalButtonsRenderer({ mount }), /already-loaded PayPal Buttons provider/);
  assert.throws(() => createLostSizzlerPayPalButtonsRenderer({ paypal: { Buttons() {} } }), /DOM mount element/);
}

{
  const provider = fakeProvider();
  const calls = { create: 0, approve: [], cancel: 0, errors: [] };
  const renderer = createLostSizzlerPayPalButtonsRenderer({
    paypal: provider.paypal,
    mount,
    onError(error) { calls.errors.push(error); },
  });
  const bridge = {
    async createOrder() { calls.create += 1; return 'SERVER-ORDER-123'; },
    async approve(orderId) { calls.approve.push(orderId); return { owned: true }; },
    cancel() { calls.cancel += 1; },
  };

  await renderer.onCheckoutRequested(bridge);
  assert.equal(provider.state.renders, 1);
  assert.equal(provider.state.mount, mount);
  assert.equal(calls.create, 0, 'rendering PayPal buttons must not create an order');
  assert.deepEqual(calls.approve, []);

  const orderId = await provider.state.options.createOrder();
  assert.equal(orderId, 'SERVER-ORDER-123');
  assert.equal(calls.create, 1);

  await provider.state.options.onApprove({ orderID: 'SERVER-ORDER-123' });
  assert.deepEqual(calls.approve, ['SERVER-ORDER-123']);

  await assert.rejects(
    () => provider.state.options.onApprove({ orderID: 'bad/order' }),
    /approved PayPal order id is invalid/,
  );
  assert.deepEqual(calls.approve, ['SERVER-ORDER-123'], 'invalid provider ids must not reach server capture');

  provider.state.options.onCancel();
  assert.equal(calls.cancel, 1);
  assert.equal(calls.errors.length, 0);

  await renderer.destroy();
  assert.equal(provider.state.closes, 1);
  await assert.rejects(() => renderer.onCheckoutRequested(bridge), /destroyed/);
}

{
  const provider = fakeProvider();
  const calls = { cancel: 0, errors: [] };
  const renderer = createLostSizzlerPayPalButtonsRenderer({
    paypal: provider.paypal,
    mount,
    onError(error) { calls.errors.push(error); },
  });
  await renderer.onCheckoutRequested({
    async createOrder() { return 'SERVER-ORDER-ERR'; },
    async approve() { throw new Error('must not run'); },
    cancel() { calls.cancel += 1; },
  });
  await provider.state.options.createOrder();
  provider.state.options.onError(new Error('provider_failed'));
  assert.equal(calls.cancel, 1, 'provider failure after order creation must clear pending checkout state');
  assert.equal(calls.errors.length, 1);
  assert.match(calls.errors[0].message, /provider_failed/);
}

{
  const provider = fakeProvider({ eligible: false });
  const renderer = createLostSizzlerPayPalButtonsRenderer({ paypal: provider.paypal, mount });
  await assert.rejects(
    () => renderer.onCheckoutRequested({
      async createOrder() { return 'ORDER-1'; },
      async approve() {},
      cancel() {},
    }),
    /not eligible/,
  );
  assert.equal(provider.state.renders, 0);
}

{
  const provider = fakeProvider({ renderError: new Error('render_failed') });
  let cancels = 0;
  const renderer = createLostSizzlerPayPalButtonsRenderer({ paypal: provider.paypal, mount });
  await assert.rejects(
    () => renderer.onCheckoutRequested({
      async createOrder() { return 'ORDER-2'; },
      async approve() {},
      cancel() { cancels += 1; },
    }),
    /render_failed/,
  );
  assert.equal(cancels, 0, 'render failure before order creation must not fabricate a cancellation transition');
}

console.log('C64 Dungeon Carnage PayPal Buttons renderer contract passed.');
