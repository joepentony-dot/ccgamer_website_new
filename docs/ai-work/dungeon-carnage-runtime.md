# Dungeon Carnage runtime

## Scope

The browser game under `arcade/lost-sizzler/`, including retained local runtime extraction, campaign/biome work, UI, gameplay defects, and runtime contracts. Read `arcade/lost-sizzler/PROGRESS.md` for the product backlog, but prefer live `main` when later merges or automation have advanced beyond a recorded checkpoint.

## Verified checkpoint — 2026-09-16

The current runtime checkpoint is the merged #2117 public-beta/watchdog remediation:

- qualified head: `23bd55e28d1367ad84bb82e22af08e16a2bc9b4f`
- merge commit: `408a9870d33f9ea2931934c302176743d2589160`

#2102 moved the retained local gameplay suffix into `game-local-runtime.js`; #2113 retired the obsolete networked Dungeon Multiplayer packet/world-sync prefix from `game-network.js`; #2115 restored the full explored map for supported local Split Screen; and #2117 removed the obsolete public-host beta gate that replaced the final menu with COMING SOON/disabled controls. The user has explicitly confirmed #2117 as complete; do not reopen that defect without new current-build evidence.

The live work register records #2098 R24 five-depth room grammar as present, the XP source boundary as present, networked Dungeon Multiplayer/Horde/Spy as retired modes, #2102 local-runtime extraction as present, #2113 obsolete transport retirement as present, #2115 local Split Screen full map as present, #2117 public-beta/watchdog remediation as complete, and the remaining live-defect queue beginning with projectile lifecycle/slowdown.

### Completed runtime stages

#2102, `codex/dungeon-carnage-extract-local-runtime`, is **MERGED**.

The merged stage:

- moved the retained local gameplay suffix from `game-network.js` into `game-local-runtime.js`
- loaded `game-local-runtime.js` immediately after `game-network.js` and before `game-play.js`
- preserved Solo, Tutorial, local 2P Split Screen, Weekly Vault/account, save/progression and established gameplay ownership
- retained the queued early Solo/Split start repair discovered during qualification

#2113, `codex/dungeon-carnage-retire-online-prefix-current-main`, is **MERGED**.

The merged stage:

- replaced obsolete packet routing, remote-player simulation and world serializer/receiver logic in `game-network.js` with inert compatibility owners
- retained only the callback/function names required while RoomNetwork remains the local Solo/Split session shell
- added/strengthened retirement contracts so the old packet, remote-player and world-sync behaviours cannot silently return
- updated two old multiplayer-era tests whose positive world-sync expectations directly contradicted the intentional retirement boundary
- left retained combat, pickups, Banishment, inventory and XP ownership in `game-local-runtime.js`

### #2113 merge qualification evidence

The exact #2113 head was green before merge across its PR-triggered checks:

- Lost Sizzler Load Safety — PASS
- Native Mouse Wheel Scroll Contract — PASS
- Public Code Cache Version — PASS

The first Load Safety attempt had one isolated Chromium shard-5 failure: `v10-35-layout.mjs` timed out during its initial startup wait while every later contract in that shard passed and shards 1, 2, 3, 4 and 6 were green. The unchanged shard-5 job was rerun after the workflow completed and passed. No timeout, assertion or production runtime code was weakened to obtain green.

### #2115 supported local Split Screen full map

#2115, `codex/rebuild-split-full-map-current-main`, is **MERGED**. It restores the full explored-map panel for local Split Screen, retains P1 exploration knowledge as the shared map view, makes `M` ignore held-key repeats, and uses a dedicated `fullmap` non-playing mode so pause-recovery layers cannot mistake the overlay for an orphaned pause. Its exact head passed all current PR checks. The first Chromium shard-3 run failed only in the pre-existing `v10-28-browser-stability-deterministic.mjs` startup wait; the unchanged shard retry passed, with no test weakening or unrelated runtime change.

### #2117 public-beta/watchdog remediation

#2117 is **MERGED**. Exact qualified head `23bd55e28d1367ad84bb82e22af08e16a2bc9b4f` merged as `408a9870d33f9ea2931934c302176743d2589160`. It removed the obsolete public-host closed-beta ownership from `v10-41-load-watchdog.js` while preserving site account/authentication ownership and current game startup. The user has designated this live defect complete.

### Retired stale/superseded runtime PRs

| PR | Classification | Current state |
| --- | --- | --- |
| #2062 | **SUPERSEDED** by merged #2098 R24 refresh | Closed without merge |
| #1960 | **SUPERSEDED** by merged/current XP-source boundary | Closed without merge |
| #1959 | **OBSOLETE PRODUCT-MODE WORK** after Spy retirement | Closed without merge |
| #1998 | **SUPERSEDED DOCUMENTATION** by merged #2100 work register | Closed without merge |
| #2055 | **STALE SOURCE MATERIAL** | Closed without merge. Rebuild only still-valid presentation ideas on current `main`. |
| #1983 | **STALE / REPRODUCTION REQUIRED** | Closed without merge. Revisit only if the startup-overlay defect reproduces on the current deployed build. |
| #1978 | **STALE VERIFICATION CHILD** of #1976 | Closed without merge; historical soak evidence remains in Git history. |
| #1980 | **STALE DOCUMENTATION CHILD** of #1978 | Closed without merge; evidence remains in Git history. |
| #1898 | **HISTORICAL PRODUCTION-SMOKE DIAGNOSTIC** | Closed without merge. |
| #1900 | **HISTORICAL TEST FOLLOW-UP** to #1898 | Closed without merge. |

### Other unresolved candidates

- #1976 (R30 ownership-audit throttle) may contain a useful optimisation idea, but it must be re-derived against current `main`; its old branch is not the integration vehicle.
- #1902 is closed without merge as superseded by merged #2115.
- #1860 and #1852 are historical long-running containment/stabilisation branches and are not safe bases for new runtime work. Their broader non-runtime implications must be reconciled separately before any closure decision.

## Retired-mode residue audit — 2026-09-16

The bounded current-main audit was completed at `e9adbd16eb56698254200e371ffb54cd9b8125e4` after the #2115 checkpoint. It confirmed that the runtime page bootstrap does **not** load the retired Horde Survivor or Sizzler Saboteurs modules, and that the loaded `game-network.js` surface remains the intentionally inert local-session compatibility boundary established by #2113.

Historical Horde/Spy source files and acceptance records remain in the repository as evidence and are not loaded by the supported runtime. The audit also found old `playMode === "online"` conditional guards inside `game-local-runtime.js`. They are unreachable in the supported release but occur within retained local gameplay ownership; removing them requires a separate, focused local-runtime contract and must not be folded into terminology, topology, NPC, commerce, or menu work.

No production runtime code was changed by this audit.

## Guardrails and next action

## Current live-defect remediation — 2026-09-16

#2117 closed the obsolete public-beta watchdog/menu-lock defect. The remaining authoritative deployed-game queue is now:

1. Projectile accumulation during sustained firing/enemy hits.
2. Completion-portal floor progression freeze.
3. Save and Exit / Continue restoration failure.
4. Immediate three-Artefact Banishment Flask exchange failure.
5. Missing firearm differentiation/Owned Firearms information.
6. Remaining Sizzler/Zzap!/Uncommon RPG terminology.

### Active Defect 2 candidate — PR #2118

Branch `codex/dungeon-projectile-lifecycle-current-main` was created from exact live `main` `408a9870d33f9ea2931934c302176743d2589160`. Investigation found one authoritative player-projectile collection, `bullets`, shared by simulation and rendering. The legacy projectile owner marked TTL dead on impacts but deferred physical removal until the end of the complete `stepProjectiles()` pass. The r29 runtime intentionally catches recoverable `update()` faults and continues the loop, so a hit/death callback fault can bypass that deferred sweep. Both projectile rendering and dynamic lighting iterate the retained authoritative entries. Existing R1 stale-projectile repair only marks old bullets dead and still depends on the same sweep.

#2118 therefore adds an ordered V10.42 projectile lifecycle owner that retires non-piercing enemy/generator impacts before downstream callbacks and sweeps expired player/enemy projectiles from a `finally` boundary. It does not alter fire delay, rapid-fire cadence, projectile allowance, projectile TTL, held-fire ownership or room/run cleanup. Focused deterministic coverage includes direct enemy hits, 500 repeated impacts, an enemy-death callback fault and 2,400 sustained-fire ticks; the established Chromium held-fire contract remains part of the required matrix.

A local deterministic lifecycle harness passed before PR qualification. #2118 must still qualify on its final exact head through the repository-required GitHub checks before merge.

Preserve Solo, Tutorial, local 2P Split Screen and Weekly Vault/account services. The obsolete packet/world-sync retirement is complete; do not reintroduce its online transport, remote-player simulation or world snapshots while cleaning up residual terminology or compatibility code.

The bounded retired-mode residue audit is complete. Do not restore retired online modes or combine live-defect stages with the separate portal/topology/NPC/merchant work or itch.io release path.

## Session log

- 2026-09-16: Reclassified #2062, #1960, #1959 and #1998 as superseded/obsolete; they are now closed without merge.
- 2026-09-16: Qualified #2102 head `dcb35f3e...`, including a successful unchanged rerun of one transient Site Safety/WebDriver timeout; merged #2102 and completed retained local-runtime extraction.
- 2026-09-16: Closed stale runtime/verification integration candidates #1978, #1980, #2055, #1983, #1898 and #1900 without merge while preserving their history/source material.
- 2026-09-16: Updated #2113's canonical tests to retire obsolete positive world-sync expectations rather than restoring retired online behaviour.
- 2026-09-16: Qualified #2113 head `2fa216c6...`; one transient `v10-35-layout` shard timeout passed on an unchanged targeted retry.
- 2026-09-16: Merged #2113 as `c3549e6d45b7748f1efcf5c4f4ba134200325a5f`. Obsolete packet/world-sync runtime retirement is complete.
- 2026-09-16: Closed stale #1902 and rebuilt its still-valid local Split Screen map behaviour as #2115 on current `main`. The exact head `30c58717...` passed the complete matrix after an unchanged retry of an unrelated `v10-28-browser-stability-deterministic.mjs` startup timeout; #2115 merged as `95bd8431fd6b8313bf5873a79bd4bc93404d8de9`.
- 2026-09-16: Completed the bounded current-main retired-mode residue audit at `e9adbd16...`. No retired Horde/Spy module is loaded by the supported page bootstrap; the retained network boundary is inert. Kept historical source/evidence and local-runtime online guards untouched because broader removal requires a dedicated local-runtime contract.
- 2026-09-16: Qualified #2117 exact head `23bd55e2...` and merged the public-beta/watchdog remediation as `408a9870d33f9ea2931934c302176743d2589160`; the user designated that live defect complete.
- 2026-09-16: Opened bounded Defect 2 PR #2118 from exact #2117 `main`, with transactional projectile retirement/finally cleanup and focused accumulation/death-path coverage. Final exact-head GitHub qualification remains in progress.
