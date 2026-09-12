import { createLostSizzlerPayPalButtonsRenderer } from './lost-sizzler-paypal-buttons-renderer.mjs';
import { createLostSizzlerPayPalSdkLoader } from './lost-sizzler-paypal-sdk-loader.mjs';

export function createLostSizzlerPayPalCheckoutAdapter({
  document,
  clientId,
  currency = 'GBP',
  intent = 'capture',
  namespace = 'paypal',
  timeoutMs = 15000,
  mount,
  onError = () => {},
  style = Object.freeze({ layout: 'vertical', shape: 'rect', label: 'paypal' }),
} = {}) {
  const loader = createLostSizzlerPayPalSdkLoader({
    document,
    clientId,
    currency,
    intent,
    namespace,
    timeoutMs,
  });

  let destroyed = false;
  let renderer = null;
  let rendererPromise = null;
  let checkoutStarting = false;

  function ensureActive() {
    if (destroyed) throw new Error('C64 Dungeon Carnage PayPal checkout adapter has been destroyed.');
  }

  async function getRenderer() {
    ensureActive();
    if (renderer) return renderer;
    if (rendererPromise) return rendererPromise;

    rendererPromise = (async () => {
      const paypal = await loader.load();
      ensureActive();
      const created = createLostSizzlerPayPalButtonsRenderer({ paypal, mount, onError, style });
      if (destroyed) {
        await created.destroy();
        throw new Error('C64 Dungeon Carnage PayPal checkout adapter has been destroyed.');
      }
      renderer = created;
      return created;
    })();

    try {
      return await rendererPromise;
    } finally {
      rendererPromise = null;
    }
  }

  async function onCheckoutRequested(checkoutBridge) {
    ensureActive();
    if (checkoutStarting) throw new Error('C64 Dungeon Carnage PayPal checkout is already starting.');
    checkoutStarting = true;
    try {
      const activeRenderer = await getRenderer();
      ensureActive();
      return await activeRenderer.onCheckoutRequested(checkoutBridge);
    } finally {
      checkoutStarting = false;
    }
  }

  async function destroy() {
    if (destroyed) return;
    destroyed = true;
    const pending = rendererPromise;
    if (pending) {
      try { await pending; } catch {}
    }
    const activeRenderer = renderer;
    renderer = null;
    if (activeRenderer) await activeRenderer.destroy();
  }

  return Object.freeze({
    source: loader.source,
    onCheckoutRequested,
    destroy,
  });
}
