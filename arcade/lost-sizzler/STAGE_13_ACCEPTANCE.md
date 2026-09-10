# Lost Sizzler Stage 13 Acceptance — Directed Encounter Completion

## Scope

Stage 13 closes the loop introduced by the Stage 12 Solo Level Director. Directed patrols now have a deterministic, one-shot completion transaction and a small bounded score reward when the final enemy in that patrol is defeated. The work remains inside the established Solo Dungeon progression path and does not reopen movement, frame, networking, save, multiplayer, or special-mode ownership.

## Implemented

- Added a Stage 13 completion module loaded through the existing late progression chain in `v10-41-r30-buglog.js`.
- Attached completion handling to the existing authoritative `recordEnemyDefeat(...)` transaction rather than polling enemy state.
- Recognises only deterministic Stage 12 directed enemies with identities shaped as `stage12-<floor>-<room>-<slot>`.
- Groups all directed enemies from the same floor and room into one encounter identity.
- A multi-enemy encounter remains pending while any directed squad member is alive.
- The final directed kill completes the encounter exactly once for the current world.
- Completion state is stored per generated world through a `WeakMap`, preventing completed encounter identities leaking into later Solo runs.
- Added four bounded score rewards aligned with the Stage 12 floor bands:
  - **Search Routes:** 40 score.
  - **Split Patrols:** 60 score.
  - **Crossfire Routes:** 80 score.
  - **Lockdown Depths:** 100 score.
- The Stage 13 reward is score-only. It does not add XP, loot, keys, progression unlocks, healing, health, armour or ammunition.
- Completed rooms retain `stage13EncounterCleared`, reward, profile and floor diagnostics.
- The current run retains Stage 13 clear count and cumulative Stage 13 reward diagnostics.
- The canonical host revision advances when a directed encounter is completed.
- Duplicate completion attempts are rejected and counted diagnostically without awarding score again.
- Completion remains restricted to the established `dungeon-solo` controller through the Stage 8 Solo ownership check.

## Safety constraints retained

- No changes to player movement or input ownership.
- No changes to render-loop or simulation-clock ownership.
- No changes to enemy AI scheduling.
- No changes to multiplayer transport or authority.
- No changes to save/cloud-save architecture.
- No new `setInterval`, `setTimeout`, or `requestAnimationFrame` owner in Stage 13.
- No random reward rolls.
- No duplicate reward path on room re-entry or repeated completion handling.

## Automated regression coverage

`arcade/lost-sizzler/tests/v10-41-stage13-encounter-completion.mjs` verifies the static contracts:

- one-shot module ownership;
- the four bounded reward bands;
- per-world completion ownership;
- deterministic Stage 12 enemy identity parsing;
- Solo Dungeon isolation;
- final-enemy completion semantics;
- duplicate suppression;
- run/room/host diagnostics;
- the authoritative defeat-transaction hook;
- absence of interval, timeout and RAF gameplay ownership;
- loading through the established progression chain.

`arcade/lost-sizzler/tests/browser/v10-41-stage13-encounter-completion-runtime.mjs` performs the live Chromium qualification:

- launches a real Solo Dungeon run;
- creates a real two-enemy Stage 12 Lockdown Depths patrol;
- kills both enemies through the canonical `damageEnemy(...)` transaction;
- proves the first kill receives only canonical enemy score and does not complete the patrol;
- proves the final kill receives canonical enemy score plus exactly 100 Stage 13 score;
- verifies the room and run completion diagnostics;
- verifies the host revision advances through the two deaths and one completion transaction;
- replays the completion handler and proves score cannot be awarded twice;
- confirms normal Solo play and the `dungeon-solo` controller remain active with no page errors.

## Acceptance status

Implementation, static regression coverage and live Chromium qualification are committed to `codex/lost-sizzler-solo-stabilization`. Stage 13 is not considered qualified until exact-head canonical CI passes; earlier green runs are not reused as evidence for this gameplay change.
