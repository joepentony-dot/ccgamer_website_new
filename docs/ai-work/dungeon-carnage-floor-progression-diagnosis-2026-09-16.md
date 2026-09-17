# Dungeon Carnage — Floor progression defect diagnosis

## Checkpoint — 17 September 2026

Verified main: `e5e5dc46a7fd1d3d0f620d4fdcbb9f1780024c0a` (merged #2118).
Active Defect 3: #2119, `codex/dungeon-live-defect-checkpoint-post-2118`.
Incoming head: `b8f3ab5df0c23b0bbf90ec7143c0b159144ae891`.
Defects 1 (#2117) and 2 (#2118) are complete per the user's current programme; do not reopen without new evidence.

## Established root cause

The supported Floor-1 exploration/guardian objective opens the real exit. Physical `movePlayer()` entry invokes `floorComplete` once with `mode=playing` and `run.floorComplete=false`. It is not a missing movement callback or a faulty `descendFloor()`.

The ordered bootstrap loads Warden domain progression, cleansing effects, charge routes, then hunt guidance. Hunt guidance captures the cleansing/domain/core completion chain as `baseFloorComplete` and installs the outer `guardedFloorComplete` wrapper. On physical exit contact, unresolved optional Warden debt (or an unclaimed optional cache fragment) was marked `blocking:true`. With no matching unexpired `host.v142WardenExitConfirm`, the guard armed a 12-second confirmation, showed a toast and returned false before calling the inner owner. Mode stayed playing, the latch stayed false, and the completion panel stayed hidden. A second invocation could consume the confirmation; this explains why an extra movement callback is not a root-cause fix.

#2119's incoming head already changes the two optional issue flags to `blocking:false`. The correction preserves issue text, quest guidance, domain skip/debt accounting, Seal rewards, reserved-charge delivery, the core completion panel and the real Descend button. No additional movement owner is needed.

## Candidate qualification

Incoming exact-head Load Safety run 35183452102 failed in Node job 105080375126 at `v10-42-warden-hunt-guidance-contract.mjs:46`: the old contract still required first-contact suppression. Chromium was skipped. This is a deterministic candidate contract mismatch, not flaky CI.

The updated Node regression requires exactly one underlying completion call on the first valid unresolved/cache exit and retains debt/cache-loss guidance, optional quests, reserved rewards, completed/no-Warden states and off-exit lifecycle coverage. With the old two blocking flags restored temporarily, the new regression fails at first-contact completion; with the corrected flags it passes.

The focused browser ownership diagnostic is converted from asserting the bug to asserting first-contact completion, visible real panel, domain skip recording and no armed confirmation. The five-depth browser contract preserves the genuine objective → physical exit entry → real completion → actual #descend-btn → authoritative descent → playable Floor 2 route, exactly-once banking, zero transition XP and persistent RPG/inventory/relic/Banishment state.

Build/cache marker advances to V10.42 r29 / 20260917r29 through the existing bootstrap. No protected intro, games/games.json, external account/configuration, retired mode or unrelated candidate changes.

Local browser execution initially could not launch because the installed Playwright package had no Chromium executable; browser download was attempted. This is not a browser pass. Final exact-head CI must still qualify the candidate before merge.

## Related candidate and continuation

#2120 remains draft/unmerged at `51667cbac96b6d10153619833a4fd608427dbe11`. Its three-file proposal adds a redundant movement handoff and is superseded in approach by the proven guard correction; do not import it. Its Load Safety run 35164780945 is red in Chromium shards 2 and 3. Retire only after the root-cause candidate is qualified.

The user's autonomous-run authorization supersedes the old temporary ask-before-merging gate for #2119. Required exact-head checks and review/conflict checks still apply. Product-register live/manual acceptance remains a closure requirement; do not claim a user-reproduced defect closed solely from CI or merge. Continue repository work on Defects 4–6 after qualification as authorized. Banishment wording in Defect 7 must follow the documented live exchange acceptance gate.

Next: qualify the updated #2119 head, diagnose any remaining genuine failures without bypasses or weaker assertions, merge only under the current authorization and actual gates, reconcile main, then continue Save and Exit restoration. Keep #2110 and unrelated frozen candidates parked.
