import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import { createLostSizzlerRealtimeWebSocketTransport } from '../src/lost-sizzler-realtime-ws.mjs';
import { createLostSizzlerRealtimeSupabaseAdapter } from '../client/lost-sizzler-realtime-supabase-adapter.mjs';

const BROWSER_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';

class BrowserLikeWebSocket extends WebSocket {
  constructor(url) {
    super(url, { origin: BROWSER_ORIGIN });
  }
}

function waitFor(check, label, timeoutMs = 3_000) {
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

function presence({ id, name, role, mode, runtimeStarted = false, runtimeStartMeta = null }) {
  return {
    id,
    name,
    joinedAt: Date.now(),
    roomRole: role,
    roomMode: mode,
    roomCapacity: mode === 'sizzler-saboteurs' ? 2 : 4,
    build: 'V10.41',
    runtimeStarted,
    runtimeStartMeta,
  };
}

function subscribe(channel) {
  const statuses = [];
  channel.subscribe((status) => statuses.push(status));
  return waitFor(() => statuses.includes('SUBSCRIBED') && statuses, 'realtime channel subscription');
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

const MODES = [
  { label: 'Dungeon', mode: 'dungeon', code: 'DNG42', capacity: 4, prefix: 'DNG' },
  { label: 'Horde', mode: 'horde-survivor', code: 'HRD42', capacity: 4, prefix: 'HRD' },
  { label: 'Spy Vs Spy', mode: 'sizzler-saboteurs', code: 'SPY42', capacity: 2, prefix: 'SPY' },
];

for (const definition of MODES) {
  const hostId = `${definition.prefix}HOST01`;
  const hostAdapter = createLostSizzlerRealtimeSupabaseAdapter({ baseUrl, WebSocketImpl: BrowserLikeWebSocket, timeoutMs: 2_000 });
  const hostChannel = hostAdapter.channel(`ccg-quest:${definition.code}`, {
    config: { presence: { key: hostId }, broadcast: { self: false, ack: true } },
  });
  const hostPackets = [];
  hostChannel.on('broadcast', { event: 'ccg_packet' }, (message) => hostPackets.push(message));
  await subscribe(hostChannel);
  await hostChannel.track(presence({
    id: hostId,
    name: `${definition.label} Host`,
    role: 'create',
    mode: definition.mode,
  }));

  const peers = [];
  for (let index = 1; index < definition.capacity; index += 1) {
    const peerId = `${definition.prefix}PEER0${index}`;
    const adapter = createLostSizzlerRealtimeSupabaseAdapter({ baseUrl, WebSocketImpl: BrowserLikeWebSocket, timeoutMs: 2_000 });
    const channel = adapter.channel(`ccg-quest:${definition.code}`, {
      config: { presence: { key: peerId }, broadcast: { self: false, ack: true } },
    });
    const packets = [];
    channel.on('broadcast', { event: 'ccg_packet' }, (message) => packets.push(message));
    await subscribe(channel);
    await channel.track(presence({
      id: peerId,
      name: `${definition.label} Peer ${index}`,
      role: 'join',
      mode: definition.mode === 'dungeon' ? 'dungeon' : 'dungeon',
    }));
    peers.push({ peerId, adapter, channel, packets });
  }

  await waitFor(
    () => Object.keys(hostChannel.presenceState()).length === definition.capacity,
    `${definition.label} host full presence`
  );
  for (const peer of peers) {
    await waitFor(
      () => Object.keys(peer.channel.presenceState()).length === definition.capacity,
      `${definition.label} peer full presence`
    );
    for (const rows of Object.values(peer.channel.presenceState())) {
      assert.equal(rows[0].roomMode, definition.mode, `${definition.label} room mode must be host/server authoritative.`);
      assert.equal(rows[0].roomCapacity, definition.capacity);
    }
  }

  const overflowId = `${definition.prefix}OVER01`;
  const overflowAdapter = createLostSizzlerRealtimeSupabaseAdapter({ baseUrl, WebSocketImpl: BrowserLikeWebSocket, timeoutMs: 2_000 });
  const overflowChannel = overflowAdapter.channel(`ccg-quest:${definition.code}`, {
    config: { presence: { key: overflowId }, broadcast: { self: false, ack: true } },
  });
  await subscribe(overflowChannel);
  await assert.rejects(
    overflowChannel.track(presence({
      id: overflowId,
      name: `${definition.label} Overflow`,
      role: 'join',
      mode: definition.mode,
    })),
    (error) => error?.code === 'room_full'
  );
  assert.equal(Object.keys(hostChannel.presenceState()).length, definition.capacity);

  const hostProbe = {
    mode: definition.mode,
    sender: hostId,
    value: definition.capacity,
  };
  assert.equal(await hostChannel.send({
    type: 'broadcast',
    event: 'ccg_packet',
    payload: { event: 'mode:probe', payload: hostProbe },
  }), 'ok');
  for (const peer of peers) {
    await waitFor(() => peer.packets.length === 1, `${definition.label} host packet fan-out`);
    assert.deepEqual(peer.packets[0], { payload: { event: 'mode:probe', payload: hostProbe } });
  }
  assert.equal(hostPackets.length, 0, `${definition.label} host must not receive its own packet.`);

  if (peers.length) {
    const peerProbe = { mode: definition.mode, sender: peers[0].peerId };
    assert.equal(await peers[0].channel.send({
      type: 'broadcast',
      event: 'ccg_packet',
      payload: { event: 'peer:probe', payload: peerProbe },
    }), 'ok');
    await waitFor(() => hostPackets.length === 1, `${definition.label} peer-to-host packet`);
    assert.deepEqual(hostPackets[0], { payload: { event: 'peer:probe', payload: peerProbe } });
  }

  await hostChannel.track(presence({
    id: hostId,
    name: `${definition.label} Host`,
    role: 'create',
    mode: definition.mode,
    runtimeStarted: true,
    runtimeStartMeta: { mode: definition.mode, seed: 4200 + definition.capacity },
  }));
  for (const peer of peers) {
    await waitFor(
      () => peer.channel.presenceState()[hostId]?.[0]?.runtimeStarted === true,
      `${definition.label} runtime-start presence`
    );
    assert.deepEqual(peer.channel.presenceState()[hostId][0].runtimeStartMeta, {
      mode: definition.mode,
      seed: 4200 + definition.capacity,
    });
  }

  await hostChannel.untrack();
  await hostAdapter.removeChannel(hostChannel);
  if (peers.length) {
    await waitFor(
      () => Object.keys(peers[0].channel.presenceState()).length === definition.capacity - 1,
      `${definition.label} host departure`
    );
    assert.equal(peers[0].channel.presenceState()[hostId], undefined);
    assert.equal(Object.keys(peers[0].channel.presenceState())[0], peers[0].peerId, `${definition.label} oldest surviving peer must lead member order after host departure.`);
  }

  for (const peer of peers) {
    await peer.channel.untrack();
    await peer.adapter.removeChannel(peer.channel);
  }
  await overflowAdapter.removeChannel(overflowChannel);

  await waitFor(
    () => transport.diagnostics().roomCount === 0 && transport.diagnostics().memberCount === 0,
    `${definition.label} room cleanup`
  );
}

await waitFor(() => transport.diagnostics().socketCount === 0, 'cross-mode socket cleanup');
await transport.close();
await new Promise((resolve) => server.close(resolve));

console.log('Lost Sizzler cross-mode realtime provider contract passed: Dungeon, Horde and Spy Vs Spy preserve capacity, authoritative mode, packet fan-out, runtime presence, host departure ordering and cleanup through the CCG compatibility facade without Supabase.');
