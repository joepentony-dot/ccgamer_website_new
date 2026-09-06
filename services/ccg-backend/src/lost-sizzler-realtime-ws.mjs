import { randomBytes } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { createLostSizzlerRealtimeHub } from './lost-sizzler-realtime.mjs';

const DEFAULT_PATH = '/v1/lost-sizzler/realtime';
const DEFAULT_MAX_FRAME_BYTES = 80 * 1024;
const DEFAULT_PING_INTERVAL_MS = 5_000;

function transportError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function validateOrigins(allowedOrigins) {
  if (!(allowedOrigins instanceof Set) || allowedOrigins.size < 1) {
    throw new Error('Realtime transport requires a non-empty allowedOrigins Set.');
  }
  for (const origin of allowedOrigins) {
    if (origin === '*') throw new Error('Realtime transport does not allow wildcard origins.');
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Invalid realtime origin: ${origin}`);
    }
    if (parsed.origin !== origin) throw new Error(`Realtime origin must be canonical: ${origin}`);
  }
  return allowedOrigins;
}

function validatePath(value) {
  const path = String(value || '').trim();
  if (!path.startsWith('/') || path.includes('?') || path.includes('#')) {
    throw new Error(`Invalid realtime WebSocket path: ${value}`);
  }
  return path;
}

function writeUpgradeRejection(socket, statusCode, statusText) {
  if (!socket || socket.destroyed) return;
  const body = `${statusCode} ${statusText}\n`;
  socket.write(
    `HTTP/1.1 ${statusCode} ${statusText}\r\n` +
    'Connection: close\r\n' +
    'Content-Type: text/plain; charset=utf-8\r\n' +
    `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n` +
    '\r\n' +
    body
  );
  socket.destroy();
}

function parseFrame(data, isBinary, maxFrameBytes) {
  if (isBinary) throw transportError(400, 'binary_frames_not_supported');
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (bytes.length < 2) throw transportError(400, 'invalid_realtime_frame');
  if (bytes.length > maxFrameBytes) throw transportError(413, 'realtime_frame_too_large');

  let frame;
  try {
    frame = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw transportError(400, 'invalid_realtime_json');
  }
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)) {
    throw transportError(400, 'invalid_realtime_frame');
  }
  return frame;
}

function createSessionId(randomBytesImpl) {
  const value = randomBytesImpl(12);
  if (!Buffer.isBuffer(value) || value.length !== 12) {
    throw new Error('Realtime session random source must return exactly 12 bytes.');
  }
  return value.toString('base64url');
}

export function createLostSizzlerRealtimeWebSocketTransport({
  allowedOrigins,
  endpointPath = DEFAULT_PATH,
  hub = createLostSizzlerRealtimeHub(),
  maxFrameBytes = DEFAULT_MAX_FRAME_BYTES,
  pingIntervalMs = DEFAULT_PING_INTERVAL_MS,
  randomBytesImpl = randomBytes,
} = {}) {
  const origins = validateOrigins(allowedOrigins);
  const path = validatePath(endpointPath);
  if (!Number.isSafeInteger(maxFrameBytes) || maxFrameBytes < 4 * 1024 || maxFrameBytes > 256 * 1024) {
    throw new Error('Realtime max frame size must be between 4096 and 262144 bytes.');
  }
  if (!Number.isSafeInteger(pingIntervalMs) || pingIntervalMs < 1_000 || pingIntervalMs > 60_000) {
    throw new Error('Realtime ping interval must be between 1000 and 60000 ms.');
  }
  if (typeof randomBytesImpl !== 'function') throw new Error('Realtime transport requires a random byte source.');

  const wss = new WebSocketServer({ noServer: true, maxPayload: maxFrameBytes });
  const sessions = new Map();
  const roomBySession = new Map();
  let attachedServer = null;
  let closed = false;

  function send(socket, body) {
    if (socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(body));
    return true;
  }

  function sendError(socket, error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    const code = statusCode === 500 ? 'internal_error' : String(error?.code || error?.message || 'realtime_error');
    send(socket, { type: 'error', code, statusCode });
  }

  function broadcastSnapshot(snapshot, reason) {
    if (!snapshot) return;
    const frame = { type: 'room', reason, room: snapshot };
    for (const member of snapshot.members) {
      const socket = sessions.get(member.id);
      if (socket) send(socket, frame);
    }
  }

  function leaveSession(sessionId, reason = 'member_left') {
    if (!roomBySession.has(sessionId)) return null;
    roomBySession.delete(sessionId);
    const snapshot = hub.leave(sessionId);
    broadcastSnapshot(snapshot, reason);
    return snapshot;
  }

  function moveBeforeJoin(sessionId) {
    if (roomBySession.has(sessionId)) leaveSession(sessionId, 'member_left');
  }

  function handleFrame(socket, sessionId, frame) {
    const type = String(frame.type || '').trim();

    if (type === 'create') {
      moveBeforeJoin(sessionId);
      const snapshot = hub.create({
        roomCode: frame.roomCode,
        sessionId,
        name: frame.name,
        mode: frame.mode,
        build: frame.build,
      });
      roomBySession.set(sessionId, snapshot.roomCode);
      broadcastSnapshot(snapshot, 'created');
      return;
    }

    if (type === 'join') {
      moveBeforeJoin(sessionId);
      const snapshot = hub.join({
        roomCode: frame.roomCode,
        sessionId,
        name: frame.name,
        build: frame.build,
      });
      roomBySession.set(sessionId, snapshot.roomCode);
      broadcastSnapshot(snapshot, 'joined');
      return;
    }

    if (type === 'heartbeat') {
      const snapshot = hub.heartbeat(sessionId);
      send(socket, { type: 'heartbeat', ok: true, room: snapshot.roomCode });
      return;
    }

    if (type === 'presence') {
      const snapshot = hub.updatePresence(sessionId, {
        name: frame.name,
        runtimeStarted: frame.runtimeStarted,
        runtimeStartMeta: frame.runtimeStartMeta,
      });
      broadcastSnapshot(snapshot, 'presence');
      return;
    }

    if (type === 'packet') {
      const packet = hub.publish(sessionId, frame.event, frame.payload);
      for (const recipientId of packet.recipientIds) {
        const recipient = sessions.get(recipientId);
        if (recipient) {
          send(recipient, {
            type: 'packet',
            event: packet.event,
            payload: packet.payload,
            senderId: packet.senderId,
          });
        }
      }
      send(socket, { type: 'ack', action: 'packet' });
      return;
    }

    if (type === 'leave') {
      leaveSession(sessionId, 'member_left');
      send(socket, { type: 'left', ok: true });
      return;
    }

    throw transportError(400, 'unknown_realtime_frame_type');
  }

  wss.on('connection', (socket) => {
    let sessionId;
    try {
      sessionId = createSessionId(randomBytesImpl);
      while (sessions.has(sessionId)) sessionId = createSessionId(randomBytesImpl);
    } catch (error) {
      socket.close(1011, 'session_initialization_failed');
      return;
    }

    sessions.set(sessionId, socket);
    socket.__ccgAlive = true;
    send(socket, { type: 'hello', sessionId, protocol: 'ccg-lost-sizzler-realtime-v1' });

    socket.on('pong', () => {
      socket.__ccgAlive = true;
      if (!roomBySession.has(sessionId)) return;
      try {
        hub.heartbeat(sessionId);
      } catch {
        roomBySession.delete(sessionId);
      }
    });

    socket.on('message', (data, isBinary) => {
      try {
        const frame = parseFrame(data, isBinary, maxFrameBytes);
        handleFrame(socket, sessionId, frame);
      } catch (error) {
        sendError(socket, error);
      }
    });

    socket.on('close', () => {
      sessions.delete(sessionId);
      leaveSession(sessionId, 'disconnected');
    });

    socket.on('error', () => {
      // The close handler owns room cleanup. Avoid reflecting transport internals to clients.
    });
  });

  const pingTimer = setInterval(() => {
    for (const [sessionId, socket] of sessions) {
      if (socket.__ccgAlive === false) {
        sessions.delete(sessionId);
        leaveSession(sessionId, 'heartbeat_timeout');
        socket.terminate();
        continue;
      }
      socket.__ccgAlive = false;
      try {
        socket.ping();
      } catch {
        sessions.delete(sessionId);
        leaveSession(sessionId, 'heartbeat_timeout');
        socket.terminate();
      }
    }
  }, pingIntervalMs);
  pingTimer.unref?.();

  function onUpgrade(request, socket, head) {
    let url;
    try {
      url = new URL(request.url || '/', 'http://localhost');
    } catch {
      writeUpgradeRejection(socket, 400, 'Bad Request');
      return;
    }
    if (url.pathname !== path) return;

    const origin = String(request.headers.origin || '').trim();
    if (!origin || !origins.has(origin)) {
      writeUpgradeRejection(socket, 403, 'Forbidden');
      return;
    }

    wss.handleUpgrade(request, socket, head, (webSocket) => {
      wss.emit('connection', webSocket, request);
    });
  }

  return Object.freeze({
    endpointPath: path,
    attach(server) {
      if (closed) throw new Error('Realtime transport is closed.');
      if (!server || typeof server.on !== 'function' || typeof server.off !== 'function') {
        throw new Error('Realtime transport requires an HTTP server.');
      }
      if (attachedServer) throw new Error('Realtime transport is already attached.');
      attachedServer = server;
      server.on('upgrade', onUpgrade);
      return () => {
        if (attachedServer !== server) return;
        server.off('upgrade', onUpgrade);
        attachedServer = null;
      };
    },
    diagnostics() {
      return Object.freeze({
        endpointPath: path,
        socketCount: sessions.size,
        ...hub.diagnostics(),
      });
    },
    async close() {
      if (closed) return;
      closed = true;
      clearInterval(pingTimer);
      if (attachedServer) {
        attachedServer.off('upgrade', onUpgrade);
        attachedServer = null;
      }
      for (const socket of sessions.values()) socket.terminate();
      sessions.clear();
      roomBySession.clear();
      await new Promise((resolve) => wss.close(() => resolve()));
    },
  });
}
