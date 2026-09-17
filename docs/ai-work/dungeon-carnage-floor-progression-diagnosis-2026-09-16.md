# Dungeon Carnage — Floor progression defect diagnosis

Date: 2026-09-17
Base: `e5e5dc46a7fd1d3d0f620d4fdcbb9f1780024c0a`
PR: #2119 (`codex/dungeon-live-defect-checkpoint-post-2118`)

## Scope

This checkpoint records the bounded current-main investigation of the reported Floor-1 completion/exit progression failure. Production gameplay remains unchanged: the first exact CI failure was traced to an incomplete strengthened browser fixture rather than evidence that the authoritative descent owner is faulty.

## Current-main transition ownership

`arcade/lost-sizzler/js/game-core.js` owns the supported floor-completion state machine:

- `floorComplete(by)` refuses duplicate completion, sets `run.floorComplete=true`, changes `mode` to `floorcomplete`, banks the floor, and exposes the descend/extract UI.
- `descendFloor()` is the authoritative next-depth mutation. It increments `run.floor`, updates `run.deepest`, clears `run.floorComplete`, chooses the next modifier, rebuilds the world from `PGR.floorSeed(run)`, returns to `playing`, captures the new floor-entry checkpoint, and offers the save prompt.
- `game-main.js` binds `UI.descend` (`#descend-btn`) directly to `descendFloor`.
- `game-play.js::movePlayer(...)` calls `floorComplete(...)` when the player physically enters `world.exit` while `host.exitOpen` is true.

The authoritative core descent path therefore remains intact and must not be replaced or bypassed without contrary runtime evidence.

## Exact shard-2 failure and root cause

The strengthened five-depth browser regression at exact head `8e5b6b687f123b6c450798fa7ba05a0c87050703` failed deterministically in Chromium shard 2 at:

`Floor 1 objective completion must authorize the live stairs.`

The failure occurred before physical exit movement or `descendFloor()`.

Source inspection proved the fixture was incomplete:

1. Floor 1 (`THE THRESHOLD`) uses the `explore_guardian` objective, not rescued-game count. `CCGSystems.updateObjective(...)` completes that objective only when exploration is at least 70% and the Floor-1 guardian is no longer alive.
2. Objective completion deliberately does **not** open the floor exit by itself. `host.exitOpen` requires both the completed main objective and `host.exitSigilCollected`.
3. The Exit Sigil is exposed after the Sigil defenders are resolved and its live pickup owner records `host.exitSigilCollected`, then re-runs the objective owner using the actual explored-room state.
4. The failing fixture only appended a rescued C64 game to `run.floorGames` and called `updateObjective(host,run,100)`. That state is unrelated to the Floor-1 `explore_guardian` requirement and omitted the mandatory Exit Sigil, so `false` was the expected result.

No production runtime change is justified by that failed assertion.

## Corrected bounded regression

The corrected #2119 browser contract now models only prerequisites that real Floor-1 play establishes before the exit handoff:

- records all ordinary room centres as explored so the live exploration calculation remains complete when the pickup owner re-evaluates the objective;
- marks the defeated Floor-1 guardian state and runs the real `CCGSystems.updateObjective(...)` owner;
- proves the completed main objective still leaves the exit sealed before the Exit Sigil;
- models the already-cleared Sigil fight state, exposes an Exit Sigil fixture item, and collects it through the live `requestCollect(...)` pickup owner rather than forcing `host.exitOpen`;
- proves the combined objective + Exit Sigil state authorizes the live exit;
- physically moves P1 onto the real exit tile through `movePlayer(...)` and waits for the real `floorcomplete` mode;
- proves Floor 1 is banked exactly once;
- injects old-floor player/enemy projectile sentinels only after the floor-complete state and proves the Floor-2 world clears them;
- uses the real `#descend-btn` UI handoff rather than calling `descendFloor()` directly for the Defect-3 transition;
- proves Floor 1 → Floor 2 advances exactly once, resets `run.floorComplete`, returns to playable Solo mode, preserves seeded RPG/inventory/relic/Banishment state, banks the rescued game, and awards no XP merely for the exit/descent transition.

Later Floor-2→5 persistence steps remain the pre-existing five-depth contract and are not being converted into Defect-3 UI coverage.

## Qualification boundary

The corrected exact head must pass the repository-required PR checks before #2119 can be considered qualified. A red result must be diagnosed from its exact job/log; tests, timeouts and gameplay must not be weakened merely to obtain green.

Even if fully qualified, #2119 retains its explicit merge gate: **do not merge without explicit user authorization for this exact PR**.

## Preserved boundaries

- Progression XP remains enemy-kill and explicit XP reward/pickup only. The exit/portal transition must never award XP.
- Do not alter the already-qualified mobile trap/touch-damage or portrait-layout implementation without contrary reproduction evidence.
- Do not touch protected intro-loader files or `games/games.json`.
- Do not revive retired online/Horde/Spy modes.
- Do not absorb the prepared XP candidate or unrelated Cloudflare/commerce/release work.

## Related current-main reconciliation

PR #2117 (public-beta watchdog) and PR #2118 (projectile lifecycle retention) are on current `main`. Under the work-register closure rule they are VERIFYING pending deployed/manual acceptance rather than OPEN implementation work.