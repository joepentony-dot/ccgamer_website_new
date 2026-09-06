import assert from 'node:assert/strict';
import {
  createLostSizzlerRealtimeHub,
  LOST_SIZZLER_ROOM_MODES,
} from '../src/lost-sizzler-realtime.mjs';

let nowMs = Date.parse('2036-03-01T12:00:00.000Z');
const hub = createLostSizzlerRealtimeHub({ now: () => nowMs, memberTtlMs: 5_000 });

assert.equal(LOST_SIZZLER_ROOM_MODES.dungeon.maxPlayers, 4);
assert.equal(LOST_SIZZLER_ROOM_MODES['horde-survivor'].maxPlayers, 4);
assert.equal(LOST_SIZZLER_ROOM_MODES['sizzler-saboteurs'].maxPlayers, 2);
assert.deepEqual(hub.diagnostics(), { roomCount: 0, memberCount: 0 });

const created = hub.create({
  roomCode: 'AB12C',
  sessionId: 'host_0001',
  name: 'Host Player',
  mode: 'horde',
});
assert.equal(created.roomCode, 'AB12C');
assert.equal(created.roomMode, 'horde-survivor');
assert.equal(created.roomCapacity, 4);
assert.equal(created.hostId, 'host_0001');
assert.equal(created.members[0].roomRole, 'create');
assert.equal(created.runtime.started, false);

assert.throws(
  () => hub.create({ roomCode: 'AB12C', sessionId: 'other_001', name: 'Other', mode: 'dungeon' }),
  (error) => error?.statusCode === 409 && error?.code === 'room_code_in_use'
);

nowMs += 10;
const joined1 = hub.join({ roomCode: 'ab12c', sessionId: 'peer_0001', name: 'Peer One' });
assert.equal(joined1.memberCount, 2);
assert.equal(joined1.members[1].roomMode, 'horde-survivor');
assert.equal(joined1.hostId, 'host_0001');

nowMs += 10;
hub.join({ roomCode: 'AB12C', sessionId: 'peer_0002', name: 'Peer Two' });
nowMs += 10;
hub.join({ roomCode: 'AB12C', sessionId: 'peer_0003', name: 'Peer Three' });
assert.equal(hub.snapshot('AB12C').memberCount, 4);
assert.throws(
  () => hub.join({ roomCode: 'AB12C', sessionId: 'peer_0004', name: 'Peer Four' }),
  (error) => error?.statusCode === 409 && error?.code === 'room_full'
);

const started = hub.updatePresence('host_0001', {
  runtimeStarted: true,
  runtimeStartMeta: { seed: 1234, floor: 1 },
});
assert.equal(started.runtime.started, true);
assert.equal(started.runtime.hostId, 'host_0001');
assert.deepEqual(started.runtime.startMeta, { seed: 1234, floor: 1 });

const packet = hub.publish('host_0001', 'runtime:start', { seed: 1234 });
assert.equal(packet.senderId, 'host_0001');
assert.equal(packet.recipientIds.includes('host_0001'), false, 'Broadcast self=false semantics must exclude sender.');
assert.deepEqual(packet.recipientIds.sort(), ['peer_0001', 'peer_0002', 'peer_0003']);

assert.throws(
  () => hub.publish('host_0001', 'bad event name', {}),
  (error) => error?.statusCode === 400 && error?.code === 'invalid_realtime_event'
);
assert.throws(
  () => hub.publish('host_0001', 'packet', { data: 'x'.repeat(70_000) }),
  (error) => error?.statusCode === 413 && error?.code === 'realtime_packet_too_large'
);

const afterHostLeaves = hub.leave('host_0001');
assert.equal(afterHostLeaves.memberCount, 3);
assert.equal(afterHostLeaves.hostId, 'peer_0001', 'Oldest surviving peer must become room host.');
assert.equal(afterHostLeaves.runtime.started, false, 'Runtime presence follows the current host rather than a departed host.');

const spy = hub.create({
  roomCode: 'SPY22',
  sessionId: 'spyhost01',
  name: 'Spy Host',
  mode: 'sizzler-saboteurs',
});
assert.equal(spy.roomCapacity, 2);
hub.join({ roomCode: 'SPY22', sessionId: 'spypeer01', name: 'Spy Peer' });
assert.throws(
  () => hub.join({ roomCode: 'SPY22', sessionId: 'spypeer02', name: 'Third Spy' }),
  (error) => error?.statusCode === 409 && error?.code === 'room_full'
);

assert.throws(
  () => hub.join({ roomCode: 'NO', sessionId: 'missing01', name: 'Missing' }),
  (error) => error?.statusCode === 400 && error?.code === 'invalid_room_code'
);
assert.throws(
  () => hub.create({ roomCode: 'ROOM1', sessionId: 'short', name: 'Short', mode: 'dungeon' }),
  (error) => error?.statusCode === 400 && error?.code === 'invalid_session_id'
);
assert.throws(
  () => hub.updatePresence('spypeer01', { runtimeStartMeta: { seed: 1 } }),
  (error) => error?.statusCode === 409 && error?.code === 'runtime_not_started'
);

hub.heartbeat('spypeer01');
nowMs += 5_001;
const swept = hub.sweep();
assert.equal(swept.removedMembers, 5);
assert.equal(swept.removedRooms, 2);
assert.deepEqual(hub.diagnostics(), { roomCount: 0, memberCount: 0 });

console.log('Lost Sizzler realtime contract passed: CCG room semantics preserve capacities, host promotion, runtime presence, bounded broadcasts and stale-member cleanup without Supabase.');
