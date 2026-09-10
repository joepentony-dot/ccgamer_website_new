import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import { createLostSizzlerRealtimeWebSocketTransport } from '../src/lost-sizzler-realtime-ws.mjs';
import { createLostSizzlerRealtimeSupabaseAdapter } from '../client/lost-sizzler-realtime-supabase-adapter.mjs';

function waitFor(check, label, timeoutMs = 2_000) {
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

function roomSnapshot({
  roomCode = 'TEST1',
  hostId = 'HOSTPRES01',
  peerId = null,
  runtimeStarted = false,
  runtimeStartMeta = null,
} = {}) {
  const members = [{
    id: hostId,
    name: 'Host Player',
    joinedAt: 1,
    roomRole: 'create',
    roomMode: 'dungeon',
    roomCapacity: 4,
    build: 'V10.41',
    runtimeStarted,
    runtimeStartMeta,
  }];
  if (peerId) members.push({
    id: peerId,
    name: 'Peer Player',
    joinedAt: 2,
    roomRole: 'join',
    roomMode: 'dungeon',
    roomCapacity: 4,
    build: 'V10.41',
    runtimeStarted: false,
    runtimeStartMeta: null,
  });
  return {
    roomCode,
    roomMode: 'dungeon',
    roomCapacity: 4,
    memberCount: members.length,
    hostId,
    runtime: { started: runtimeStarted, startMeta: runtimeStartMeta, hostId },
    members,
  };
}

const fake = {
  factoryCalls: 0,
  connectCalls: 0,
  createCalls: [],
  joinCalls: [],
  presenceCalls: [],
  packetCalls: [],
  leaveCalls: 0,
  disconnectCalls: 0,
  callbacks: null,
  room: null,
};

function fakeRealtimeFactory(options) {
  fake.factoryCalls += 1;
  fake.callbacks = options;
  return {
    async connect() {
      fake.connectCalls += 1;
      options.onConnection?.(true, 'connected');
      return { ok: true, kind: 'success', sessionId: 'transport_session_1', protocol: 'ccg-lost-sizzler-realtime-v1' };
    },
    async createRoom(input) {
      fake.createCalls.push(structuredClone(input));
      fake.room = roomSnapshot({ roomCode: input.roomCode, hostId: input.presenceId });
      options.onRoom?.(structuredClone(fake.room), 'created');
      return { ok: true, kind: 'success', room: structuredClone(fake.room) };
    },
    async joinRoom(input) {
      fake.joinCalls.push(structuredClone(input));
      fake.room = roomSnapshot({ roomCode: input.roomCode, hostId: 'HOSTPRES01', peerId: input.presenceId });
      options.onRoom?.(structuredClone(fake.room), 'joined');
      return { ok: true, kind: 'success', room: structuredClone(fake.room) };
    },
    async updatePresence(input) {
      fake.presenceCalls.push(structuredClone(input));
      if (!fake.room) return { ok: false, kind: 'not_found', error: 'member_not_found', status: 404 };
      const selfId = fake.createCalls.at(-1)?.presenceId || fake.joinCalls.at(-1)?.presenceId;
      fake.room = structuredClone(fake.room);
      const member = fake.room.members.find((entry) => entry.id === selfId);
      if (member) {
        member.name = input.name ?? member.name;
        member.runtimeStarted = Boolean(input.runtimeStarted);
        member.runtimeStartMeta = member.runtimeStarted ? structuredClone(input.runtimeStartMeta) : null;
      }
      if (fake.room.hostId === selfId) {
        fake.room.runtime = {
          started: Boolean(input.runtimeStarted),
          startMeta: input.runtimeStarted ? structuredClone(input.runtimeStartMeta) : null,
          hostId: selfId,
        };
      }
      options.onRoom?.(structuredClone(fake.room), 'presence');
      return { ok: true, kind: 'success', room: structuredClone(fake.room) };
    },
    async sendPacket(event, payload) {
      fake.packetCalls.push({ event, payload: structuredClone(payload) });
      return { ok: true, kind: 'success' };
    },
    async leave() {
      fake.leaveCalls += 1;
      fake.room = null;
      return { ok: true, kind: 'success' };
    },
    disconnect() {
      fake.disconnectCalls += 1;
      options.onConnection?.(false, 'disconnected');
    },
  };
}

const adapter = createLostSizzlerRealtimeSupabaseAdapter({
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  WebSocketImpl: class NeverConstructed {},
  timeoutMs: 1_000,
  realtimeFactory: fakeRealtimeFactory,
});
assert.equal(fake.factoryCalls, 0, 'Constructing the compatibility adapter must not create a realtime client.');
assert.deepEqual(adapter.getDiagnostics(), { channelCount: 0 });

const unitChannel = adapter.channel('ccg-quest:test1', {
  config: {
    private: false,
    presence: { key: 'HOSTPRES01' },
    broadcast: { self: false, ack: true },
  },
});
assert.equal(fake.factoryCalls, 0, 'Creating a channel must remain network-passive.');
assert.equal(unitChannel.presenceState().HOSTPRES01, undefined);

const presenceEvents = [];
const broadcastEvents = [];
unitChannel
  .on('presence', { event: 'sync' }, () => presenceEvents.push('sync'))
  .on('presence', { event: 'join' }, () => presenceEvents.push('join'))
  .on('presence', { event: 'leave' }, () => presenceEvents.push('leave'))
  .on('broadcast', { event: 'ccg_packet' }, (message) => broadcastEvents.push(message));

const statuses = [];
unitChannel.subscribe((status) => statuses.push(status));
await waitFor(() => statuses.includes('SUBSCRIBED'), 'fake adapter subscription');
assert.equal(fake.factoryCalls, 1);
assert.equal(fake.connectCalls, 1);
assert.equal(unitChannel.getDiagnostics().joined, false);

const tracked = await unitChannel.track({
  id: 'HOSTPRES01',
  name: 'Host Player',
  joinedAt: 123,
  roomRole: 'create',
  roomMode: 'dungeon',
  roomCapacity: 4,
  build: 'V10.41',
  runtimeStarted: false,
  runtimeStartMeta: null,
});
assert.equal(tracked, 'ok');
assert.deepEqual(fake.createCalls[0], {
  roomCode: 'TEST1',
  presenceId: 'HOSTPRES01',
  name: 'Host Player',
  mode: 'dungeon',
  build: 'V10.41',
});
assert.equal('sessionId' in fake.createCalls[0], false, 'Compatibility presence IDs must never become client-selected transport sessions.');
assert.equal(fake.presenceCalls.length, 1);
assert.equal(unitChannel.presenceState().HOSTPRES01[0].id, 'HOSTPRES01');
assert.equal(unitChannel.presenceState().HOSTPRES01[0].roomRole, 'create');
assert.equal(presenceEvents.includes('sync'), true);
assert.equal(presenceEvents.includes('join'), true);

await unitChannel.track({
  id: 'HOSTPRES01',
  name: 'Renamed Host',
  roomRole: 'create',
  roomMode: 'dungeon',
  build: 'V10.41',
  runtimeStarted: true,
  runtimeStartMeta: { seed: 44, floor: 2 },
});
assert.equal(fake.createCalls.length, 1, 'Repeated track must update presence rather than create a second room.');
assert.equal(fake.presenceCalls.length, 2);
assert.equal(unitChannel.presenceState().HOSTPRES01[0].runtimeStarted, true);
assert.deepEqual(unitChannel.presenceState().HOSTPRES01[0].runtimeStartMeta, { seed: 44, floor: 2 });

fake.callbacks.onRoom?.(roomSnapshot({ roomCode: 'TEST1', hostId: 'HOSTPRES01', peerId: 'PEERPRES01' }), 'joined');
assert.deepEqual(Object.keys(unitChannel.presenceState()), ['HOSTPRES01', 'PEERPRES01']);
assert.equal(presenceEvents.at(-1), 'join');

fake.callbacks.onPacket?.('player:move', { x: 7, y: 9 }, 'PEERPRES01');
assert.deepEqual(broadcastEvents.at(-1), {
  payload: { event: 'player:move', payload: { x: 7, y: 9 } },
});

assert.equal(await unitChannel.send({
  type: 'broadcast',
  event: 'ccg_packet',
  payload: { event: 'player:fire', payload: { projectile: 3 } },
}), 'ok');
assert.deepEqual(fake.packetCalls.at(-1), { event: 'player:fire', payload: { projectile: 3 } });
assert.equal(await unitChannel.send({ type: 'broadcast', event: 'other', payload: {} }), 'error');

await assert.rejects(
  unitChannel.track({
    id: 'DIFFERENT01',
    name: 'Wrong Identity',
    roomRole: 'create',
    roomMode: 'dungeon',
  }),
  /presence_key_mismatch/
);

fake.callbacks.onRoom?.(roomSnapshot({ roomCode: 'TEST1', hostId: 'HOSTPRES01' }), 'disconnected');
assert.equal(presenceEvents.at(-1), 'leave');
assert.equal(await unitChannel.untrack(), 'ok');
assert.equal(fake.leaveCalls, 1);
assert.equal(await adapter.removeChannel(unitChannel), 'ok');
assert.equal(fake.disconnectCalls, 1);
assert.deepEqual(adapter.getDiagnostics(), { channelCount: 0 });

assert.throws(() => adapter.channel('wrong-prefix:ABCD'), /invalid_channel_name/);
assert.throws(() => adapter.channel('ccg-quest:xx'), /invalid_room_code/);

// Real non-production provider proof: run two Supabase-shaped facades over the CCG WebSocket transport.
const BROWSER_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
class BrowserLikeWebSocket extends WebSocket {
  constructor(url) {
    super(url, { origin: BROWSER_ORIGIN });
  }
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

const hostAdapter = createLostSizzlerRealtimeSupabaseAdapter({ baseUrl, WebSocketImpl: BrowserLikeWebSocket, timeoutMs: 2_000 });
const peerAdapter = createLostSizzlerRealtimeSupabaseAdapter({ baseUrl, WebSocketImpl: BrowserLikeWebSocket, timeoutMs: 2_000 });
const hostId = 'HOSTGAME01';
const peerId = 'PEERGAME01';
const hostChannel = hostAdapter.channel('ccg-quest:LIVE1', { config: { presence: { key: hostId }, broadcast: { self: false, ack: true } } });
const peerChannel = peerAdapter.channel('ccg-quest:LIVE1', { config: { presence: { key: peerId }, broadcast: { self: false, ack: true } } });

let hostSyncs = 0;
let peerSyncs = 0;
let peerLeaves = 0;
const peerPackets = [];
hostChannel.on('presence', { event: 'sync' }, () => { hostSyncs += 1; });
peerChannel
  .on('presence', { event: 'sync' }, () => { peerSyncs += 1; })
  .on('presence', { event: 'leave' }, () => { peerLeaves += 1; })
  .on('broadcast', { event: 'ccg_packet' }, (message) => peerPackets.push(message));

const hostStatuses = [];
const peerStatuses = [];
hostChannel.subscribe((status) => hostStatuses.push(status));
peerChannel.subscribe((status) => peerStatuses.push(status));
await waitFor(() => hostStatuses.includes('SUBSCRIBED') && peerStatuses.includes('SUBSCRIBED'), 'real adapter subscriptions');
assert.equal(transport.diagnostics().socketCount, 2);

await hostChannel.track({
  id: hostId,
  name: 'Host Player',
  joinedAt: 100,
  roomRole: 'create',
  roomMode: 'horde-survivor',
  roomCapacity: 4,
  build: 'V10.41',
  runtimeStarted: false,
  runtimeStartMeta: null,
});
await peerChannel.track({
  id: peerId,
  name: 'Peer Player',
  joinedAt: 200,
  roomRole: 'join',
  roomMode: 'dungeon',
  roomCapacity: 4,
  build: 'V10.41',
  runtimeStarted: false,
  runtimeStartMeta: null,
});

await waitFor(() => Object.keys(hostChannel.presenceState()).length === 2, 'host two-member presence');
await waitFor(() => Object.keys(peerChannel.presenceState()).length === 2, 'peer two-member presence');
assert.deepEqual(Object.keys(hostChannel.presenceState()), [hostId, peerId]);
assert.equal(peerChannel.presenceState()[peerId][0].roomMode, 'horde-survivor', 'Joining client must receive authoritative room mode.');
assert.equal(hostSyncs > 0, true);
assert.equal(peerSyncs > 0, true);

assert.equal(await hostChannel.send({
  type: 'broadcast',
  event: 'ccg_packet',
  payload: { event: 'hello', payload: { id: hostId, roomMode: 'horde-survivor' } },
}), 'ok');
await waitFor(() => peerPackets.length === 1, 'adapter game packet delivery');
assert.deepEqual(peerPackets[0], {
  payload: { event: 'hello', payload: { id: hostId, roomMode: 'horde-survivor' } },
});

await hostChannel.track({
  id: hostId,
  name: 'Host Player',
  roomRole: 'create',
  roomMode: 'horde-survivor',
  build: 'V10.41',
  runtimeStarted: true,
  runtimeStartMeta: { seed: 8080, floor: 3 },
});
await waitFor(
  () => peerChannel.presenceState()[hostId]?.[0]?.runtimeStarted === true,
  'runtime presence through adapter'
);
assert.deepEqual(peerChannel.presenceState()[hostId][0].runtimeStartMeta, { seed: 8080, floor: 3 });

await hostChannel.untrack();
await hostAdapter.removeChannel(hostChannel);
await waitFor(() => Object.keys(peerChannel.presenceState()).length === 1, 'peer presence after host leave');
assert.deepEqual(Object.keys(peerChannel.presenceState()), [peerId]);
assert.equal(peerLeaves > 0, true);

await peerChannel.untrack();
await peerAdapter.removeChannel(peerChannel);
await waitFor(() => transport.diagnostics().roomCount === 0 && transport.diagnostics().socketCount === 0, 'adapter transport cleanup');

await transport.close();
await new Promise((resolve) => server.close(resolve));

console.log('Lost Sizzler realtime compatibility adapter contract passed: the Supabase-shaped facade stays passive until subscribe, preserves legacy presence IDs and room semantics, and drives the real CCG WebSocket transport without changing live network.js or using Supabase.');
