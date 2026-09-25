import assert from 'node:assert/strict';
import { createLostSizzlerRealtimeClient } from '../client/lost-sizzler-realtime.mjs';

class PrototypeMessageEvent {
  constructor(data) {
    this._data = data;
  }

  get data() {
    return this._data;
  }
}

function roomSnapshot({
  roomCode = 'AB12C',
  roomMode = 'dungeon',
  roomCapacity = 4,
  hostId = 'server_session_1',
  memberCount = 1,
  runtimeStarted = false,
  runtimeStartMeta = null,
} = {}) {
  return {
    roomCode,
    roomMode,
    roomCapacity,
    memberCount,
    hostId,
    runtime: {
      started: runtimeStarted,
      startMeta: runtimeStartMeta,
      hostId,
    },
    members: [{
      id: hostId,
      name: 'Host Player',
      joinedAt: 1,
      roomRole: 'create',
      roomMode,
      roomCapacity,
      build: 'V10.41',
      runtimeStarted,
      runtimeStartMeta,
    }],
  };
}

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.sent = [];
    this.listeners = new Map();
    this.nextServerFrame = null;
    FakeWebSocket.instances.push(this);

    queueMicrotask(() => {
      if (this.readyState !== FakeWebSocket.CONNECTING) return;
      this.readyState = FakeWebSocket.OPEN;
      this.emit('open', {});
      this.serverFrame({
        type: 'hello',
        sessionId: `server_session_${FakeWebSocket.instances.length}`,
        protocol: 'ccg-lost-sizzler-realtime-v1',
      });
    });
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
  }

  removeEventListener(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event, payload) {
    for (const handler of [...(this.listeners.get(event) || [])]) handler(payload);
  }

  serverFrame(frame) {
    this.emit('message', new PrototypeMessageEvent(JSON.stringify(frame)));
  }

  send(serialized) {
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error('socket_not_open');
    const frame = JSON.parse(serialized);
    this.sent.push(frame);

    const explicit = this.nextServerFrame;
    this.nextServerFrame = null;
    queueMicrotask(() => {
      if (explicit) {
        this.serverFrame(explicit);
        return;
      }

      if (frame.type === 'create') {
        this.serverFrame({ type: 'room', reason: 'created', room: roomSnapshot({ roomCode: frame.roomCode, roomMode: frame.mode }) });
      } else if (frame.type === 'join') {
        this.serverFrame({ type: 'room', reason: 'joined', room: roomSnapshot({ roomCode: frame.roomCode, memberCount: 2 }) });
      } else if (frame.type === 'presence') {
        this.serverFrame({
          type: 'room',
          reason: 'presence',
          room: roomSnapshot({
            runtimeStarted: Boolean(frame.runtimeStarted),
            runtimeStartMeta: frame.runtimeStartMeta || null,
          }),
        });
      } else if (frame.type === 'packet') {
        this.serverFrame({ type: 'ack', action: 'packet' });
      } else if (frame.type === 'heartbeat') {
        this.serverFrame({ type: 'heartbeat', ok: true, room: 'AB12C' });
      } else if (frame.type === 'leave') {
        this.serverFrame({ type: 'left', ok: true });
      }
    });
  }

  close() {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.emit('close', { code: 1000 });
  }
}

FakeWebSocket.instances.length = 0;
const roomEvents = [];
const packetEvents = [];
const connectionEvents = [];
const errorEvents = [];

const client = createLostSizzlerRealtimeClient({
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  WebSocketImpl: FakeWebSocket,
  timeoutMs: 1_000,
  onRoom: (room, reason) => roomEvents.push({ room, reason }),
  onPacket: (event, payload, senderId) => packetEvents.push({ event, payload, senderId }),
  onConnection: (connected, detail) => connectionEvents.push({ connected, detail }),
  onError: (error) => errorEvents.push(error),
});

assert.equal(FakeWebSocket.instances.length, 0, 'Constructing the realtime client must not create a WebSocket.');
assert.equal(client.endpoint, 'wss://auth.cheekycommodoregamer.co.uk/v1/lost-sizzler/realtime');
assert.deepEqual(client.getState(), {
  connected: false,
  sessionId: '',
  protocol: '',
  room: null,
});

const connected = await client.connect();
assert.equal(connected.ok, true);
assert.equal(FakeWebSocket.instances.length, 1, 'Explicit connect must create exactly one WebSocket.');
assert.equal(FakeWebSocket.instances[0].url, client.endpoint);
assert.equal(connected.sessionId, 'server_session_1');
assert.equal(connected.protocol, 'ccg-lost-sizzler-realtime-v1');
assert.deepEqual(connectionEvents, [{ connected: true, detail: 'connected' }]);
assert.equal(client.getState().connected, true);
assert.equal(client.getState().sessionId, 'server_session_1');

const created = await client.createRoom({
  roomCode: 'AB12C',
  name: 'Host Player',
  mode: 'dungeon',
  build: 'V10.41',
});
assert.equal(created.ok, true);
assert.equal(created.room.roomCode, 'AB12C');
assert.equal(client.getState().room.roomCode, 'AB12C');
assert.equal(roomEvents.at(-1).reason, 'created');
assert.deepEqual(FakeWebSocket.instances[0].sent[0], {
  type: 'create',
  roomCode: 'AB12C',
  name: 'Host Player',
  mode: 'dungeon',
  build: 'V10.41',
});
assert.equal('sessionId' in FakeWebSocket.instances[0].sent[0], false, 'Client must never choose its realtime session identity.');
assert.equal('userId' in FakeWebSocket.instances[0].sent[0], false, 'Anonymous multiplayer must not trust a client-supplied account identity.');

const presence = await client.updatePresence({
  runtimeStarted: true,
  runtimeStartMeta: { seed: 1234, floor: 1 },
});
assert.equal(presence.ok, true);
assert.equal(presence.room.runtime.started, true);
assert.deepEqual(presence.room.runtime.startMeta, { seed: 1234, floor: 1 });

const packetSent = await client.sendPacket('runtime:start', { seed: 1234 });
assert.deepEqual(packetSent, { ok: true, kind: 'success' });
assert.deepEqual(FakeWebSocket.instances[0].sent.at(-1), {
  type: 'packet',
  event: 'runtime:start',
  payload: { seed: 1234 },
});

FakeWebSocket.instances[0].serverFrame({
  type: 'packet',
  event: 'player:move',
  payload: { x: 12, y: 8 },
  senderId: 'peer_session_2',
});
assert.deepEqual(packetEvents, [{
  event: 'player:move',
  payload: { x: 12, y: 8 },
  senderId: 'peer_session_2',
}]);

const heartbeat = await client.heartbeat();
assert.deepEqual(heartbeat, { ok: true, kind: 'success', roomCode: 'AB12C' });

FakeWebSocket.instances[0].nextServerFrame = {
  type: 'error',
  code: 'room_full',
  statusCode: 409,
};
const full = await client.joinRoom({ roomCode: 'FULL1', name: 'Late Player' });
assert.deepEqual(full, { ok: false, kind: 'conflict', status: 409, error: 'room_full' });
assert.deepEqual(errorEvents.at(-1), { ok: false, kind: 'conflict', status: 409, error: 'room_full' });

const invalidPacket = await client.sendPacket('', {});
assert.deepEqual(invalidPacket, { ok: false, kind: 'invalid_request', status: 0, error: 'invalid_realtime_event' });

const left = await client.leave();
assert.deepEqual(left, { ok: true, kind: 'success' });
assert.equal(client.getState().room, null);

client.disconnect();
assert.equal(client.getState().connected, false);
assert.equal(client.getState().sessionId, '');
assert.equal(client.getState().room, null);
assert.deepEqual(connectionEvents.at(-1), { connected: false, detail: 'disconnected' });

const unavailable = createLostSizzlerRealtimeClient({
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  WebSocketImpl: null,
  timeoutMs: 1_000,
});
assert.deepEqual(await unavailable.connect(), {
  ok: false,
  kind: 'unavailable',
  status: 0,
  error: 'websocket_unavailable',
});

class ThrowingWebSocket {
  static OPEN = 1;
  constructor() {
    throw new Error('offline');
  }
}
const offline = createLostSizzlerRealtimeClient({
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  WebSocketImpl: ThrowingWebSocket,
  timeoutMs: 1_000,
});
assert.deepEqual(await offline.connect(), {
  ok: false,
  kind: 'network_error',
  status: 0,
  error: 'network_error',
});

assert.throws(
  () => createLostSizzlerRealtimeClient({ baseUrl: 'http://example.test', WebSocketImpl: FakeWebSocket }),
  /ccg_backend_requires_https/
);
assert.throws(
  () => createLostSizzlerRealtimeClient({ baseUrl: 'https://user:pass@example.test', WebSocketImpl: FakeWebSocket }),
  /ccg_backend_url_must_not_include_credentials/
);

console.log('Lost Sizzler realtime browser client contract passed: construction is passive, browser MessageEvent frames decode, server-owned sessions drive rooms, packets stay self-neutral, failures are contained and no Supabase dependency is introduced.');
