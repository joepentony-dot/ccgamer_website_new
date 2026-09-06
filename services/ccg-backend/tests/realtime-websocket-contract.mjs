import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import { createLostSizzlerRealtimeWebSocketTransport } from '../src/lost-sizzler-realtime-ws.mjs';

const ALLOWED_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
let randomCounter = 1;
const randomBytesImpl = (size) => Buffer.alloc(size, randomCounter++);

function nextJson(socket, predicate = () => true, timeoutMs = 2_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for realtime frame.'));
    }, timeoutMs);

    const onMessage = (data, isBinary) => {
      if (isBinary) return;
      let parsed;
      try {
        parsed = JSON.parse(Buffer.from(data).toString('utf8'));
      } catch {
        return;
      }
      if (!predicate(parsed)) return;
      cleanup();
      resolve(parsed);
    };

    const onClose = () => {
      cleanup();
      reject(new Error('Realtime socket closed before expected frame.'));
    };

    function cleanup() {
      clearTimeout(timer);
      socket.off('message', onMessage);
      socket.off('close', onClose);
    }

    socket.on('message', onMessage);
    socket.on('close', onClose);
  });
}

function connect(url, origin = ALLOWED_ORIGIN) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { origin });
    const timer = setTimeout(() => {
      socket.terminate();
      reject(new Error('Timed out opening realtime socket.'));
    }, 2_000);
    socket.once('open', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function closeSocket(socket) {
  if (!socket || socket.readyState === WebSocket.CLOSED) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.terminate();
      resolve();
    }, 500);
    socket.once('close', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.close();
  });
}

const server = http.createServer((_request, response) => {
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('not found\n');
});
const transport = createLostSizzlerRealtimeWebSocketTransport({
  allowedOrigins: new Set([ALLOWED_ORIGIN]),
  maxFrameBytes: 8 * 1024,
  pingIntervalMs: 1_000,
  randomBytesImpl,
});
transport.attach(server);
assert.deepEqual(transport.diagnostics(), {
  endpointPath: '/v1/lost-sizzler/realtime',
  socketCount: 0,
  roomCount: 0,
  memberCount: 0,
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
assert.ok(address && typeof address === 'object');
const url = `ws://127.0.0.1:${address.port}${transport.endpointPath}`;

await new Promise((resolve, reject) => {
  const denied = new WebSocket(url, { origin: 'https://not-ccg.example' });
  const timer = setTimeout(() => {
    denied.terminate();
    reject(new Error('Denied-origin WebSocket upgrade did not finish.'));
  }, 2_000);
  denied.once('unexpected-response', (_request, response) => {
    clearTimeout(timer);
    assert.equal(response.statusCode, 403);
    response.resume();
    resolve();
  });
  denied.once('open', () => {
    clearTimeout(timer);
    denied.terminate();
    reject(new Error('Denied realtime origin unexpectedly connected.'));
  });
  denied.once('error', () => {});
});

const host = await connect(url);
const hostHello = await nextJson(host, (frame) => frame.type === 'hello');
assert.match(hostHello.sessionId, /^[A-Za-z0-9_-]{16}$/);
assert.notEqual(hostHello.sessionId, 'client-chosen-id');
assert.equal(hostHello.protocol, 'ccg-lost-sizzler-realtime-v1');

const hostCreated = nextJson(host, (frame) => frame.type === 'room' && frame.reason === 'created');
host.send(JSON.stringify({
  type: 'create',
  roomCode: 'SPY22',
  name: 'Host Player',
  mode: 'sizzler-saboteurs',
  build: 'V10.41',
  sessionId: 'client-chosen-id',
}));
const created = await hostCreated;
assert.equal(created.room.roomCode, 'SPY22');
assert.equal(created.room.roomCapacity, 2);
assert.equal(created.room.hostId, hostHello.sessionId);
assert.equal(created.room.members[0].id, hostHello.sessionId);

const peer = await connect(url);
const peerHello = await nextJson(peer, (frame) => frame.type === 'hello');
assert.notEqual(peerHello.sessionId, hostHello.sessionId);
const hostJoined = nextJson(host, (frame) => frame.type === 'room' && frame.reason === 'joined' && frame.room.memberCount === 2);
const peerJoined = nextJson(peer, (frame) => frame.type === 'room' && frame.reason === 'joined' && frame.room.memberCount === 2);
peer.send(JSON.stringify({ type: 'join', roomCode: 'spy22', name: 'Peer Player', build: 'V10.41' }));
const [hostRoom, peerRoom] = await Promise.all([hostJoined, peerJoined]);
assert.equal(hostRoom.room.hostId, hostHello.sessionId);
assert.equal(peerRoom.room.roomMode, 'sizzler-saboteurs');

const collision = await connect(url);
await nextJson(collision, (frame) => frame.type === 'hello');
const collisionError = nextJson(collision, (frame) => frame.type === 'error');
collision.send(JSON.stringify({ type: 'create', roomCode: 'SPY22', name: 'Collision', mode: 'dungeon' }));
assert.equal((await collisionError).code, 'room_code_in_use');

const third = await connect(url);
await nextJson(third, (frame) => frame.type === 'hello');
const fullError = nextJson(third, (frame) => frame.type === 'error');
third.send(JSON.stringify({ type: 'join', roomCode: 'SPY22', name: 'Third Player' }));
assert.equal((await fullError).code, 'room_full');

const missing = await connect(url);
await nextJson(missing, (frame) => frame.type === 'hello');
const missingError = nextJson(missing, (frame) => frame.type === 'error');
missing.send(JSON.stringify({ type: 'join', roomCode: 'MISS1', name: 'Missing Room' }));
assert.equal((await missingError).code, 'room_not_found');

let hostPacketEchoes = 0;
const hostPacketObserver = (data, isBinary) => {
  if (isBinary) return;
  try {
    if (JSON.parse(Buffer.from(data).toString('utf8')).type === 'packet') hostPacketEchoes += 1;
  } catch {}
};
host.on('message', hostPacketObserver);
const peerPacket = nextJson(peer, (frame) => frame.type === 'packet' && frame.event === 'runtime:start');
const hostAck = nextJson(host, (frame) => frame.type === 'ack' && frame.action === 'packet');
host.send(JSON.stringify({ type: 'packet', event: 'runtime:start', payload: { seed: 1234 } }));
const [packet] = await Promise.all([peerPacket, hostAck]);
assert.equal(packet.senderId, hostHello.sessionId);
assert.deepEqual(packet.payload, { seed: 1234 });
await new Promise((resolve) => setTimeout(resolve, 30));
assert.equal(hostPacketEchoes, 0, 'broadcast-self-false must not echo game packets to the sender.');
host.off('message', hostPacketObserver);

const hostPresence = nextJson(host, (frame) => frame.type === 'room' && frame.reason === 'presence');
const peerPresence = nextJson(peer, (frame) => frame.type === 'room' && frame.reason === 'presence');
host.send(JSON.stringify({
  type: 'presence',
  runtimeStarted: true,
  runtimeStartMeta: { seed: 1234, floor: 1 },
}));
const [, presence] = await Promise.all([hostPresence, peerPresence]);
assert.equal(presence.room.runtime.started, true);
assert.equal(presence.room.runtime.hostId, hostHello.sessionId);
assert.deepEqual(presence.room.runtime.startMeta, { seed: 1234, floor: 1 });

const binaryError = nextJson(peer, (frame) => frame.type === 'error' && frame.code === 'binary_frames_not_supported');
peer.send(Buffer.from([1, 2, 3]));
assert.equal((await binaryError).statusCode, 400);

const oversized = await connect(url);
await nextJson(oversized, (frame) => frame.type === 'hello');
const oversizedClosed = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Oversized realtime frame was not rejected.')), 2_000);
  oversized.once('close', (code) => {
    clearTimeout(timer);
    resolve(code);
  });
});
oversized.send(JSON.stringify({ type: 'unknown', padding: 'x'.repeat(9 * 1024) }));
assert.equal(await oversizedClosed, 1009);

const promoted = nextJson(peer, (frame) => frame.type === 'room' && frame.reason === 'disconnected');
await closeSocket(host);
const promotedRoom = await promoted;
assert.equal(promotedRoom.room.hostId, peerHello.sessionId);
assert.equal(promotedRoom.room.runtime.started, false, 'Departed host runtime presence must not transfer to the promoted peer.');

const heartbeat = nextJson(peer, (frame) => frame.type === 'heartbeat' && frame.ok === true);
peer.send(JSON.stringify({ type: 'heartbeat' }));
assert.equal((await heartbeat).room, 'SPY22');

const left = nextJson(peer, (frame) => frame.type === 'left' && frame.ok === true);
peer.send(JSON.stringify({ type: 'leave' }));
await left;
assert.equal(transport.diagnostics().roomCount, 0);
assert.equal(transport.diagnostics().memberCount, 0);

await Promise.all([
  closeSocket(peer),
  closeSocket(collision),
  closeSocket(third),
  closeSocket(missing),
]);
await transport.close();
await new Promise((resolve) => server.close(resolve));

console.log('Lost Sizzler WebSocket transport contract passed: strict origins, server-owned sessions, room compatibility, bounded frames, self-excluding packets, host promotion and disconnect cleanup work without Supabase.');
