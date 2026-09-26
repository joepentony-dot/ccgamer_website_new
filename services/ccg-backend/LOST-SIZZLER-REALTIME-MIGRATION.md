# Lost Sizzler Realtime migration contract

This document freezes the replacement boundary for Lost Sizzler multiplayer before any live game code is pointed away from Supabase Realtime.

## Current production behaviour

`arcade/lost-sizzler/js/network.js` remains the production multiplayer implementation. It currently uses Supabase Realtime channels for online rooms and `BroadcastChannel` only for explicit local-development rooms.

The CCG backend replacement in this directory is **not wired into the live game yet**.

## Compatibility rules

The replacement must preserve the room semantics already used by Lost Sizzler:

- room codes are uppercase alphanumeric and 4–6 characters;
- Dungeon Multiplayer supports 4 online players;
- Horde Multiplayer (`horde-survivor`) supports 4 online players;
- Spy Vs Spy Multiplayer (`sizzler-saboteurs`) supports 2 online players;
- the creator is the initial host;
- if the creator leaves, the oldest surviving peer becomes host;
- presence carries player name, join order, room mode/capacity, build and runtime-start state;
- room-mode authority comes from the host/room rather than a joining client's default mode;
- realtime game packets use broadcast-self-false behaviour;
- runtime-start presence follows the current host and must not remain attached to a departed host;
- stale/disconnected members are removed and empty rooms disappear;
- packet, metadata and name sizes are bounded before broadcast.

The first server-side implementation is `src/lost-sizzler-realtime.mjs`. Its contract test deliberately contains no Supabase dependency.

## Authentication boundary

Existing Lost Sizzler multiplayer does not require a signed-in CCG account merely to join a room. The replacement must not silently turn multiplayer into a members-only feature.

The future transport therefore needs an ephemeral connection/session identity separate from account authentication. A signed-in CCG account may later be associated with a room member where useful, but the server must not trust a client-supplied account ID.

## Transport boundary

The intended network transport is a CCG-owned WebSocket endpoint behind the same reverse-proxy/origin policy as the backend API.

It must be **opt-in and disabled by default** until its own tests pass. Before live wiring it must prove:

1. strict allowed-origin handling for WebSocket upgrades;
2. server-generated connection/session identity;
3. bounded JSON frames and event names;
4. create/join/full/not-found/collision behaviour;
5. presence synchronization and host promotion;
6. broadcast-self-false packet delivery;
7. heartbeat/disconnect cleanup;
8. no Supabase URL, key, client or Realtime dependency;
9. no effect on Solo, Tutorial, 2P Split Screen or local saves when unavailable;
10. clean fallback/error behaviour when the CCG realtime service cannot be reached.

## Deployment scope

The first CCG Realtime deployment may run as a single backend instance because active room presence and socket ownership are ephemeral in-memory state. This is appropriate for initial migration/testing, but horizontal multi-instance deployment must not be enabled until a shared room/pub-sub layer is added.

`lost_sizzler_multiplayer_rooms` in PostgreSQL may hold bounded ephemeral room metadata where useful, but PostgreSQL is not intended to carry per-frame game packets.

## Cut-over order

1. Server-side room semantics — isolated and tested.
2. Opt-in WebSocket transport — isolated and tested.
3. Passive browser client/adapter — zero network activity on construction.
4. Browser integration tests against the CCG transport.
5. Explicit non-production Lost Sizzler provider test.
6. Cross-mode multiplayer regression for Dungeon, Horde and Spy Vs Spy.
7. Only then consider changing the production online-services provider.

Supabase Realtime remains the source/production provider until that sequence is deliberately accepted. This migration does not authorize any Supabase database or Storage mutation.
