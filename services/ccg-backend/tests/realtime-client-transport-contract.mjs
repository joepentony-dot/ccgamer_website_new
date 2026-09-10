import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import { createLostSizzlerRealtimeWebSocketTransport } from '../src/lost-sizzler-realtime-ws.mjs';
import { createLostSizzlerRealtimeClient } from '../client/lost-sizzler-realtime.mjs';

const BROWSER_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const HOST_PRESENCE_ID = 'legacyHost01';
const PEER_PRESENCE_ID = 'legacyPeer01';

class BrowserLikeWebSocket extends WebSocket {
  constructor(url) {
    super(url, { origin: BROWSER_ORIGIN });
  }
}

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

const hostRooms = [];
const peerRooms = [];
const hostPackets = [];
const peerPackets = [];

const host = createLostSizzlerRealtimeClient({
  baseUrl,
  WebSocketImpl: BrowserLikeWebSocket,
  timeoutMs: 2_000,
  onRoom: (room, reason) => hostRooms.push({ room, reason }),
  onPacket: (event, payload, senderId) => hostPackets.push({ event, payload, senderId }),
});
const peer = createLostSizzlerRealtimeClient({
  baseUrl,
  WebSocketImpl: BrowserLikeWebSocket,
  timeoutMs: 2_000,
  onRoom: (room, reason) => peerRooms.push({ room, reason }),
  onPacket: (event, payload, senderId) => peerPackets.push({ event, payload, senderId }),
});

assert.equal(transport.diagnostics().socketCount, 0);
assert.equal(host.getState().connected, false);
assert.equal(peer.getState().connected, false);

const hostConnected = await host.connect();
assert.equal(hostConnected.ok, true);
assert.match(hostConnected.sessionId, /^[A-Za-z0-9_-]{16}$/);
assert.notEqual(hostConnected.sessionId, HOST_PRESENCE_ID, 'Server transport identity must remain separate from the Lost Sizzler presence ID.');
assert.equal(transport.diagnostics().socketCount, 1);

const created = await host.createRoom({
  roomCode: 'CCG42',
  presenceId: HOST_PRESENCE_ID,
  name: 'Host Player',
  mode: 'horde-survivor',
  build: 'V10.41',
});
assert.equal(created.ok, true);
assert.equal(created.room.roomCode, 'CCG42');
assert.equal(created.room.roomMode, 'horde-survivor');
assert.equal(created.room.roomCapacity, 4);
assert.equal(created.room.hostId, HOST_PRESENCE_ID);
assert.equal(created.room.members[0].id, HOST_PRESENCE_ID);
assert.equal(created.room.members.some((member) => member.id === hostConnected.sessionId), false);
assert.equal(transport.diagnostics().roomCount, 1);
assert.equal(transport.diagnostics().memberCount, 1);

const peerConnected = await peer.connect();
assert.equal(peerConnected.ok, true);
assert.notEqual(peerConnected.sessionId, hostConnected.sessionId);
assert.notEqual(peerConnected.sessionId, PEER_PRESENCE_ID);
const joined = await peer.joinRoom({
  roomCode: 'CCG42',
  presenceId: PEER_PRESENCE_ID,
  name: 'Peer Player',
  build: 'V10.41',
});
assert.equal(joined.ok, true);
assert.equal(joined.room.memberCount, 2);
assert.equal(joined.room.hostId, HOST_PRESENCE_ID);
assert.equal(joined.room.roomMode, 'horde-survivor');
assert.deepEqual(joined.room.members.map((member) => member.id), [HOST_PRESENCE_ID, PEER_PRESENCE_ID]);

await waitFor(
  () => host.getState().room?.memberCount === 2 && host.getState().room,
  'host room snapshot after peer join'
);
assert.deepEqual(host.getState().room.members.map((member) => member.id), [HOST_PRESENCE_ID, PEER_PRESENCE_ID]);
assert.equal(transport.diagnostics().socketCount, 2);
assert.equal(transport.diagnostics().memberCount, 2);

const hostPacket = await host.sendPacket('player:move', { x: 12, y: 9, facing: 'left' });
assert.deepEqual(hostPacket, { ok: true, kind: 'success' });
await waitFor(() => peerPackets.length === 1 && peerPackets[0], 'peer game packet');
assert.equal(peerPackets[0].event, 'player:move');
assert.deepEqual(peerPackets[0].payload, { x: 12, y: 9, facing: 'left' });
assert.equal(peerPackets[0].senderId, HOST_PRESENCE_ID);
assert.equal(hostPackets.length, 0, 'broadcast-self-false must not echo the packet back to the host client.');

const peerPacket = await peer.sendPacket('player:fire', { projectile: 7 });
assert.deepEqual(peerPacket, { ok: true, kind: 'success' });
await waitFor(() => hostPackets.length === 1 && hostPackets[0], 'host game packet');
assert.equal(hostPackets[0].event, 'player:fire');
assert.deepEqual(hostPackets[0].payload, { projectile: 7 });
assert.equal(hostPackets[0].senderId, PEER_PRESENCE_ID);
assert.equal(peerPackets.length, 1, 'peer must not receive its own outbound packet.');

const presence = await host.updatePresence({
  runtimeStarted: true,
  runtimeStartMeta: { seed: 9876, floor: 2 },
});
assert.equal(presence.ok, true);
assert.equal(presence.room.runtime.started, true);
assert.equal(presence.room.runtime.hostId, HOST_PRESENCE_ID);
assert.deepEqual(presence.room.runtime.startMeta, { seed: 9876, floor: 2 });
await waitFor(
  () => peer.getState().room?.runtime?.started === true && peer.getState().room,
  'peer runtime presence'
);
assert.equal(peer.getState().room.runtime.hostId, HOST_PRESENCE_ID);
assert.deepEqual(peer.getState().room.runtime.startMeta, { seed: 9876, floor: 2 });

const heartbeat = await peer.heartbeat();
assert.deepEqual(heartbeat, { ok: true, kind: 'success', roomCode: 'CCG42' });

host.disconnect();
const promoted = await waitFor(
  () => peer.getState().room?.hostId === PEER_PRESENCE_ID && peer.getState().room,
  'peer host promotion after host disconnect'
);
assert.equal(promoted.memberCount, 1);
assert.equal(promoted.runtime.hostId, PEER_PRESENCE_ID);
assert.equal(promoted.runtime.started, false, 'Departed host runtime state must not transfer to the promoted peer.');
await waitFor(() => transport.diagnostics().socketCount === 1, 'host socket cleanup');
assert.equal(transport.diagnostics().memberCount, 1);

const peerLeave = await peer.leave();
assert.deepEqual(peerLeave, { ok: true, kind: 'success' });
assert.equal(peer.getState().room, null);
await waitFor(() => transport.diagnostics().roomCount === 0, 'empty room cleanup');
assert.equal(transport.diagnostics().memberCount, 0);

peer.disconnect();
await waitFor(() => transport.diagnostics().socketCount === 0, 'peer socket cleanup');

assert.equal(hostRooms.some((entry) => entry.reason === 'joined'), true);
assert.equal(peerRooms.some((entry) => entry.reason === 'presence'), true);
assert.equal(peerRooms.some((entry) => entry.reason === 'disconnected'), true);

await transport.close();
await new Promise((resolve) => server.close(resolve));

console.log('Lost Sizzler realtime integration contract passed: the CCG browser client and WebSocket transport preserve separate server session and game presence identities, rooms, packets, presence, heartbeat, host promotion and cleanup without Supabase.');
