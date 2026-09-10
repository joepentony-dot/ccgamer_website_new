import assert from 'node:assert/strict';
import http from 'node:http';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import { createLostSizzlerRealtimeWebSocketTransport } from '../src/lost-sizzler-realtime-ws.mjs';
import { createLostSizzlerRealtimeSupabaseAdapter } from '../client/lost-sizzler-realtime-supabase-adapter.mjs';

const BROWSER_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const NETWORK_SOURCE_URL = new URL('../../../arcade/lost-sizzler/js/network.js', import.meta.url);
const networkSource = await readFile(fileURLToPath(NETWORK_SOURCE_URL), 'utf8');

class BrowserLikeWebSocket extends WebSocket {
  constructor(url) {
    super(url, { origin: BROWSER_ORIGIN });
  }
}

function waitFor(check, label, timeoutMs = 4_000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      let value;
      try {
        value = check();
      } catch (error) {
        reject(error);
        return;
      }
      if (value) {
        resolve(value);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error(`Timed out waiting for ${label}.`));
        return;
      }
      setTimeout(tick, 10);
    };
    tick();
  });
}

function createNetwork(adapter, callbacks = {}) {
  const sandbox = {
    console,
    crypto: webcrypto,
    location: { hostname: 'www.cheekycommodoregamer.co.uk' },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Promise,
    Uint8Array,
    Map,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Math,
    RegExp,
    Error,
    encodeURIComponent,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.CCG_CONFIG = { maxPlayers: 4 };
  sandbox.ccgSupabase = Object.freeze({
    getClient: async () => adapter,
  });
  sandbox.document = {
    // Prevent the unrelated live-join patch loader footer from injecting a script.
    querySelector(selector) {
      if (selector === 'script[data-ccg-v141-live-join-presence="true"]') return { dataset: {} };
      return null;
    },
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(networkSource, context, { filename: 'arcade/lost-sizzler/js/network.js' });
  assert.equal(typeof context.CCGNetwork?.RoomNetwork, 'function');
  return new context.CCGNetwork.RoomNetwork(callbacks);
}

const server = http.createServer((_request, response) => {
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('not found\n');
});
const transport = createLostSizzlerRealtimeWebSocketTransport({
  allowedOrigins: new Set([BROWSER_ORIGIN]),
  pingIntervalMs: 1_000,
});
transport.attach(server);
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
assert.ok(address && typeof address === 'object');
const baseUrl = `http://127.0.0.1:${address.port}`;

const hostAdapter = createLostSizzlerRealtimeSupabaseAdapter({
  baseUrl,
  WebSocketImpl: BrowserLikeWebSocket,
  timeoutMs: 2_000,
});
const peerAdapter = createLostSizzlerRealtimeSupabaseAdapter({
  baseUrl,
  WebSocketImpl: BrowserLikeWebSocket,
  timeoutMs: 2_000,
});

const hostPackets = [];
const peerPackets = [];
const hostConnections = [];
const peerConnections = [];
const hostMemberSnapshots = [];
const peerMemberSnapshots = [];

const host = createNetwork(hostAdapter, {
  onPacket: (event, payload) => hostPackets.push({ event, payload }),
  onConnection: (connected, detail) => hostConnections.push({ connected, detail }),
  onMembers: (members, isHost) => hostMemberSnapshots.push({ count: members.length, isHost }),
});
const peer = createNetwork(peerAdapter, {
  onPacket: (event, payload) => peerPackets.push({ event, payload }),
  onConnection: (connected, detail) => peerConnections.push({ connected, detail }),
  onMembers: (members, isHost) => peerMemberSnapshots.push({ count: members.length, isHost }),
});

assert.equal(transport.diagnostics().socketCount, 0, 'Loading the unchanged game network module must not open a socket.');
assert.equal(host.connected, false);
assert.equal(peer.connected, false);

const created = await host.createOnlineRoom('NET42', 'Network Host', { mode: 'horde-survivor' });
assert.equal(created.code, 'NET42');
assert.equal(created.transport, 'supabase', 'Compatibility facade must preserve the current RoomNetwork transport branch until deliberate cut-over.');
assert.equal(created.roomMode.id, 'horde-survivor');
assert.equal(host.connected, true);
assert.equal(host.isHost, true);
assert.equal(host.getMembers().length, 1);
assert.equal(host.getHostRuntimePresence().started, false);

const joined = await peer.joinExistingRoom('NET42', 'Network Peer');
assert.equal(joined.code, 'NET42');
assert.equal(joined.transport, 'supabase');
assert.equal(joined.roomMode.id, 'horde-survivor', 'Joining client must adopt the host/server room mode rather than its dungeon default.');
assert.equal(peer.connected, true);
assert.equal(peer.isHost, false);

await waitFor(() => host.getMembers().length === 2, 'host member sync');
await waitFor(() => peer.getMembers().length === 2, 'peer member sync');
assert.equal(host.getRoomMode().id, 'horde-survivor');
assert.equal(peer.getRoomMode().id, 'horde-survivor');
assert.equal(host.getCapacity(), 4);
assert.equal(peer.getCapacity(), 4);
assert.equal(host.getMembers()[0].id, host.sessionId);
assert.equal(peer.getMembers()[0].id, host.sessionId);
assert.equal(hostMemberSnapshots.some((snapshot) => snapshot.count === 2 && snapshot.isHost), true);
assert.equal(peerMemberSnapshots.some((snapshot) => snapshot.count === 2 && !snapshot.isHost), true);
assert.equal(hostConnections.some((entry) => entry.connected === true), true);
assert.equal(peerConnections.some((entry) => entry.connected === true), true);

await host.setRuntimePresence(true, { seed: 7777, floor: 3, mode: 'horde-survivor' });
await waitFor(() => peer.getHostRuntimePresence().started === true, 'peer host runtime presence');
assert.equal(peer.getHostRuntimePresence().hostId, host.sessionId);
assert.equal(peer.getHostRuntimePresence().startMeta.seed, 7777);
assert.equal(peer.getHostRuntimePresence().startMeta.floor, 3);

const hostInboundBeforeHostSend = hostPackets.length;
const peerInboundBeforeHostSend = peerPackets.length;
await host.sendRequired('runtime:start', { seed: 7777, floor: 3 });
await waitFor(() => peerPackets.length === peerInboundBeforeHostSend + 1, 'host-to-peer game packet');
const hostToPeerPacket = peerPackets.at(-1);
assert.equal(hostToPeerPacket.event, 'runtime:start');
assert.equal(hostToPeerPacket.payload.seed, 7777);
assert.equal(hostToPeerPacket.payload.floor, 3);
assert.equal(hostPackets.length, hostInboundBeforeHostSend, 'broadcast-self-false must not add a host echo through unchanged RoomNetwork.');

const hostInboundBeforePeerSend = hostPackets.length;
const peerInboundBeforePeerSend = peerPackets.length;
await peer.sendRequired('player:move', { x: 9, y: 14, facing: 'left' });
await waitFor(() => hostPackets.length === hostInboundBeforePeerSend + 1, 'peer-to-host game packet');
const peerToHostPacket = hostPackets.at(-1);
assert.equal(peerToHostPacket.event, 'player:move');
assert.equal(peerToHostPacket.payload.x, 9);
assert.equal(peerToHostPacket.payload.y, 14);
assert.equal(peerPackets.length, peerInboundBeforePeerSend, 'Peer must not receive its own outbound packet.');

await host.leave();
await waitFor(() => peer.isHost === true && peer.getMembers().length === 1, 'peer host promotion through unchanged RoomNetwork');
assert.equal(peer.getMembers()[0].id, peer.sessionId);
assert.equal(peer.getHostRuntimePresence().started, false, 'Departed host runtime presence must not transfer to the promoted peer.');

const missingAdapter = createLostSizzlerRealtimeSupabaseAdapter({
  baseUrl,
  WebSocketImpl: BrowserLikeWebSocket,
  timeoutMs: 2_000,
});
const missing = createNetwork(missingAdapter);
await assert.rejects(
  missing.joinExistingRoom('MISS1', 'Missing Player'),
  /Room not found or the host is no longer online/
);
await missing.leave();

await peer.leave();
await waitFor(
  () => transport.diagnostics().roomCount === 0 && transport.diagnostics().memberCount === 0,
  'unchanged RoomNetwork room cleanup'
);
await hostAdapter.removeAllChannels();
await peerAdapter.removeAllChannels();
await missingAdapter.removeAllChannels();
await waitFor(() => transport.diagnostics().socketCount === 0, 'unchanged RoomNetwork socket cleanup');

await transport.close();
await new Promise((resolve) => server.close(resolve));

console.log('Lost Sizzler unchanged network compatibility contract passed: current RoomNetwork creates/joins CCG WebSocket rooms, adopts authoritative Horde mode, synchronizes members/runtime presence, exchanges self-excluding packets, promotes the surviving peer and fails missing-room joins without touching the live game or Supabase.');
