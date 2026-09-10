# Lost Sizzler Stage 12 Acceptance — Solo Level Director

## Scope

Stage 12 begins the post-stabilization gameplay expansion after the Stage 11 release gate. This pass deepens solo dungeon floor pacing without reopening the stabilized input, rendering, networking, save, multiplayer, or special-mode ownership paths.

## Implemented

- Added four deterministic floor-band encounter profiles:
  - Floors 1–2: **Search Routes** — sparse single-scout pressure.
  - Floors 3–5: **Split Patrols** — more frequent scout/ambusher patrols.
  - Floors 6–8: **Crossfire Routes** — bounded two-enemy squads with a modest durability increase.
  - Floors 9+: **Lockdown Depths** — highest bounded cadence and squad pressure.
- Reused the existing Stage 8 `onRoomEntered(...)` boundary hook in `game-play.js`; no new polling or frame-owner loop was introduced.
- Encounter selection is deterministic from floor and room identity rather than random runtime rolls.
- Each generated world tracks visited rooms and encounter counts independently through a `WeakMap`, preventing repeat-room respawn farming.
- Spawn positions are selected from valid walkable room-interior cells and reject the player tile, exit tile, and occupied live-enemy tiles.
- Special gameplay rooms remain protected from director injections, including sanctuary, sigil, arena, timed, boulder, weight-bridge, memory, torch-sequence, blood-clue, trader, developer, golden and rare-vortex rooms.
- Existing dangerous/horde/dedicated-hazard rooms are excluded so their authored encounters retain ownership.
- The director only runs for Player 1 in the established `dungeon-solo` ownership path. Horde Survivor, Sizzler Saboteurs, split-screen, online/co-op and other non-solo controllers are not modified.
- Floor encounter totals remain bounded by profile (`1`, `2`, `3`, then `4` maximum injected encounters per world/floor object).
- Added director diagnostics to the existing Stage 8 state surface for later playtest balancing.

## Safety constraints retained

- No changes to multiplayer transport or authority.
- No changes to input/controller ownership.
- No changes to render-loop ownership.
- No changes to save/cloud-save architecture.
- No progression-lock bypasses.
- No `setInterval`, `setTimeout`, or random encounter polling added by Stage 12.

## Automated regression coverage

`arcade/lost-sizzler/tests/v10-41-stage12-level-director.mjs` verifies:

- the modified runtime module still parses;
- all four floor profiles and their bounded pacing contracts remain present;
- solo-only and special-mode isolation remains present;
- protected-room exclusions remain present;
- encounter limits and deterministic room cadence remain present;
- no random, interval, or timeout loop is introduced.

The test lives in the root Lost Sizzler test directory so it is included by the existing runtime validation workflow that executes all root `*.mjs` contracts.

## Acceptance status

Implementation and regression contract are committed to `codex/lost-sizzler-solo-stabilization`. Exact-head CI must pass before Stage 12 is treated as qualified; the earlier Stage 11 green run is not reused as evidence for this gameplay change.
