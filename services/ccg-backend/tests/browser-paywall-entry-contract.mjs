import assert from 'node:assert/strict';
import { mountLostSizzlerPaywallEntry } from '../client/lost-sizzler-paywall-entry.mjs';

function fakeDocument(root = {}) {
  return {
    querySelector(selector) {
      return selector === '#ccg-dungeon-carnage-paywall' ? root : null;
    },
  };
}

let factoryCalls = 0;
const disabled = mountLostSizzlerPaywallEntry({
  config: undefined,
  bootstrapFactory() {
    factoryCalls += 1;
    throw new Error('disabled entry must not construct a bootstrap');
  },
});
assert.equal(disabled.enabled, false);
assert.equal(disabled.mounted, false);
assert.equal(disabled.reason, 'disabled');
assert.equal(factoryCalls, 0);

const explicitlyDisabled = mountLostSizzlerPaywallEntry({
  config: { enabled: false },
  bootstrapFactory() {
    factoryCalls += 1;
    throw new Error('explicitly disabled entry must not construct a bootstrap');
  },
});
assert.equal(explicitlyDisabled.mounted, false);
assert.equal(factoryCalls, 0);

const noOp = () => {};
const token = async () => 'token';
const grant = () => {};

assert.throws(
  () => mountLostSizzlerPaywallEntry({
    config: { enabled: true, baseUrl: 'http://commerce.example.test', getAccessToken: token, onDownloadGrant: grant },
    documentRef: fakeDocument(),
  }),
  /credential-free HTTPS URL/,
);

assert.throws(
  () => mountLostSizzlerPaywallEntry({
    config: { enabled: true, baseUrl: 'https://user:pass@commerce.example.test', getAccessToken: token, onDownloadGrant: grant },
    documentRef: fakeDocument(),
  }),
  /credential-free HTTPS URL/,
);

assert.throws(
  () => mountLostSizzlerPaywallEntry({
    config: { enabled: true, baseUrl: 'https://commerce.example.test/#fragment', getAccessToken: token, onDownloadGrant: grant },
    documentRef: fakeDocument(),
  }),
  /credential-free HTTPS URL/,
);

assert.throws(
  () => mountLostSizzlerPaywallEntry({
    config: { enabled: true, baseUrl: 'https://commerce.example.test', onDownloadGrant: grant },
    documentRef: fakeDocument(),
  }),
  /getAccessToken must be a function/,
);

assert.throws(
  () => mountLostSizzlerPaywallEntry({
    config: { enabled: true, baseUrl: 'https://commerce.example.test', getAccessToken: token },
    documentRef: fakeDocument(),
  }),
  /onDownloadGrant must be a function/,
);

assert.throws(
  () => mountLostSizzlerPaywallEntry({
    config: {
      enabled: true,
      baseUrl: 'https://commerce.example.test',
      getAccessToken: token,
      onDownloadGrant: grant,
      checkoutEnabled: true,
    },
    documentRef: fakeDocument(),
  }),
  /cannot be enabled without an explicit provider renderer callback/,
);

assert.throws(
  () => mountLostSizzlerPaywallEntry({
    config: {
      enabled: true,
      baseUrl: 'https://commerce.example.test',
      getAccessToken: token,
      onDownloadGrant: grant,
      rootSelector: '#some-other-root',
    },
    documentRef: fakeDocument(),
  }),
  /root selector must remain #ccg-dungeon-carnage-paywall/,
);

assert.throws(
  () => mountLostSizzlerPaywallEntry({
    config: { enabled: true, baseUrl: 'https://commerce.example.test', getAccessToken: token, onDownloadGrant: grant },
    documentRef: { querySelector() { return null; } },
  }),
  /paywall root is not present/,
);

const root = {};
let capturedOptions = null;
let startCalls = 0;
let refreshCalls = 0;
let destroyCalls = 0;
const bootstrap = {
  start() { startCalls += 1; return Promise.resolve('started'); },
  refresh() { refreshCalls += 1; return Promise.resolve('refreshed'); },
  destroy() { destroyCalls += 1; },
};
const checkoutRenderer = () => {};
const fetchImpl = async () => { throw new Error('entry construction must not fetch'); };

const mounted = mountLostSizzlerPaywallEntry({
  config: {
    enabled: true,
    baseUrl: 'https://commerce.example.test/',
    getAccessToken: token,
    onDownloadGrant: grant,
    onStateChange: noOp,
    onError: noOp,
    checkoutEnabled: false,
  },
  documentRef: fakeDocument(root),
  fetchImpl,
  now: () => 123,
  bootstrapFactory(options) {
    factoryCalls += 1;
    capturedOptions = options;
    return bootstrap;
  },
});

assert.equal(mounted.enabled, true);
assert.equal(mounted.mounted, true);
assert.equal(mounted.checkoutEnabled, false);
assert.equal(factoryCalls, 1);
assert.equal(startCalls, 0, 'mounting the entry must not start commerce requests');
assert.equal(refreshCalls, 0);
assert.equal(capturedOptions.baseUrl, 'https://commerce.example.test');
assert.equal(capturedOptions.root, root);
assert.equal(capturedOptions.checkoutEnabled, false);
assert.equal(capturedOptions.onCheckoutRequested, null);
assert.equal(capturedOptions.signInPath, '/auth/login.html?returnTo=%2Farcade%2Flost-sizzler%2F');
assert.equal(capturedOptions.fetchImpl, fetchImpl);
assert.equal(capturedOptions.now(), 123);

assert.equal(await mounted.start(), 'started');
assert.equal(startCalls, 1);
assert.equal(await mounted.refresh(), 'refreshed');
assert.equal(refreshCalls, 1);
mounted.destroy();
assert.equal(destroyCalls, 1);

let enabledOptions = null;
const enabled = mountLostSizzlerPaywallEntry({
  config: {
    enabled: true,
    baseUrl: 'https://commerce.example.test',
    getAccessToken: token,
    onDownloadGrant: grant,
    checkoutEnabled: true,
    onCheckoutRequested: checkoutRenderer,
  },
  documentRef: fakeDocument(root),
  bootstrapFactory(options) {
    enabledOptions = options;
    return bootstrap;
  },
});
assert.equal(enabled.checkoutEnabled, true);
assert.equal(enabledOptions.onCheckoutRequested, checkoutRenderer);

assert.throws(
  () => mountLostSizzlerPaywallEntry({
    config: { enabled: true, baseUrl: 'https://commerce.example.test', getAccessToken: token, onDownloadGrant: grant },
    documentRef: fakeDocument(root),
    bootstrapFactory() { return {}; },
  }),
  /bootstrap factory returned an invalid boundary/,
);

console.log('C64 Dungeon Carnage browser paywall entry contract passed.');
