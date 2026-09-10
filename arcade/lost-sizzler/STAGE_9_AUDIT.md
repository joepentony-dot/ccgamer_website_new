# Lost Sizzler Stage 9 Horde Reconstruction Audit

## Entry gate

Stage 8 acceptance head `9089b625f815ba485108efa9ce109f93eb5873ea` completed all six canonical pull-request workflows successfully. Stage 9 may therefore begin on the same draft/unmerged PR #1852 branch.

PR #1860 remains outside this programme. No containment/recovery files or Supabase data are part of this stage.

## Existing Horde foundation

The branch already contains substantial Horde-specific stabilization infrastructure, so Stage 9 should reconstruct by qualification and consolidation rather than by adding a second Horde engine.

Current Horde-owned pieces include:

- `v10-41-r60-horde-combat-integrity.js` — bounded real-elapsed combat service for Horde projectile travel, enemy thinking and player timers; it explicitly adds no RAF owner, discards hidden/paused debt, bounds visible catch-up, and composes through the existing Horde controller frame boundary.
- `v10-41-r60-horde-owner-composition.js` — composition/retirement bridge for the existing R60 Horde live owner and UI/performance throttling owner. It adds no gameplay wrapper and retires its bounded installer after a stable ancestry is observed.
- `v10-41-horde-frame-performance.js` and existing Horde tests for frame performance, network performance, isolation and R60 combat integrity.

The accepted Stage 7/8 architecture remains fixed while Stage 9 proceeds:

- R59 remains the authoritative Solo simulation/RAF owner.
- R60 recurring live-owner maintenance is Horde-only.
- Spy Vs Spy remains isolated for Stage 10.
- Stage 9 must not introduce a new shared RAF, global gameplay poll, parallel damage owner or replacement Solo clock.

## Stage 9 reconstruction order

1. **Baseline Horde launch/ownership qualification** — prove Horde starts from menu state into the intended special-mode/controller owner and that no Solo/Spy owner becomes authoritative.
2. **Live update ownership** — prove exactly one effective Horde live-update chain after startup, pause/resume and re-entry; wrapper ancestry must remain bounded.
3. **Combat cadence** — retain R60 bounded projectile/enemy/player-timer service and verify low-frame-rate catch-up without burst debt after hidden/paused periods.
4. **Movement/damage isolation** — verify Horde movement and damage cannot re-adopt Solo-only R59/R56/R60 ownership paths incorrectly.
5. **Lifecycle transitions** — qualify pause/resume, death/restart, leave-to-menu and repeated Horde re-entry without wrapper/timer accumulation.
6. **Long-session soak** — run a sustained Horde session and require stable owner depths, no runaway timers, no browser errors and bounded elapsed-time recovery counters.
7. **Gameplay reconstruction only where evidence requires it** — fix concrete Horde defects exposed by the above gates one at a time, preserving current Solo contracts.
8. **Stage 9 acceptance gate** — record exact-head canonical CI and only then proceed to Stage 10 Spy Vs Spy reconstruction.

## First implementation slice

The safest next unit is a focused browser contract for **Horde launch + owner ancestry + repeated re-entry**. It should measure the existing runtime before changing it. If that contract exposes a defect, Stage 9 should repair only the attributable Horde owner/lifecycle path rather than pre-emptively rewriting Horde.

## Non-goals

- no changes to `games/games.json`;
- no intro-loader/Omega website changes;
- no Supabase Storage/database mutation;
- no PR #1860 edits;
- no Stage 10 Spy gameplay reconstruction;
- no new Horde RAF or polling architecture merely to create activity.
