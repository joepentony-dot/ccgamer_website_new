const PAYPAL_SDK_ORIGIN = 'https://www.paypal.com';
const PAYPAL_SDK_PATH = '/sdk/js';

function requireDocument(value) {
  if (!value || typeof value !== 'object' || typeof value.createElement !== 'function') {
    throw new Error('C64 Dungeon Carnage PayPal SDK loader requires a DOM document.');
  }
  return value;
}

function requireClientId(value) {
  const clientId = String(value || '').trim();
  if (!clientId || clientId.length > 256 || /[\s<>'"&]/.test(clientId)) {
    throw new Error('C64 Dungeon Carnage PayPal client id is invalid.');
  }
  return clientId;
}

function requireCurrency(value) {
  const currency = String(value || 'GBP').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('C64 Dungeon Carnage PayPal currency is invalid.');
  return currency;
}

function requireIntent(value) {
  const intent = String(value || 'capture').trim().toLowerCase();
  if (intent !== 'capture') throw new Error('C64 Dungeon Carnage PayPal SDK loader only supports capture intent.');
  return intent;
}

function sdkUrl({ clientId, currency, intent }) {
  const url = new URL(PAYPAL_SDK_PATH, PAYPAL_SDK_ORIGIN);
  url.searchParams.set('client-id', clientId);
  url.searchParams.set('currency', currency);
  url.searchParams.set('intent', intent);
  url.searchParams.set('components', 'buttons');
  url.searchParams.set('commit', 'true');
  return url.toString();
}

export function createLostSizzlerPayPalSdkLoader({
  document,
  clientId,
  currency = 'GBP',
  intent = 'capture',
  namespace = 'paypal',
  timeoutMs = 15000,
} = {}) {
  const doc = requireDocument(document);
  const safeClientId = requireClientId(clientId);
  const safeCurrency = requireCurrency(currency);
  const safeIntent = requireIntent(intent);
  const safeNamespace = String(namespace || 'paypal').trim();
  if (safeNamespace !== 'paypal') throw new Error('C64 Dungeon Carnage PayPal SDK namespace must remain paypal.');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    throw new Error('C64 Dungeon Carnage PayPal SDK timeout must be between 1000 and 30000 ms.');
  }

  const source = sdkUrl({ clientId: safeClientId, currency: safeCurrency, intent: safeIntent });
  let activePromise = null;

  function currentProvider() {
    const provider = doc.defaultView?.[safeNamespace];
    return provider && typeof provider.Buttons === 'function' ? provider : null;
  }

  function findExistingScript() {
    const scripts = typeof doc.querySelectorAll === 'function' ? [...doc.querySelectorAll('script[src]')] : [];
    return scripts.find((script) => {
      try {
        const url = new URL(script.src, doc.baseURI || PAYPAL_SDK_ORIGIN);
        return url.origin === PAYPAL_SDK_ORIGIN && url.pathname === PAYPAL_SDK_PATH;
      } catch {
        return false;
      }
    }) || null;
  }

  async function load() {
    const existingProvider = currentProvider();
    if (existingProvider) return existingProvider;
    if (activePromise) return activePromise;

    activePromise = new Promise((resolve, reject) => {
      const existingScript = findExistingScript();
      if (existingScript && existingScript.src !== source) {
        activePromise = null;
        reject(new Error('A different PayPal SDK configuration is already present.'));
        return;
      }

      const script = existingScript || doc.createElement('script');
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        script.removeEventListener?.('load', onLoad);
        script.removeEventListener?.('error', onError);
        activePromise = null;
        if (error) reject(error);
        else resolve(currentProvider());
      };
      const onLoad = () => {
        const provider = currentProvider();
        if (!provider) finish(new Error('PayPal SDK loaded without a Buttons provider.'));
        else finish();
      };
      const onError = () => finish(new Error('PayPal SDK failed to load.'));
      const timer = setTimeout(() => finish(new Error('PayPal SDK load timed out.')), timeoutMs);

      script.addEventListener?.('load', onLoad, { once: true });
      script.addEventListener?.('error', onError, { once: true });
      if (!existingScript) {
        script.src = source;
        script.async = true;
        script.dataset.ccgDungeonCarnagePayPal = 'sdk';
        const parent = doc.head || doc.documentElement;
        if (!parent || typeof parent.appendChild !== 'function') {
          finish(new Error('C64 Dungeon Carnage PayPal SDK loader cannot append the provider script.'));
          return;
        }
        parent.appendChild(script);
      }
    });

    return activePromise;
  }

  return Object.freeze({ source, load });
}
