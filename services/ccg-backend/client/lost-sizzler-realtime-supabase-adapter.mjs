import { createLostSizzlerRealtimeClient } from './lost-sizzler-realtime.mjs';

const CHANNEL_PREFIX = 'ccg-quest:';

function adapterError(code, message = code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeRoomCode(channelName) {
  const name = String(channelName || '');
  if (!name.startsWith(CHANNEL_PREFIX)) throw adapterError('invalid_channel_name');
  const roomCode = name.slice(CHANNEL_PREFIX.length).trim().toUpperCase();
  if (!/^[A-Z0-9]{4,6}$/.test(roomCode)) throw adapterError('invalid_room_code');
  return roomCode;
}

function normalizePresence(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw adapterError('invalid_presence_payload');
  }

  const id = String(value.id || '').trim();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) throw adapterError('invalid_presence_id');

  const name = String(value.name || '').trim().replace(/\s+/g, ' ').slice(0, 18);
  if (!name) throw adapterError('invalid_player_name');

  const roomRole = value.roomRole === 'create' ? 'create' : 'join';
  const roomMode = String(value.roomMode || 'dungeon').trim().toLowerCase();
  const build = String(value.build || 'V10.41').trim().slice(0, 40) || 'V10.41';

  return Object.freeze({
    id,
    name,
    roomRole,
    roomMode,
    build,
    runtimeStarted: Boolean(value.runtimeStarted),
    runtimeStartMeta: value.runtimeStarted && value.runtimeStartMeta && typeof value.runtimeStartMeta === 'object' && !Array.isArray(value.runtimeStartMeta)
      ? { ...value.runtimeStartMeta }
      : null,
  });
}

function presenceStateFromRoom(room) {
  if (!room || !Array.isArray(room.members)) return {};
  const state = {};
  for (const member of room.members) {
    const id = String(member?.id || '').trim();
    if (!id) continue;
    state[id] = [{
      id,
      name: member.name,
      joinedAt: member.joinedAt,
      roomRole: member.roomRole,
      roomMode: member.roomMode,
      roomCapacity: member.roomCapacity,
      build: member.build,
      runtimeStarted: Boolean(member.runtimeStarted),
      runtimeStartMeta: member.runtimeStarted && member.runtimeStartMeta && typeof member.runtimeStartMeta === 'object'
        ? { ...member.runtimeStartMeta }
        : null,
    }];
  }
  return state;
}

function resultError(result, fallback) {
  const code = String(result?.error || fallback || 'realtime_error');
  if (code === 'room_code_in_use') {
    return adapterError(code, 'That randomly generated room code is already in use. Create another room.');
  }
  if (code === 'room_not_found') {
    return adapterError(code, 'Room not found or the host is no longer online. Check the room code and try again.');
  }
  if (code === 'room_full') return adapterError(code, 'Room is full.');
  return adapterError(code, code);
}

function subscriptionStatusFor(result) {
  if (result?.kind === 'timeout' || result?.error === 'connect_timeout') return 'TIMED_OUT';
  return 'CHANNEL_ERROR';
}

export function createLostSizzlerRealtimeSupabaseAdapter({
  baseUrl,
  WebSocketImpl = globalThis.WebSocket,
  timeoutMs = 10_000,
  realtimeFactory = createLostSizzlerRealtimeClient,
} = {}) {
  if (typeof realtimeFactory !== 'function') throw new Error('realtimeFactory must be a function');

  const channels = new Set();

  function createChannel(channelName, options = {}) {
    const roomCode = normalizeRoomCode(channelName);
    const configuredPresenceKey = String(options?.config?.presence?.key || '').trim();
    const handlers = [];
    let room = null;
    let realtime = null;
    let subscribeCallback = null;
    let subscribed = false;
    let joined = false;
    let closed = false;
    let trackedPresenceId = '';

    function fire(kind, event, payload) {
      for (const handler of handlers) {
        if (handler.kind !== kind || handler.event !== event) continue;
        try { handler.callback(payload); } catch {}
      }
    }

    function firePresence(reason) {
      fire('presence', 'sync', {});
      if (reason === 'joined' || reason === 'created') fire('presence', 'join', {});
      if (['member_left', 'disconnected', 'heartbeat_timeout'].includes(reason)) fire('presence', 'leave', {});
    }

    function ensureRealtime() {
      if (realtime) return realtime;
      realtime = realtimeFactory({
        baseUrl,
        WebSocketImpl,
        timeoutMs,
        onRoom: (nextRoom, reason) => {
          room = nextRoom;
          firePresence(String(reason || 'sync'));
        },
        onPacket: (event, payload) => {
          fire('broadcast', 'ccg_packet', { payload: { event, payload } });
        },
        onConnection: (connected) => {
          if (connected || closed || !subscribed) return;
          try { subscribeCallback?.('CLOSED'); } catch {}
        },
      });
      return realtime;
    }

    const channel = Object.freeze({
      on(kind, filter, callback) {
        if (closed) throw adapterError('channel_closed');
        const normalizedKind = String(kind || '').trim();
        const event = String(filter?.event || '').trim();
        if (!['presence', 'broadcast'].includes(normalizedKind)) throw adapterError('unsupported_channel_handler');
        if (normalizedKind === 'presence' && !['sync', 'join', 'leave'].includes(event)) {
          throw adapterError('unsupported_presence_event');
        }
        if (normalizedKind === 'broadcast' && event !== 'ccg_packet') throw adapterError('unsupported_broadcast_event');
        if (typeof callback !== 'function') throw adapterError('invalid_channel_callback');
        handlers.push({ kind: normalizedKind, event, callback });
        return channel;
      },

      subscribe(callback) {
        if (closed) throw adapterError('channel_closed');
        if (subscribeCallback) throw adapterError('channel_already_subscribed');
        if (typeof callback !== 'function') throw adapterError('invalid_subscribe_callback');
        subscribeCallback = callback;

        Promise.resolve().then(async () => {
          const client = ensureRealtime();
          const result = await client.connect();
          if (closed) return;
          if (!result?.ok) {
            try { callback(subscriptionStatusFor(result)); } catch {}
            return;
          }
          subscribed = true;
          try { callback('SUBSCRIBED'); } catch {}
        }).catch(() => {
          if (closed) return;
          try { callback('CHANNEL_ERROR'); } catch {}
        });

        return channel;
      },

      async track(value) {
        if (closed) throw adapterError('channel_closed');
        if (!subscribed) throw adapterError('channel_not_subscribed');
        const presence = normalizePresence(value);
        if (configuredPresenceKey && configuredPresenceKey !== presence.id) {
          throw adapterError('presence_key_mismatch');
        }
        if (trackedPresenceId && trackedPresenceId !== presence.id) {
          throw adapterError('presence_id_cannot_change');
        }

        const client = ensureRealtime();
        let result;
        if (!joined) {
          result = presence.roomRole === 'create'
            ? await client.createRoom({
                roomCode,
                presenceId: presence.id,
                name: presence.name,
                mode: presence.roomMode,
                build: presence.build,
              })
            : await client.joinRoom({
                roomCode,
                presenceId: presence.id,
                name: presence.name,
                build: presence.build,
              });
          if (!result?.ok) throw resultError(result, 'presence_track_failed');
          trackedPresenceId = presence.id;
          joined = true;
          room = result.room || room;
        }

        result = await client.updatePresence({
          name: presence.name,
          runtimeStarted: presence.runtimeStarted,
          runtimeStartMeta: presence.runtimeStartMeta,
        });
        if (!result?.ok) throw resultError(result, 'presence_update_failed');
        room = result.room || room;
        return 'ok';
      },

      presenceState() {
        return presenceStateFromRoom(room);
      },

      async send(message) {
        if (closed || !joined) return 'disconnected';
        if (message?.type !== 'broadcast' || message?.event !== 'ccg_packet') return 'error';
        const event = String(message?.payload?.event || '').trim();
        if (!event) return 'error';
        const result = await ensureRealtime().sendPacket(event, message?.payload?.payload);
        return result?.ok ? 'ok' : String(result?.error || 'error');
      },

      async untrack() {
        if (closed || !realtime || !joined) {
          joined = false;
          room = null;
          return 'ok';
        }
        const result = await realtime.leave();
        if (!result?.ok) throw resultError(result, 'presence_untrack_failed');
        joined = false;
        room = null;
        return 'ok';
      },

      async close() {
        if (closed) return 'ok';
        try {
          if (realtime && joined) await channel.untrack();
        } finally {
          closed = true;
          joined = false;
          room = null;
          subscribed = false;
          realtime?.disconnect?.();
          channels.delete(channel);
        }
        return 'ok';
      },

      getDiagnostics() {
        return Object.freeze({
          roomCode,
          subscribed,
          joined,
          closed,
          trackedPresenceId,
          hasRealtimeClient: Boolean(realtime),
        });
      },
    });

    channels.add(channel);
    return channel;
  }

  return Object.freeze({
    channel: createChannel,
    async removeChannel(channel) {
      if (!channels.has(channel)) return 'ok';
      return channel.close();
    },
    async removeAllChannels() {
      for (const channel of [...channels]) await channel.close();
      return 'ok';
    },
    getDiagnostics() {
      return Object.freeze({ channelCount: channels.size });
    },
  });
}
