import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { installLostSizzlerCcgPilot } from '../client/lost-sizzler-ccg-pilot.mjs';

class PassiveWebSocket {
  static OPEN = 1;
  static instances = 0;

  constructor() {
    PassiveWebSocket.instances += 1;
  }
}

const calls = [];
const fetchImpl = async (url, options) => {
  calls.push({ url, options });
  throw new Error(`Unexpected request: ${url}`);
};

const target = {};
const pilot = installLostSizzlerCcgPilot({
  target,
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  fetchImpl,
  cryptoImpl: crypto.webcrypto,
  WebSocketImpl: PassiveWebSocket,
});

assert.equal(target.ccgSupabase, pilot.bridge);
assert.equal(pilot.bridge.__ccgBackendCompat, true);
assert.equal(calls.length, 0, 'Explicit pilot installation must still be network-passive.');
assert.equal(PassiveWebSocket.instances, 0, 'Explicit pilot installation must not open realtime.');

const client = await target.ccgSupabase.getClient();
assert.equal(typeof client.functions.invoke, 'function');
assert.equal(typeof client.channel, 'function');
assert.equal(calls.length, 0, 'Pilot getClient must remain passive.');
assert.equal(PassiveWebSocket.instances, 0, 'Pilot getClient must not create a WebSocket.');

assert.throws(
  () => installLostSizzlerCcgPilot({
    target,
    baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
    fetchImpl,
    cryptoImpl: crypto.webcrypto,
    WebSocketImpl: PassiveWebSocket,
  }),
  /ccgSupabase already installed/,
  'A pilot must not silently replace an existing online-services bridge.'
);

assert.equal(pilot.uninstall(), true);
assert.equal(Object.prototype.hasOwnProperty.call(target, 'ccgSupabase'), false);
assert.equal(pilot.uninstall(), false, 'Repeated uninstall is a no-op.');

const legacyBridge = Object.freeze({ provider: 'supabase' });
const rollbackTarget = {};
Object.defineProperty(rollbackTarget, 'ccgSupabase', {
  configurable: true,
  enumerable: false,
  writable: false,
  value: legacyBridge,
});
const before = Object.getOwnPropertyDescriptor(rollbackTarget, 'ccgSupabase');

const replacement = installLostSizzlerCcgPilot({
  target: rollbackTarget,
  replaceExisting: true,
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  fetchImpl,
  cryptoImpl: crypto.webcrypto,
  WebSocketImpl: PassiveWebSocket,
});
assert.equal(rollbackTarget.ccgSupabase, replacement.bridge);
assert.equal(replacement.uninstall(), true);
assert.equal(rollbackTarget.ccgSupabase, legacyBridge);
assert.deepEqual(
  Object.getOwnPropertyDescriptor(rollbackTarget, 'ccgSupabase'),
  before,
  'Pilot rollback must restore the exact previous bridge property descriptor.'
);
assert.equal(calls.length, 0);
assert.equal(PassiveWebSocket.instances, 0);

console.log('Lost Sizzler CCG pilot contract passed: installation is explicit and passive, existing bridges are protected by default, and rollback restores the previous ccgSupabase descriptor exactly.');
