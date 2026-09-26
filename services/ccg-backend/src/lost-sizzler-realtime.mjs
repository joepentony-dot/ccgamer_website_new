const ROOM_CODE = /^[A-Z0-9]{4,6}$/;
const SESSION_ID = /^[A-Za-z0-9_-]{8,64}$/;
const PRESENCE_ID = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_PLAYER_NAME = 18;
const MAX_EVENT_NAME = 64;
const MAX_PACKET_BYTES = 64 * 1024;
const DEFAULT_MEMBER_TTL_MS = 15_000;

export const LOST_SIZZLER_ROOM_MODES = Object.freeze({
  dungeon: Object.freeze({ id: 'dungeon', maxPlayers: 4 }),
  'horde-survivor': Object.freeze({ id: 'horde-survivor', maxPlayers: 4 }),
  'sizzler-saboteurs': Object.freeze({ id: 'sizzler-saboteurs', maxPlayers: 2 }),
});

function realtimeError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function boundedJson(value, maxBytes, code) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw realtimeError(400, code);
  }
  if (serialized === undefined) throw realtimeError(400, code);
  if (Buffer.byteLength(serialized, 'utf8') > maxBytes) throw realtimeError(413, code);
  return value;
}

function normalizeRoomCode(value) {
  const roomCode = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (!ROOM_CODE.test(roomCode)) throw realtimeError(400, 'invalid_room_code');
  return roomCode;
}

function normalizeSessionId(value) {
  const sessionId = String(value || '').trim();
  if (!SESSION_ID.test(sessionId)) throw realtimeError(400, 'invalid_session_id');
  return sessionId;
}

function normalizePresenceId(value, fallbackSessionId) {
  const presenceId = String(value || fallbackSessionId || '').trim();
  if (!PRESENCE_ID.test(presenceId)) throw realtimeError(400, 'invalid_presence_id');
  return presenceId;
}

function normalizePlayerName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ').slice(0, MAX_PLAYER_NAME);
  if (!name) throw realtimeError(400, 'invalid_player_name');
  return name;
}

function normalizeMode(value) {
  const raw = String(value || '').trim().toLowerCase();
  const mode = raw === 'horde' ? 'horde-survivor' : /spy|saboteur/.test(raw) ? 'sizzler-saboteurs' : raw;
  if (!LOST_SIZZLER_ROOM_MODES[mode]) throw realtimeError(400, 'invalid_room_mode');
  return mode;
}

function normalizeStartMeta(value) {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw realtimeError(400, 'invalid_runtime_start_meta');
  }
  return boundedJson({ ...value }, 8 * 1024, 'runtime_start_meta_too_large');
}

function memberOrder(a, b) {
  const aRole = a.roomRole === 'create' ? 0 : 1;
  const bRole = b.roomRole === 'create' ? 0 : 1;
  if (aRole !== bRole) return aRole - bRole;
  return (a.joinedAt - b.joinedAt) || a.presenceId.localeCompare(b.presenceId);
}

function publicMember(member) {
  return Object.freeze({
    id: member.presenceId,
    name: member.name,
    joinedAt: member.joinedAt,
    roomRole: member.roomRole,
    roomMode: member.roomMode,
    roomCapacity: member.roomCapacity,
    build: member.build,
    runtimeStarted: member.runtimeStarted,
    runtimeStartMeta: member.runtimeStartMeta ? { ...member.runtimeStartMeta } : null,
  });
}

export function createLostSizzlerRealtimeHub({
  now = () => Date.now(),
  memberTtlMs = DEFAULT_MEMBER_TTL_MS,
} = {}) {
  if (typeof now !== 'function') throw new Error('Realtime hub requires a clock.');
  if (!Number.isSafeInteger(memberTtlMs) || memberTtlMs < 3_000 || memberTtlMs > 120_000) {
    throw new Error('Realtime member TTL must be between 3000 and 120000 ms.');
  }

  const rooms = new Map();
  const membership = new Map();

  function getRoom(roomCode) {
    const normalized = normalizeRoomCode(roomCode);
    return { normalized, room: rooms.get(normalized) || null };
  }

  function touch(member) {
    member.lastSeenAt = now();
  }

  function roomSnapshot(room) {
    const members = [...room.members.values()].sort(memberOrder);
    const host = members[0] || null;
    return Object.freeze({
      roomCode: room.roomCode,
      roomMode: room.roomMode,
      roomCapacity: room.roomCapacity,
      memberCount: members.length,
      hostId: host?.presenceId || '',
      runtime: Object.freeze({
        started: Boolean(host?.runtimeStarted),
        startMeta: host?.runtimeStartMeta ? { ...host.runtimeStartMeta } : null,
        hostId: host?.presenceId || '',
      }),
      members: Object.freeze(members.map(publicMember)),
    });
  }

  function createMember({ sessionId, presenceId, name, role, roomMode, build }) {
    const normalizedSession = normalizeSessionId(sessionId);
    const timestamp = now();
    return {
      sessionId: normalizedSession,
      presenceId: normalizePresenceId(presenceId, normalizedSession),
      name: normalizePlayerName(name),
      joinedAt: timestamp,
      lastSeenAt: timestamp,
      roomRole: role,
      roomMode,
      roomCapacity: LOST_SIZZLER_ROOM_MODES[roomMode].maxPlayers,
      build: String(build || 'V10.41').trim().slice(0, 40) || 'V10.41',
      runtimeStarted: false,
      runtimeStartMeta: null,
    };
  }

  function presenceIdInUse(room, presenceId) {
    for (const member of room.members.values()) {
      if (member.presenceId === presenceId) return true;
    }
    return false;
  }

  function detach(sessionId) {
    const roomCode = membership.get(sessionId);
    if (!roomCode) return null;
    const room = rooms.get(roomCode);
    membership.delete(sessionId);
    if (!room) return null;
    room.members.delete(sessionId);
    if (room.members.size === 0) rooms.delete(roomCode);
    return room.members.size ? roomSnapshot(room) : null;
  }

  return Object.freeze({
    create({ roomCode, sessionId, presenceId, name, mode = 'dungeon', build = 'V10.41' } = {}) {
      const normalizedCode = normalizeRoomCode(roomCode);
      const normalizedSession = normalizeSessionId(sessionId);
      if (rooms.has(normalizedCode)) throw realtimeError(409, 'room_code_in_use');
      if (membership.has(normalizedSession)) detach(normalizedSession);

      const roomMode = normalizeMode(mode);
      const room = {
        roomCode: normalizedCode,
        roomMode,
        roomCapacity: LOST_SIZZLER_ROOM_MODES[roomMode].maxPlayers,
        createdAt: now(),
        members: new Map(),
      };
      const member = createMember({
        sessionId: normalizedSession,
        presenceId,
        name,
        role: 'create',
        roomMode,
        build,
      });
      room.members.set(member.sessionId, member);
      rooms.set(normalizedCode, room);
      membership.set(member.sessionId, normalizedCode);
      return roomSnapshot(room);
    },

    join({ roomCode, sessionId, presenceId, name, build = 'V10.41' } = {}) {
      const { normalized, room } = getRoom(roomCode);
      if (!room) throw realtimeError(404, 'room_not_found');
      const normalizedSession = normalizeSessionId(sessionId);
      if (membership.has(normalizedSession)) detach(normalizedSession);
      if (room.members.size >= room.roomCapacity) throw realtimeError(409, 'room_full');

      const member = createMember({
        sessionId: normalizedSession,
        presenceId,
        name,
        role: 'join',
        roomMode: room.roomMode,
        build,
      });
      if (presenceIdInUse(room, member.presenceId)) throw realtimeError(409, 'presence_id_in_use');
      room.members.set(member.sessionId, member);
      membership.set(member.sessionId, normalized);
      return roomSnapshot(room);
    },

    heartbeat(sessionId) {
      const normalizedSession = normalizeSessionId(sessionId);
      const roomCode = membership.get(normalizedSession);
      const room = roomCode ? rooms.get(roomCode) : null;
      const member = room?.members.get(normalizedSession) || null;
      if (!member) throw realtimeError(404, 'member_not_found');
      touch(member);
      return roomSnapshot(room);
    },

    updatePresence(sessionId, { name, runtimeStarted, runtimeStartMeta } = {}) {
      const normalizedSession = normalizeSessionId(sessionId);
      const roomCode = membership.get(normalizedSession);
      const room = roomCode ? rooms.get(roomCode) : null;
      const member = room?.members.get(normalizedSession) || null;
      if (!member) throw realtimeError(404, 'member_not_found');

      if (name !== undefined) member.name = normalizePlayerName(name);
      if (runtimeStarted !== undefined) {
        member.runtimeStarted = Boolean(runtimeStarted);
        member.runtimeStartMeta = member.runtimeStarted ? normalizeStartMeta(runtimeStartMeta) : null;
      } else if (runtimeStartMeta !== undefined) {
        if (!member.runtimeStarted) throw realtimeError(409, 'runtime_not_started');
        member.runtimeStartMeta = normalizeStartMeta(runtimeStartMeta);
      }
      touch(member);
      return roomSnapshot(room);
    },

    publish(sessionId, event, payload) {
      const normalizedSession = normalizeSessionId(sessionId);
      const roomCode = membership.get(normalizedSession);
      const room = roomCode ? rooms.get(roomCode) : null;
      const member = room?.members.get(normalizedSession) || null;
      if (!member) throw realtimeError(404, 'member_not_found');

      const eventName = String(event || '').trim();
      if (!eventName || eventName.length > MAX_EVENT_NAME || !/^[A-Za-z0-9._:-]+$/.test(eventName)) {
        throw realtimeError(400, 'invalid_realtime_event');
      }
      boundedJson({ event: eventName, payload }, MAX_PACKET_BYTES, 'realtime_packet_too_large');
      touch(member);
      return Object.freeze({
        roomCode,
        event: eventName,
        payload,
        senderId: member.presenceId,
        recipientIds: Object.freeze([...room.members.keys()].filter((id) => id !== normalizedSession)),
      });
    },

    leave(sessionId) {
      const normalizedSession = normalizeSessionId(sessionId);
      return detach(normalizedSession);
    },

    snapshot(roomCode) {
      const { room } = getRoom(roomCode);
      return room ? roomSnapshot(room) : null;
    },

    sweep() {
      const cutoff = now() - memberTtlMs;
      let removedMembers = 0;
      let removedRooms = 0;
      for (const [roomCode, room] of [...rooms.entries()]) {
        for (const [sessionId, member] of [...room.members.entries()]) {
          if (member.lastSeenAt > cutoff) continue;
          room.members.delete(sessionId);
          membership.delete(sessionId);
          removedMembers += 1;
        }
        if (room.members.size === 0) {
          rooms.delete(roomCode);
          removedRooms += 1;
        }
      }
      return Object.freeze({ removedMembers, removedRooms, roomCount: rooms.size });
    },

    diagnostics() {
      let memberCount = 0;
      for (const room of rooms.values()) memberCount += room.members.size;
      return Object.freeze({ roomCount: rooms.size, memberCount });
    },
  });
}
