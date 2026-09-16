# Dungeon Carnage runtime

## Scope

The browser game under `arcade/lost-sizzler/`, including retained local runtime extraction, campaign/biome work, UI, gameplay defects, and runtime contracts. Read `arcade/lost-sizzler/PROGRESS.md` for the product backlog, but prefer live `main` when later merges or automation have advanced beyond a recorded checkpoint.

## Verified checkpoint — 2026-09-16

The current runtime checkpoint is the merged #2113 retirement stage:

- qualified head: `2fa216c6f8004616134430be69439a80e728cfd3`
- merge commit: `c3549e6d45b7748f1efcf5c4f4ba134200325a5f`

#2102 remains the preceding structural stage that moved the retained local gameplay suffix into `game-local-runtime.js`. #2113 then retired the obsolete networked Dungeon Multiplayer packet/world-sync prefix from `game-network.js` while retaining the minimal inert callback/function owners still required by the local RoomNetwork session shell.

The live work register records #2098 R24 five-depth room grammar as present, the XP source boundary as present, networked Dungeon Multiplayer/Horde/Spy as retired modes, #2102 local-runtime extraction as present, #2113 obsolete transport retirement as present, and #2090 held-fire/Flask repairs as awaiting hands-on acceptance.

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
- #1902 concerns a still-supported Split Screen map behaviour. Current `main` still limits the V10.41 full explored map to Solo, so the requested split-screen behaviour appears genuinely missing; re-derive the small behaviour against current `main` rather than merging the old branch wholesale.
- #1860 and #1852 are historical long-running containment/stabilisation branches and are not safe bases for new runtime work. Their broader non-runtime implications must be reconciled separately before any closure decision.

## Guardrails and next action

Preserve Solo, Tutorial, local 2P Split Screen and Weekly Vault/account services. The obsolete packet/world-sync retirement is complete; do not reintroduce its online transport, remote-player simulation or world snapshots while cleaning up residual terminology or compatibility code.

The next repository-side runtime step is a **bounded audit of remaining retired-mode language/runtime residue** on current `main`. Only remove or relabel residue that is demonstrably obsolete; do not combine that audit with portal/topology/NPC/merchant work or with the separate itch.io release path.

A separate small current-main rebuild of #1902's still-missing local Split Screen full-map behaviour is also a valid supported-mode candidate after the retired-mode residue boundary is reconciled.

Manual acceptance remains separate from CI: #2090 sustained held-fire behaviour and the 3-Artefact Banishment Flask exchange still require hands-on confirmation on the deployed/current build before those reproduced defects are marked closed.

## Session log

- 2026-09-16: Reclassified #2062, #1960, #1959 and #1998 as superseded/obsolete; they are now closed without merge.
- 2026-09-16: Qualified #2102 head `dcb35f3e...`, including a successful unchanged rerun of one transient Site Safety/WebDriver timeout; merged #2102 and completed retained local-runtime extraction.
- 2026-09-16: Closed stale runtime/verification integration candidates #1978, #1980, #2055, #1983, #1898 and #1900 without merge while preserving their history/source material.
- 2026-09-16: Updated #2113's canonical tests to retire obsolete positive world-sync expectations rather than restoring retired online behaviour.
- 2026-09-16: Qualified #2113 head `2fa216c6...`; one transient `v10-35-layout` shard timeout passed on an unchanged targeted retry.
- 2026-09-16: Merged #2113 as `c3549e6d45b7748f1efcf5c4f4ba134200325a5f`. Obsolete packet/world-sync runtime retirement is complete.
