# Dungeon Carnage — Floor progression defect diagnosis

Date: 2026-09-17
Base: `e5e5dc46a7fd1d3d0f620d4fdcbb9f1780024c0a`
PR: #2119 (`codex/dungeon-live-defect-checkpoint-post-2118`)

## Scope

This checkpoint records the bounded current-main investigation of the reported Floor-1 completion/exit progression failure. Production gameplay remains unchanged: exact CI evidence shows the strengthened browser fixture was incomplete and then briefly over-constrained, rather than demonstrating a fault in the authoritative descent owner.

## Current-main transition ownership

`arcade/lost-sizzler/js/game-core.js` owns the supported floor-completion state machine:

- `floorComplete(by)` refuses duplicate completion, sets `run.floorComplete=true`, changes `mode` to `floorcomplete`, banks the floor, and exposes the descend/extract UI.
- `descendFloor()` is the authoritative next-depth mutation. It increments `run.floor`, updates `run.deepest`, clears `run.floorComplete`, chooses the next modifier, rebuilds the world from `PGR.floorSeed(run)`, returns to `playing`, captures the new floor-entry checkpoint, and offers the save prompt.
- `game-main.js` binds `UI.descend` (`#descend-btn`) directly to `descendFloor`.
- `game-play.js::movePlayer(...)` calls `floorComplete(...)` when the player physically enters `world.exit` while `host.exitOpen` is true.

The authoritative core descent path therefore remains intact and must not be replaced or bypassed without contrary runtime evidence.

## Exact shard-2 failures and root cause

The strengthened five-depth browser regression at exact head `8e5b6b687f123b6c450798fa7ba05a0c87050703` failed deterministically in Chromium shard 2 at:

`Floor 1 objective completion must authorize the live stairs.`

That failure occurred before physical exit movement or `descendFloor()` because the fixture only appended a rescued C64 game to `run.floorGames`. Floor 1 (`THE THRESHOLD`) uses the `explore_guardian` objective instead: real play must establish at least 70% exploration and defeat the guardian before `CCGSystems.updateObjective(...)` can complete the objective.

Head `cde9ab2622aee99b479e674f3cadf2e3be48b446` corrected those prerequisites but added an unsupported second assumption: that the completed Floor-1 objective must leave the exit sealed until a separately injected Exit Sigil is collected. Exact shard-2 execution disproved that assumption. With real exploration and guardian state established, `CCGSystems.updateObjective(...)` completed the objective and `host.exitOpen` was already true.

The authoritative Defect-3 acceptance contract is therefore the direct supported route: genuine Floor-1 objective completion authorizes the live exit, followed by physical entry into the exit tile and the established completion/descent handoff. No production runtime change is justified by either fixture failure.

## Corrected bounded regression

The corrected #2119 browser contract now models only prerequisites proven to be required by real Floor-1 play:

- records all ordinary room centres as explored so the live exploration requirement is satisfied;
- marks the defeated Floor-1 guardian state and runs the real `CCGSystems.updateObjective(...)` owner;
- proves genuine Floor-1 objective completion authorizes `host.exitOpen` without directly forcing the exit state;
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