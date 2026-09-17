# Dungeon Carnage Defect 4 — Save and Exit restoration

## Checkpoint — 17 September 2026

### Live base and active candidate

- Verified live `main` when this defect branch was created: `bcdd2df69ca6338227cdf002af4672233a193fa8`.
- Defect 3 is complete through merged PR #2119. Its merge commit is `9b6a9ee1...`; later generated SEO output advanced `main` to the base above.
- The redundant #2120 movement-wrapper proposal was closed without merge.
- Active branch: `codex/dungeon-save-restore-current-main`.
- Active PR: #2123, currently draft while exact-head qualification runs.
- First production/test head: `fa6722667d2b5095c7d0a162d83eb759fa81d03d` before this documentation commit.

## Proven root cause

The consolidated current checkpoint owner in `arcade/lost-sizzler/js/game-core.js` rejected Floor 1 at every supported ownership boundary:

- `captureFloorEntryCheckpoint()` cleared/declined checkpoints when `run.floor <= 1`;
- `offerFloorSave()` refused the supported save prompt when `run.floor <= 1`;
- `updateSavedRunButton()` hid persisted Floor 1 checkpoints;
- `resumeSavedRun()` rejected Floor 1 checkpoints;
- `beginRun()` explicitly left `floorEntryCheckpoint` null after building the initial floor.

By contrast, the established Floor 2+ `descendFloor()` path generates the new floor, captures its entry checkpoint, then offers the checkpoint save prompt. The persistence schema itself was not the failure.

The supported five-death flow in `game-play.js` already calls `offerFloorSave(true)`, but the Floor-1 guard made that path unreachable on the opening floor. The pause-menu wording also establishes that ordinary Quit to Main Menu abandons unsaved live state, so the current design is voluntary floor-entry checkpoint saving rather than continuous autosave.

## Bounded correction

PR #2123 keeps the existing voluntary checkpoint contract and restores Floor 1 to it:

- permit valid Floor 1 checkpoints in capture, prompt, title-menu visibility and restore;
- capture the initial local Solo/Split floor-entry snapshot after a successful `beginRun()`;
- keep that initial snapshot in memory only until the player explicitly saves;
- keep daily and online exclusions unchanged;
- keep checkpoint restoration at the floor entrance rather than introducing a mid-room quick save;
- keep the existing checkpoint schema and deeper-floor flow unchanged.

Production change is isolated to the current runtime compatibility/ownership layer in `arcade/lost-sizzler/js/game-main.js`.

## Regression coverage

Added `arcade/lost-sizzler/tests/browser/v10-42-floor1-save-exit-restore.mjs`.

The regression exercises the supported runtime path:

1. clear any old checkpoint;
2. start genuine Solo play from the real title control;
3. verify a real Floor 1 entry snapshot exists but has not been silently persisted;
4. mutate score, health, ammunition and position to distinguish live room state from the entry state;
5. enter the existing five-death Save & Return prompt;
6. click the actual Save & Return control;
7. verify the title menu exposes a Floor 1 Resume Saved Run control;
8. verify the persisted data contains the entrance snapshot rather than the mutated mid-room values;
9. click the actual resume control;
10. verify the genuine Floor 1 run restores at the saved entrance state as Solo play.

It also fails on page errors or same-origin script-load failures.

## Qualification state

For head `fa6722667d2b5095c7d0a162d83eb759fa81d03d`:

- canonical structure validation: passed;
- syntax check of every canonical Lost Sizzler JavaScript/test file: passed;
- canonical Node regression suite: running at the time this checkpoint was written;
- Lost Sizzler Chromium shard matrix: pending behind the Node/core job;
- Native Mouse Wheel Scroll Contract and Public Code Cache Version workflows were also triggered by the PR.

This documentation commit changes the candidate head, so merge qualification must use the final post-documentation head, not `fa672266...`.

## Next safe action

1. Qualify the final exact PR #2123 head through all required checks, including the new Floor 1 browser regression.
2. If a failure is deterministic and candidate-caused, fix only the proven Defect 4 issue and requalify the new exact head.
3. If an unchanged-head browser failure is established as unrelated/flaky under repository policy, retry it without modifying gameplay.
4. Once the bounded final diff is clean, required checks are green, there are no unresolved reviews/conflicts/regressions, take #2123 out of draft and merge under the programme merge authorization.
5. Reconcile the resulting live `main`, record Defect 4 as complete, then move directly to Defect 5: the 3-Artefact Banishment Flask exchange.
