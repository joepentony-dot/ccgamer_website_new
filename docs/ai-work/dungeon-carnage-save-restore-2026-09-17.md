# Dungeon Carnage Defect 4 — Save and Exit restoration

## Checkpoint — 17 September 2026

### Live base and active candidate

- Verified live `main` when this defect branch was created: `bcdd2df69ca6338227cdf002af4672233a193fa8`.
- Defect 3 is complete through merged PR #2119. Its merge commit is `9b6a9ee1d87a6095a33170ed90e733e305cef24c`; later generated SEO output advanced `main` to the base above.
- The redundant #2120 movement-wrapper proposal was closed without merge.
- Active branch: `codex/dungeon-save-restore-current-main`.
- Active PR: #2123, draft until final exact-head qualification is green.
- The diagnostic-only PR #2122 remains historical evidence and is not the integration candidate.
- Latest production/test correction head before this documentation update: `efaf99ba5e483954ef092a00436156a9e411e2d1`. Documentation commits advance the candidate, so qualification and any merge decision must use the final post-documentation head.

## Proven ownership and root cause

The current game has two checkpoint layers that must remain compatible.

The base checkpoint functions in `arcade/lost-sizzler/js/game-core.js` still own the five-death Save & Return panel and legacy floor-entry snapshot. That layer rejected Floor 1 at several boundaries:

- `captureFloorEntryCheckpoint()` cleared/declined checkpoints when `run.floor <= 1`;
- `offerFloorSave()` refused the supported five-death save prompt when `run.floor <= 1`;
- `updateSavedRunButton()` and `resumeSavedRun()` also treated Floor 1 as ineligible;
- `beginRun()` left the base `floorEntryCheckpoint` null after building the opening floor.

A later established Solo persistence owner, `v10-41-r43-solo-save-continue.js`, already captures and persists a floor-entry autosave envelope, including Floor 1, and owns the normal pause-menu Save & Quit / Continue flow. Its `saveAndQuit()` already refuses to abandon the run when its browser write fails. Defect 4 must preserve that ownership rather than introduce a competing persistence model.

A second base-layer reliability defect was also proved: `saveFloorCheckpoint(true)` scheduled `quitToMenu()` even when `PGR.saveCheckpointData(...)` returned `false`. Because r43 routes Solo checkpoint writes through its envelope owner, a failed localStorage write could therefore make the five-death Save & Return path discard the active run despite reporting a failed save.

## Bounded correction

PR #2123 repairs only those ownership gaps:

- permit valid Floor 1 snapshots and the retained five-death Save & Return prompt;
- capture the base `floorEntryCheckpoint` at a successful local run start so the retained five-death path has the same entrance snapshot that later floors already have;
- preserve r43's existing Floor 1 autosave envelope and Continue ownership;
- keep daily and retired online exclusions unchanged;
- keep checkpoint restoration at the floor entrance rather than adding mid-room quick saves;
- make `saveFloorCheckpoint(true)` return the persistence result and schedule `quitToMenu()` only after a successful write;
- leave the save prompt and active run in place after a failed browser write, with a visible SAVE FAILED message;
- keep the existing checkpoint schemas and deeper-floor flow unchanged.

Production change remains isolated to the current runtime compatibility/ownership layer in `arcade/lost-sizzler/js/game-main.js`.

## Regression coverage

`arcade/lost-sizzler/tests/browser/v10-42-floor1-save-exit-restore.mjs` now exercises the genuine supported route:

1. clear the existing r43 Solo save;
2. start genuine Solo play from the real title control;
3. prove the base Floor 1 entry snapshot exists and the established r43 Floor 1 autosave envelope remains the persistence owner;
4. mutate score, health, ammunition and position to distinguish live room state from the entrance state;
5. enter the existing five-death Save & Return prompt;
6. click the actual Save & Return control;
7. verify the title menu exposes the Floor 1 saved run;
8. verify the persisted data contains the entrance snapshot rather than the mutated mid-room values;
9. click the actual Continue control and verify the genuine Floor 1 run restores at the saved entrance state;
10. reopen the real five-death prompt, simulate a write failure on r43's primary localStorage key, click the actual Save & Return control, and prove the run remains active with the menu hidden and the save prompt still available.

The contract also fails on page errors or same-origin script-load failures.

## Qualification history

On exact head `f79a87a1c845e9814dad4be9e782be3272d09f31`:

- Native Mouse Wheel Scroll Contract: passed;
- Public Code Cache Version: passed;
- SEO Automation: passed;
- Lost Sizzler Load Safety: failed only in Chromium shard 5;
- the other Chromium shards and canonical Node/structure jobs passed.

The shard-5 failure was candidate-test-caused, not an unrelated timeout: the first version of the new regression asserted that Floor 1 must not already be persisted. The failure proved that r43 already owns a Floor 1 autosave envelope. That stale assertion was removed and the correction was reshaped around the established ownership model.

The diagnostic-only #2122 Load Safety failure was also inspected. Its new test timed out in its readiness harness before reaching the intended save assertions, so it is not treated as proof of a production failure and will not be merged as the integration vehicle.

Local syntax validation of the corrected production file and focused browser contract passed before they were committed. Repository CI remains authoritative for browser qualification.

## Next safe action

1. Run all required checks on the final exact #2123 head after this documentation update.
2. If a deterministic failure is candidate-caused, fix only the proven Defect 4 ownership issue and requalify the new exact head.
3. Inspect reviews, review threads, conflicts and the final changed-file scope.
4. When the exact head is green and no genuine acceptance gate remains, take #2123 out of draft and merge under the active autonomous programme authorization.
5. Reconcile the resulting `main`, close/supersede diagnostic-only #2122, record Defect 4 complete, then continue directly to Defect 5: the 3-Artefact Banishment Flask exchange.
