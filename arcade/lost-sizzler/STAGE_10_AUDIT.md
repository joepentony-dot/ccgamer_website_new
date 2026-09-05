# Lost Sizzler Stage 10 Spy Vs Spy Reconstruction Audit

## Entry gate

Stage 9 acceptance head `1a0998fd8a7b5e918178e2182a448542082306b1` completed all six canonical pull-request workflows successfully. Stage 10 may therefore begin on the same draft and unmerged PR #1852 branch.

PR #1860 remains outside this programme. No containment/recovery files or Supabase data are part of this stage.

## Existing Spy foundation

The branch already contains a substantial isolated Spy Vs Spy runtime. Stage 10 must qualify and consolidate that runtime rather than create a second Spy engine.

Current Spy-owned pieces include:

- `v10-41-r29-spy-engine-isolation.js` — isolated Spy rules, controller-frame updates, movement, collision, damage, prompts and compact physical-world ownership. It deliberately does not replace the shared `window.update` owner.
- `v10-41-r32-spy-loader.js` — event/lifecycle-driven Spy-only lazy loading, first-key ownership and R56 cross-mode protection. Its former cross-mode polling timer is retired.
- `v10-41-r32-spy-overhaul.js`, packet/search owners and the r34-r36/r45/r58 layers — established map, interaction, rules, presentation, knockout, trap and damage behaviour.
- Existing Node and Chromium contracts for Spy engine isolation, packet ownership, damage ancestry, independent HUD/search behaviour, split-controller isolation and cross-mode lifecycle safety.

The accepted Stage 7-9 architecture remains fixed while Stage 10 proceeds:

- R59 remains the authoritative shared RAF owner and Solo simulation owner.
- R60 Horde ownership and bounded catch-up remain unchanged.
- Spy runs through the authoritative `spy` mode-controller boundary and its isolated update path.
- Stage 10 must not introduce a new shared RAF, global gameplay poll, parallel damage owner or replacement Solo/Horde clock.

## Stage 10 reconstruction order

1. **Baseline Spy launch and controller qualification** — prove a real Spy start reaches the intended `spy` controller and isolated runtime without making Dungeon or Horde authoritative.
2. **Lazy-loader ownership** — prove the r32 Spy chain loads exactly once on Spy activation, remains dormant in Solo/Horde and does not revive a cross-mode polling timer.
3. **Live owner ancestry** — qualify isolated update, movement and damage ownership after startup, exit and repeated re-entry; ancestry and reassertion counts must remain bounded.
4. **Compact world lifecycle** — verify logical-to-physical map construction occurs once per match/round identity and does not reset players, traps, furniture or extraction state on later frames.
5. **Movement, doors and collision** — qualify the 220 ms Spy movement governor, dash path, furniture blocking, direct-door traversal and cross-player occupancy without Dungeon movement repair.
6. **Search, inventory and trap interaction** — retain the established E/T/X/TAB ownership, queued first-action path, progress feedback, safe trap loadout and offline-local behaviour.
7. **Combat, damage and knockout lifecycle** — verify Spy damage composition, friendly/opponent semantics, knockout/respawn and round-state transitions without R56/R60 dungeon damage re-adoption.
8. **Packet and authority isolation** — qualify host/guest state ownership and ensure Spy packets cannot contaminate Dungeon or Horde network/runtime state.
9. **Lifecycle transitions** — verify leave-to-menu and repeated Spy re-entry clear held keys, queued actions, modal/UI state and mode-owned timers/listeners without accumulating owners.
10. **Sustained-session soak** — require stable owner depths, bounded world builds/reassertions, no recurring cross-mode polling and no uncaught browser errors through active play and lifecycle stress.
11. **Gameplay reconstruction only where evidence requires it** — repair concrete concrete Spy defects one at a time while preserving accepted Solo and Horde contracts.
12. **Stage 10 acceptance gate** — record exact-head canonical CI and only then proceed to Stage 11 full regression and release review.

## First implementation slice

The safest next unit is a focused browser contract for **real Spy launch + lazy-loader readiness + isolated owner ancestry + repeated leave/re-entry**.

It should measure the existing runtime before changing it and require:

- the authoritative controller to report `spy`;
- r29 isolation and r32 loader/search-owner readiness;
- no r32 polling timer;
- one stable isolated update/movement/damage composition;
- no R56 dungeon-owner activity while Spy is active;
- one compact world build per match identity rather than per frame;
- drained pending action/modal state on exit;
- no owner, listener or timer growth across repeated re-entry.

If this contract exposes a defect, Stage 10 should repair only the attributable Spy lifecycle/ownership path rather than pre-emptively rewriting Spy gameplay.

## Non-goals

- no changes to `games/games.json`;
- no intro-loader or Omega website changes;
- no Supabase Storage/database mutation;
- no PR #1860 edits;
- no Stage 11 release declaration;
- no new Spy RAF or cross-mode polling architecture merely to create activity;
- no broad rework of accepted Solo or Horde owners.
