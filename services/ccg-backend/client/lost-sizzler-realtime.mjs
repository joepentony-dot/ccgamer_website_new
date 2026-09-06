const REALTIME_PATH = '/v1/lost-sizzler/realtime';
const DEFAULT_TIMEOUT_MS = 10_000;

function normalizeRealtimeUrl(value) {
  const url = new URL(String(value || ''));
  const localHttp = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) throw new Error('ccg_backend_requires_https');
  if (url.username || url.password) throw new Error('ccg_backend_url_must_not_include_credentials');
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = REALTIME_PATH;
  url.search = '';
  url.hash = '';
  return url.toString();
}

function validObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function classifyError(frame) {
  const status = Number(frame?.statusCode) || 0;
  const error = String(frame?.code || 'realtime_error');
  if (status === 400) return Object.freeze({ ok: false, kind: 'invalid_request', status, error });
  if (status === 403) return Object.freeze({ ok: false, kind: 'forbidden', status, error });
  if (status === 404) return Object.freeze({ ok: false, kind: 'not_found', status, error });
  if (status === 409) return Object.freeze({ ok: false, kind: 'conflict', status, error });
  if (status === 413) return Object.freeze({ ok: false, kind: 'too_large', status, error });
  return Object.freeze({ ok: false, kind: 'remote_error', status, error });
}

function cloneRoom(room) {
  if (!validObject(room)) return null;
  if (typeof structuredClone === 'function') return structuredClone(room);
  return JSON.parse(JSON.stringify(room));
}

export function createLostSizzlerRealtimeClient({
  baseUrl,
  WebSocketImpl = globalThis.WebSocket,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onRoom = null,
  onPacket = null,
  onConnection = null,
  onError = null,
} = {}) {
  const endpoint = normalizeRealtimeUrl(baseUrl);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000) {
    throw new Error('realtime_timeout_out_of_range');
  }
  for (const [name, callback] of Object.entries({ onRoom, onPacket, onConnection, onError })) {
    if (callback !== null && typeof callback !== 'function') throw new Error(`${name}_must_be_function`);
  }

  let socket = null;
  let connected = false;
  let sessionId = '';
  let protocol = '';
  let room = null;
  let connectingPromise = null;
  let commandPending = false;
  const waiters = new Set();

  function emitConnection(value, detail = '') {
    try { onConnection?.(value, detail); } catch {}
  }

  function emitError(result) {
    try { onError?.(result); } catch {}
  }

  function addSocketListener(target, event, handler) {
    if (typeof target.addEventListener === 'function') {
      target.addEventListener(event, handler);
      return () => target.removeEventListener?.(event, handler);
    }
    if (typeof target.on === 'function') {
      target.on(event, handler);
      return () => target.off?.(event, handler);
    }
    const property = `on${event}`;
    const previous = target[property];
    target[property] = handler;
    return () => {
      if (target[property] === handler) target[property] = previous || null;
    };
  }

  function settleWaiters(frame) {
    for (const waiter of [...waiters]) {
      if (!waiter.predicate(frame)) continue;
      waiters.delete(waiter);
      clearTimeout(waiter.timer);
      waiter.resolve(frame);
    }
  }

  function cancelWaiters(error = 'network_error') {
    const frame = { type: 'client_failure', error };
    for (const waiter of [...waiters]) {
      waiters.delete(waiter);
      clearTimeout(waiter.timer);
      waiter.resolve(frame);
    }
  }

  function dispatchFrame(frame) {
    if (!validObject(frame)) return;
    if (frame.type === 'hello') {
      sessionId = String(frame.sessionId || '');
      protocol = String(frame.protocol || '');
      connected = Boolean(sessionId);
      if (connected) emitConnection(true, 'connected');
    } else if (frame.type === 'room') {
      room = cloneRoom(frame.room);
      try { onRoom?.(cloneRoom(room), String(frame.reason || 'update')); } catch {}
    } else if (frame.type === 'packet') {
      try {
        onPacket?.(String(frame.event || ''), frame.payload, String(frame.senderId || ''));
      } catch {}
    } else if (frame.type === 'error') {
      emitError(classifyError(frame));
    }
    settleWaiters(frame);
  }

  function decodeMessage(eventOrData) {
    const eventLike = eventOrData !== null
      && (typeof eventOrData === 'object' || typeof eventOrData === 'function')
      && 'data' in eventOrData;
    const raw = eventLike ? eventOrData.data : eventOrData;
    if (typeof raw !== 'string') return null;
    try {
      const parsed = JSON.parse(raw);
      return validObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function waitFor(predicate, timeoutError = 'realtime_timeout') {
    return new Promise((resolve) => {
      const waiter = {
        predicate,
        resolve,
        timer: setTimeout(() => {
          waiters.delete(waiter);
          resolve({ type: 'client_failure', error: timeoutError });
        }, timeoutMs),
      };
      waiters.add(waiter);
    });
  }

  function socketIsOpen() {
    if (!socket) return false;
    const openState = Number.isInteger(WebSocketImpl?.OPEN) ? WebSocketImpl.OPEN : 1;
    return socket.readyState === openState;
  }

  async function connect() {
    if (connected && socketIsOpen()) {
      return Object.freeze({ ok: true, kind: 'success', sessionId, protocol });
    }
    if (connectingPromise) return connectingPromise;
    if (typeof WebSocketImpl !== 'function') {
      return Object.freeze({ ok: false, kind: 'unavailable', status: 0, error: 'websocket_unavailable' });
    }

    connectingPromise = (async () => {
      let nextSocket;
      try {
        nextSocket = new WebSocketImpl(endpoint);
      } catch {
        return Object.freeze({ ok: false, kind: 'network_error', status: 0, error: 'network_error' });
      }
      socket = nextSocket;

      const removeMessage = addSocketListener(nextSocket, 'message', (event) => {
        const frame = decodeMessage(event);
        if (frame) dispatchFrame(frame);
      });
      const removeClose = addSocketListener(nextSocket, 'close', () => {
        if (socket !== nextSocket) return;
        connected = false;
        sessionId = '';
        protocol = '';
        room = null;
        cancelWaiters('connection_closed');
        emitConnection(false, 'closed');
      });
      const removeError = addSocketListener(nextSocket, 'error', () => {
        if (socket !== nextSocket) return;
        emitError(Object.freeze({ ok: false, kind: 'network_error', status: 0, error: 'network_error' }));
      });

      const frame = await waitFor(
        (candidate) => candidate.type === 'hello' || candidate.type === 'client_failure',
        'connect_timeout'
      );
      if (frame.type === 'hello' && connected && socketIsOpen()) {
        return Object.freeze({ ok: true, kind: 'success', sessionId, protocol });
      }

      removeMessage();
      removeClose();
      removeError();
      try { nextSocket.close?.(); } catch {}
      if (socket === nextSocket) socket = null;
      connected = false;
      sessionId = '';
      protocol = '';
      room = null;
      const error = String(frame.error || 'network_error');
      return Object.freeze({
        ok: false,
        kind: error === 'connect_timeout' ? 'timeout' : 'network_error',
        status: 0,
        error,
      });
    })();

    try {
      return await connectingPromise;
    } finally {
      connectingPromise = null;
    }
  }

  async function command(frame, predicate) {
    if (commandPending) return Object.freeze({ ok: false, kind: 'busy', status: 0, error: 'realtime_command_pending' });
    commandPending = true;
    try {
      const ready = await connect();
      if (!ready.ok) return ready;
      if (!socketIsOpen()) return Object.freeze({ ok: false, kind: 'network_error', status: 0, error: 'connection_closed' });

      const responsePromise = waitFor(
        (candidate) => candidate.type === 'error' || candidate.type === 'client_failure' || predicate(candidate)
      );
      try {
        socket.send(JSON.stringify(frame));
      } catch {
        cancelWaiters('network_error');
        return Object.freeze({ ok: false, kind: 'network_error', status: 0, error: 'network_error' });
      }

      const response = await responsePromise;
      if (response.type === 'error') return classifyError(response);
      if (response.type === 'client_failure') {
        return Object.freeze({ ok: false, kind: response.error === 'realtime_timeout' ? 'timeout' : 'network_error', status: 0, error: response.error });
      }
      return Object.freeze({ ok: true, kind: 'success', response });
    } finally {
      commandPending = false;
    }
  }

  return Object.freeze({
    endpoint,
    connect,
    async createRoom({ roomCode, presenceId, name, mode = 'dungeon', build = 'V10.41' } = {}) {
      const result = await command(
        { type: 'create', roomCode, presenceId, name, mode, build },
        (frame) => frame.type === 'room' && frame.reason === 'created'
      );
      return result.ok ? Object.freeze({ ...result, room: cloneRoom(result.response.room) }) : result;
    },
    async joinRoom({ roomCode, presenceId, name, build = 'V10.41' } = {}) {
      const result = await command(
        { type: 'join', roomCode, presenceId, name, build },
        (frame) => frame.type === 'room' && frame.reason === 'joined'
      );
      return result.ok ? Object.freeze({ ...result, room: cloneRoom(result.response.room) }) : result;
    },
    async updatePresence({ name, runtimeStarted, runtimeStartMeta } = {}) {
      const result = await command(
        { type: 'presence', name, runtimeStarted, runtimeStartMeta },
        (frame) => frame.type === 'room' && frame.reason === 'presence'
      );
      return result.ok ? Object.freeze({ ...result, room: cloneRoom(result.response.room) }) : result;
    },
    async sendPacket(event, payload) {
      const eventName = String(event || '').trim();
      if (!eventName) return Object.freeze({ ok: false, kind: 'invalid_request', status: 0, error: 'invalid_realtime_event' });
      const result = await command(
        { type: 'packet', event: eventName, payload },
        (frame) => frame.type === 'ack' && frame.action === 'packet'
      );
      return result.ok ? Object.freeze({ ok: true, kind: 'success' }) : result;
    },
    async heartbeat() {
      const result = await command(
        { type: 'heartbeat' },
        (frame) => frame.type === 'heartbeat' && frame.ok === true
      );
      return result.ok ? Object.freeze({ ok: true, kind: 'success', roomCode: String(result.response.room || '') }) : result;
    },
    async leave() {
      if (!connected || !socketIsOpen()) {
        room = null;
        return Object.freeze({ ok: true, kind: 'success', alreadyDisconnected: true });
      }
      const result = await command(
        { type: 'leave' },
        (frame) => frame.type === 'left' && frame.ok === true
      );
      if (result.ok) room = null;
      return result.ok ? Object.freeze({ ok: true, kind: 'success' }) : result;
    },
    disconnect() {
      const current = socket;
      socket = null;
      connected = false;
      sessionId = '';
      protocol = '';
      room = null;
      cancelWaiters('connection_closed');
      try { current?.close?.(); } catch {}
      emitConnection(false, 'disconnected');
    },
    getState() {
      return Object.freeze({
        connected: connected && socketIsOpen(),
        sessionId,
        protocol,
        room: cloneRoom(room),
      });
    },
  });
}
