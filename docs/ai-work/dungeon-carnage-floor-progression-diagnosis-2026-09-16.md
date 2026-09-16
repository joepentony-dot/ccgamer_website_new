# Dungeon Carnage — Floor progression defect diagnosis

Date: 2026-09-16
Base: `e5e5dc46a7fd1d3d0f620d4fdcbb9f1780024c0a`

## Scope

This checkpoint records the bounded diagnosis for the confirmed defect where completing Floor 1 and using the completion/exit route does not advance the campaign depth. No runtime change is included because the trigger owner has not yet been reproduced strongly enough to justify changing green gameplay code.

## Current-main transition ownership

`arcade/lost-sizzler/js/game-core.js` owns the supported floor-completion state machine:

- `floorComplete(by)` refuses duplicate completion, sets `run.floorComplete=true`, changes `mode` to `floorcomplete`, banks the floor, and exposes the descend/extract UI.
- `descendFloor()` is the authoritative next-depth mutation. It increments `run.floor`, updates `run.deepest`, clears `run.floorComplete`, chooses the next modifier, rebuilds the world from `PGR.floorSeed(run)`, returns to `playing`, captures the new floor-entry checkpoint, and offers the save prompt.
- `game-main.js` binds `UI.descend` (`#descend-btn`) directly to `descendFloor`.

Therefore a Floor-1 run that reaches `descendFloor()` should advance to Floor 2. The confirmed failure must be isolated to one of these boundaries before a runtime patch is justified:

1. the in-world completion/exit interaction fails to call `floorComplete(...)`;
2. the floor-complete panel/button is not becoming the usable interaction owner;
3. another runtime layer intercepts or reverses the state before/after `descendFloor()`.

The next implementation stage must reproduce which boundary fails and add a focused browser regression that enters the actual completion route and proves `run.floor` changes from 1 to 2 exactly once, a new world is created from the Floor-2 seed, `run.floorComplete` is reset, and no XP is awarded by the exit/transition itself.

## Preserved boundaries

- Progression XP remains enemy-kill and explicit XP reward/pickup only. The exit/portal transition must never award XP.
- Do not alter the already-qualified mobile trap/touch-damage or portrait-layout implementation without contrary reproduction evidence.
- Do not touch protected intro-loader files or `games/games.json`.
- Do not revive retired online/Horde/Spy modes.
- Do not merge a Dungeon Carnage PR without explicit user authorization for that exact PR.

## Related current-main reconciliation

PR #2117 (public-beta watchdog) and PR #2118 (projectile lifecycle retention) are on current `main`. Under the work-register closure rule they are VERIFYING pending deployed/manual acceptance rather than OPEN implementation work.
