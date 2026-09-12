import assert from 'node:assert/strict';
import test from 'node:test';
import { createLostSizzlerPayPalSdkLoader } from '../client/lost-sizzler-paypal-sdk-loader.mjs';

function createDocument() {
  const scripts = [];
  const view = {};
  const head = {
    appendChild(script) {
      scripts.push(script);
      queueMicrotask(() => {
        view.paypal = { Buttons() {} };
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
  return {
    defaultView: view,
    head,
    documentElement: head,
    baseURI: 'https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/',
    createElement(tag) { assert.equal(tag, 'script'); return createScript(); },
    querySelectorAll(selector) { assert.equal(selector, 'script[src]'); return scripts; },
    scripts,
  };
}

test('loader stays passive until load() is called and builds a fixed PayPal Buttons URL', async () => {
  const document = createDocument();
  const loader = createLostSizzlerPayPalSdkLoader({ document, clientId: 'public-client-id', currency: 'gbp' });
  assert.equal(document.scripts.length, 0);
  const url = new URL(loader.source);
  assert.equal(url.origin, 'https://www.paypal.com');
  assert.equal(url.pathname, '/sdk/js');
  assert.equal(url.searchParams.get('client-id'), 'public-client-id');
  assert.equal(url.searchParams.get('currency'), 'GBP');
  assert.equal(url.searchParams.get('intent'), 'capture');
  assert.equal(url.searchParams.get('components'), 'buttons');
  const provider = await loader.load();
  assert.equal(document.scripts.length, 1);
  assert.equal(typeof provider.Buttons, 'function');
});

test('loader reuses an already-loaded provider without injecting a script', async () => {
  const document = createDocument();
  const paypal = { Buttons() {} };
  document.defaultView.paypal = paypal;
  const loader = createLostSizzlerPayPalSdkLoader({ document, clientId: 'public-client-id' });
  assert.equal(await loader.load(), paypal);
  assert.equal(document.scripts.length, 0);
});

test('loader rejects unsafe or unsupported configuration before provider access', () => {
  const document = createDocument();
  assert.throws(() => createLostSizzlerPayPalSdkLoader({ document, clientId: '' }), /client id/i);
  assert.throws(() => createLostSizzlerPayPalSdkLoader({ document, clientId: 'bad&id' }), /client id/i);
  assert.throws(() => createLostSizzlerPayPalSdkLoader({ document, clientId: 'ok', currency: 'GB' }), /currency/i);
  assert.throws(() => createLostSizzlerPayPalSdkLoader({ document, clientId: 'ok', intent: 'authorize' }), /capture intent/i);
  assert.throws(() => createLostSizzlerPayPalSdkLoader({ document, clientId: 'ok', namespace: 'other' }), /namespace/i);
});

test('loader refuses conflicting existing PayPal SDK configuration', async () => {
  const document = createDocument();
  const conflicting = document.createElement('script');
  conflicting.src = 'https://www.paypal.com/sdk/js?client-id=another-client&currency=USD&components=buttons';
  document.scripts.push(conflicting);
  const loader = createLostSizzlerPayPalSdkLoader({ document, clientId: 'public-client-id' });
  await assert.rejects(loader.load(), /different PayPal SDK configuration/i);
  assert.equal(document.scripts.length, 1);
});
