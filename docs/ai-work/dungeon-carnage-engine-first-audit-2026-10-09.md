# C64 Dungeon Carnage — engine-first architecture evidence and next actions
**Audit date:** 9 October 2026 (UK)  
**Read baseline:** `main` at `ff91aa0f5041b672bacdec9f956f472820c504d3` (merged R121).  
**Scope:** Analysis and non-runtime regression strengthening only. No gameplay changes, asset replacement, cache bump, release, website/member changes or package publication.

## Existing engine is substantial — retain its architecture

- **Deterministic world:** `arcade/lost-sizzler/js/world.js` owns seeded generation, BSP splits, room/edge graph, start/exit, optional branches, protected door topology, Stage 5 alternative routes and theme metadata. `tests/v10-42-stage5-procedural-topology.mjs` already checks deterministic maps, door structure, loops and one start-to-exit reachability route.
- **Dungeon placement:** `js/systems.js` owns decorated rooms, doors, environmental/hazard reservations and sanctuaries. R119 pair allocation already requires >=3 room-graph hops and >=18 tile gap, protects reserved rooms, and intentionally declines to place a close second sanctuary. `tests/dungeon-carnage-r119-sanctuary-spacing.test.mjs` verifies 28 seeded floor cases.
- **AI:** `js/ai.js` owns tile-based line of sight, pursuit/A* pathfinding, occupancy map, attack cooldowns, distinct archetype tactics, and room-aware scheduling. `tests/v10-42-r45-room-simulation-lifecycle.mjs` covers nearby/remote AI stepping. `docs/ai-work/dungeon-carnage-ai-movement-review.md` already identifies difficulty-aware tactics as a potential later enhancement, rather than a proven defect.
- **Combat/progression:** `js/game-core.js`, `js/game-play.js`, `js/progression.js`, `js/v10-42-procedural-overhaul.js` and existing owner wrappers control simulation, stat progression, Essence/Flask and gear. Retain existing damage/weapon balancing and irreversible transaction safeguards. Draft PR #2642 already owns real Flask exchange/rollback QA.
- **Animation/rendering:** `js/ai.js` records attack animation timestamps/state; `js/game-render.js` chooses frames and has R70 frame-time quality recovery. `js/asset-overrides.js` and `assets/asset-manifest.json` already provide asset catalogue/configuration; avoid replacing approved licensed art. Rendering and effects are not fully proven to share a single semantic animation scheduler; record as a review area, not a confirmed broken mechanic.
- **Distribution:** `scripts/build-c64-dungeon-carnage-itch-package.mjs` stages the **same canonical browser JS** and strips website account dependencies. `desktop/dungeon-carnage/windows/main.cjs` wraps the game in sandboxed Electron using loopback HTTP and a stable save origin. Retain one gameplay implementation; no independent port is needed.
- **Current implementation sensitivity:** `js/v10-42-bootstrap.js` orders many prerequisite/modules; modules such as `v10-42-r24-biome-room-grammar.js` wrap `CCGWorld.createHostState`, and the campaign layer wraps `CCGAI.stepEnemies`. These extensibility seams need owner maps, dependency tests and gradual consolidation, not a broad rewrite.

## Additional direct runtime inspection

Executed the **unmodified** `config.js`, `world.js`, `progression.js` and `systems.js` in isolated JavaScript across 60 seeds (15 each on Floors 1, 3, 9 and 15) using actual `CCGWorld.generate`, `CCGWorld.createHostState` and `CCGSystems.decorate`. A four-way tile flood-fill confirmed start-to-exit geometry; the existing topology-validity field and sanctuary separation were independently inspected.

**Result:** 60/60 structurally connected, 60/60 with two sanctuaries, 60/60 with valid generated door topology; minimum sanctuary gap **31 tiles** and graph distance **3 hops**; **0 failures**. This DOES NOT test unlockable quest gates, mandatory objectives, staged boss encounters, player collision against every decoration, saved-floor restoration, owner live acceptance or FPS.

**Additional test-seed validation:** 30 more seeded real world/system generations (two per campaign floor, all 15 floors) passed four-way geometric start-to-exit reachability, valid optional-gate topology and both sanctuary separation rules. This coverage is now added to the **existing** `tests/dungeon-carnage-r119-sanctuary-spacing.test.mjs`, leaving its original 28 seeds in place. These are still in-memory engine checks, NOT in-browser quest completion.

## Risk register — evidence vs hypothesis

| Priority | Evidence / risk | Required next action | Status |
| --- | --- | --- | --- |
| P0 existing | Original owner-uploaded 16 music tracks inaccessible through Supabase restriction; recorded voice triggers and old Alchemist cue have known gaps. R120/R121 retry fixes exist; audio still requires owner-audible QA | Preserve P0 defect queue and separate original-music recovery (#2596), with no automated high-egress CDN probing. No invented substitute voice/music | External asset/owner gate |
| P1 existing | PR #2642 adds real Essence-to-Flask transaction/rollback QA; previous FIRE/trap/save regressions were fixed in code but still have manual acceptance | Finish existing QA and natural-input owner playtest; do not duplicate trade code | Existing PR / owner acceptance |
| P1 engineering | `config.js` is top-level frozen but nested data is not verified here by a unified runtime schema. Current contracts test selected literal values | Extend existing contract with finite-positive bounds, reference integrity and resource/timing invariants before runtime schema work | **First patch in this branch, plus all-floor test extension** |
| P1 engineering | Multiple ordered wrapper modules touch `createHostState` / `stepEnemies`; a load-order change could bypass older owner guards | Inventory active wrapper ownership and prove single-call composition with executable tests | Investigation; no runtime patch yet |
| P2 generation | Existing Stage 5 and R119 topology tests cover selected seeds; full-objective solvability on all 15 floors is not established by 60 structural samples | Extend deterministic end-to-end floor objectives and placement invariants in existing tests without changing BSP generator first | Test coverage gap |
| P2 AI/combat | AI is differentiated and performance-throttled; difficulty profiles mostly tune health/resource pressure, not decision-making (per AI review) | Measure per-archetype cadence and difficulty on identical seed before changing behaviour | Candidate design, not a demonstrated failure |
| P2 visual/animation | Renderer loads multiple frames up front and owns adaptive quality; state timing is distributed | Measure network/memory/frame cadence, catalogued loaded/unused art and animation continuity in browser; target specific bottleneck only | Measurement gap |
| P2 parity | itch and Windows derive from browser code, but equivalence at actual save/audio/gameplay boundary depends on package qualification | Verify current build hashes/runtime contract in staged offline and window packages; defer publishing | Existing packaging guards; no release |

## Incremental execution plan

1. **Existing regressions first:** keep #2642 QA, owner audio and live playtest gates, active emergency Supabase mitigation, and commercial production hold separate. Do not merge or ship the held older branches #2594–#2596 by inference.
2. **Configuration and structural invariant guards (this PR):** add no-op-to-runtime validation in existing `arcade/lost-sizzler/tests/v10-42-procedural-overhaul-contract.mjs` for floor/Key mapping, valid theme refs, capacity limits, enemy cooldowns, difficulty multipliers and positive/finite procedural settings. Keep actual gameplay `config.js` unchanged.
3. **Runtime ownership tracing:** record ordered wrappers and their entry/exit owner; add a precise regression only for a verified bypass/collision.
4. **Dungeon playability and rules:** upgrade deterministic scenario assertions from geometric reachability to mandatory objectives, sanctuaries, reserved hazard rooms and post-placement walkable interactions, across all 15 floors and fixed seeds.
5. **AI and animation:** measure real behaviour and frame timing first. Preserve distinct enemy abilities, all available animations and R70 quality hysteresis.
6. **Packaging parity:** verify browser and staged itch/Electron run identical game logic with platform adapters only; stay within qualification, no paid release.

## Tests, statuses, safety

- 60 actual in-memory floor generations passed the structural checks listed above; no edited runtime was involved.
- New config guards and expanded 15-floor sanctuary/geometry contract are **code committed, not yet CI-qualified** at this checkpoint. Required: syntax, Dungeon PR Qualification, established Chromium matrix, site safety, cache/performance and optional package checks on exact head. Treat CI errors as evidence to investigate, not a reason to weaken tests.
- No gameplay module, asset, save format, member record, Supabase setting, page, production deployment, version stamp or downloadable product is changed here. Existing asset licences and source-only exclusion rules remain untouched.
- Preserve R119 sanctuary behaviour and previous completed combat/progression, death XP, credits, bridge/thief, Tutorial, music/voice and inventory work. Full manual acceptance remains a separate gate.

## Workstream checkpoint

**Branch:** `audit/dungeon-engine-first-contracts-20261009`, created from exact R121 main.  
**Only runtime-adjacent changes:** regression-contract assertions in two existing tests, no runtime edits.
**Draft PR:** #2644, base R121 `ff91aa0f`; no merge, deploy or production authorisation.  
**Next:** draft PR and exact-head CI/Chromium qualification; avoid merging until green and authorised.