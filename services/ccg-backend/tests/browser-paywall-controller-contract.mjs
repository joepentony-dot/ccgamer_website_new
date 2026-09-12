import assert from 'node:assert/strict';
import { createLostSizzlerPaywallController } from '../client/lost-sizzler-paywall.mjs';

function authError() {
  const error = new Error('authentication_required');
  error.statusCode = 401;
  error.code = 'authentication_required';
  return error;
}

function makeClient({ authenticated = true, owned = false } = {}) {
  const calls = [];
  let currentOwned = owned;
  return {
    calls,
    client: {
      async getOffer() {
        calls.push('offer');
        return {
          commerce_available: true,
          requires_account: true,
          product: {
            product_slug: 'the-lost-sizzler-full-game',
            currency: 'GBP',
            price_minor: 199,
            permanent: true,
            includes_all_updates: true,
          },
          paypal: { environment: 'sandbox', client_id: 'public-client-id' },
        };
      },
      async getEntitlement() {
        calls.push('entitlement');
        if (!authenticated) throw authError();
        return {
          product_slug: 'the-lost-sizzler-full-game',
          owned: currentOwned,
          permanent: true,
          includes_all_updates: true,
        };
      },
      async createOrder() {
        calls.push('create-order');
        return { already_owned: false, order_id: 'PAYPAL-ORDER-123' };
      },
      async captureAndConfirmOwnership(orderId) {
        calls.push(`capture:${orderId}`);
        currentOwned = true;
        return {
          capture: { completed: true },
          entitlement: {
            product_slug: 'the-lost-sizzler-full-game',
            owned: true,
            permanent: true,
            includes_all_updates: true,
          },
        };
      },
      async requestOfflineDownload() {
        calls.push('download');
        return {
          download: {
            kind: 'signed-url',
            url: 'https://private.example.invalid/signed-object?token=short-lived',
            expires_at: '2026-09-12T15:10:00.000Z',
          },
          package: {
            package_id: 'c64-dungeon-carnage',
            version: '10.42',
            sha256: 'a'.repeat(64),
            bytes: 12345,
          },
        };
      },
    },
  };
}

{
  const { client, calls } = makeClient({ authenticated: false });
  const states = [];
  const controller = createLostSizzlerPaywallController({ purchaseClient: client, onStateChange: state => states.push(state) });
  assert.equal(controller.checkout.enabled, false, 'checkout must be disabled by default');
  const state = await controller.refresh();
  assert.equal(state.phase, 'sign-in-required');
  assert.equal(state.offer.price_minor, 199);
  assert.equal(state.canCheckout, false);
  assert.equal(state.canDownload, false);
  assert.deepEqual(calls, ['offer', 'entitlement']);
  await assert.rejects(controller.checkout.createOrder(), error => error?.code === 'checkout_disabled');
  assert.deepEqual(calls, ['offer', 'entitlement'], 'disabled checkout must not create a server order');
  await assert.rejects(controller.requestDownload(), error => error?.code === 'permanent_entitlement_required');
  assert.ok(states.length >= 2);
}

{
  const { client, calls } = makeClient({ authenticated: true, owned: true });
  const controller = createLostSizzlerPaywallController({ purchaseClient: client, checkoutEnabled: true });
  const state = await controller.refresh();
  assert.equal(state.phase, 'owned');
  assert.equal(state.canCheckout, false);
  assert.equal(state.canDownload, true);
  await assert.rejects(controller.checkout.createOrder(), error => error?.code === 'already_owned');
  const grant = await controller.requestDownload();
  assert.equal(grant.download.kind, 'signed-url');
  assert.deepEqual(calls, ['offer', 'entitlement', 'download'], 'an owner must not create another payment order');
}

{
  const { client, calls } = makeClient({ authenticated: true, owned: false });
  const states = [];
  const controller = createLostSizzlerPaywallController({
    purchaseClient: client,
    checkoutEnabled: true,
    onStateChange: state => states.push(state),
  });
  let state = await controller.refresh();
  assert.equal(state.phase, 'available');
  assert.equal(state.canCheckout, true);
  assert.equal(state.canDownload, false);

  const orderId = await controller.checkout.createOrder();
  assert.equal(orderId, 'PAYPAL-ORDER-123');
  assert.equal(controller.state.phase, 'checkout-pending');
  await assert.rejects(
    controller.checkout.approve('OTHER-ORDER'),
    error => error?.code === 'provider_order_mismatch',
  );
  assert.equal(calls.includes('capture:OTHER-ORDER'), false, 'provider order mismatch must fail before capture');

  const confirmed = await controller.checkout.approve(orderId);
  assert.equal(confirmed.entitlement.owned, true);
  state = controller.state;
  assert.equal(state.phase, 'owned');
  assert.equal(state.canDownload, true);
  assert.equal(state.canCheckout, false);
  assert.deepEqual(calls, ['offer', 'entitlement', 'create-order', 'capture:PAYPAL-ORDER-123']);
  assert.ok(states.some(row => row.phase === 'checkout-pending'));
  assert.ok(states.some(row => row.phase === 'owned'));
}

{
  const { client } = makeClient({ authenticated: true, owned: false });
  const controller = createLostSizzlerPaywallController({ purchaseClient: client, checkoutEnabled: true });
  await controller.refresh();
  await controller.checkout.createOrder();
  const cancelled = controller.cancelProviderOrder();
  assert.equal(cancelled.phase, 'available');
  await assert.rejects(
    controller.checkout.approve('PAYPAL-ORDER-123'),
    error => error?.code === 'provider_order_mismatch',
    'cancelled orders must not remain capturable through stale browser state',
  );
}

{
  const malformed = makeClient().client;
  malformed.getOffer = async () => ({
    commerce_available: true,
    requires_account: true,
    product: {
      product_slug: 'the-lost-sizzler-full-game',
      currency: 'USD',
      price_minor: 199,
      permanent: true,
      includes_all_updates: true,
    },
  });
  const controller = createLostSizzlerPaywallController({ purchaseClient: malformed });
  await assert.rejects(controller.refresh(), error => error?.code === 'offer_unavailable');
  assert.equal(controller.state.phase, 'error');
}

console.log('C64 Dungeon Carnage browser paywall controller contract passed: checkout is disabled by default, account ownership is authoritative, permanent owners cannot be charged twice, provider order IDs are bound to the server-created order, stale/cancelled approval fails closed, and re-download remains owner-only.');
