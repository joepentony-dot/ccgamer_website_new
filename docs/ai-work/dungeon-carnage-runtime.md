# Dungeon Carnage runtime

## Scope

The browser game under `arcade/lost-sizzler/`, including retained local runtime extraction, campaign/biome work, UI, gameplay defects, and runtime contracts. Read `arcade/lost-sizzler/PROGRESS.md` for the product backlog, but prefer live `main` when later merges or automation have advanced beyond a recorded checkpoint.

## Verified checkpoint — 2026-09-16

The current runtime checkpoint is the merged #2115 supported Split Screen map stage:

- qualified head: `30c5871749d9015406bd98a7dc0123c7c6c0c8bc`
- merge commit: `95bd8431fd6b8313bf5873a79bd4bc93404d8de9`

#2102 moved the retained local gameplay suffix into `game-local-runtime.js`; #2113 retired the obsolete networked Dungeon Multiplayer packet/world-sync prefix from `game-network.js`; and #2115 restored the full explored map for supported local Split Screen without reviving retired online modes.

The live work register records #2098 R24 five-depth room grammar as present, the XP source boundary as present, networked Dungeon Multiplayer/Horde/Spy as retired modes, #2102 local-runtime extraction as present, #2113 obsolete transport retirement as present, #2115 local Split Screen full map as present, and #2090 held-fire/Flask repairs as awaiting hands-on acceptance.

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

Preserve Solo, Tutorial, local 2P Split Screen and Weekly Vault/account services. The obsolete packet/world-sync retirement is complete; do not reintroduce its online transport, remote-player simulation or world snapshots while cleaning up residual terminology or compatibility code.

The bounded retired-mode residue audit is complete. The next independently actionable repository scope is a small current-main reconstruction of still-valid startup/menu presentation ideas from closed #2055, after explicitly selecting only the required presentation behaviour. Do not restore retired online modes or combine that work with the separate local-runtime conditional cleanup, portal/topology/NPC/merchant work, or itch.io release path.

Manual acceptance remains separate from CI: #2090 sustained held-fire behaviour and the 3-Artefact Banishment Flask exchange still require hands-on confirmation on the deployed/current build before those reproduced defects are marked closed.

## Session log

- 2026-09-16: Reclassified #2062, #1960, #1959 and #1998 as superseded/obsolete; they are now closed without merge.
- 2026-09-16: Qualified #2102 head `dcb35f3e...`, including a successful unchanged rerun of one transient Site Safety/WebDriver timeout; merged #2102 and completed retained local-runtime extraction.
- 2026-09-16: Closed stale runtime/verification integration candidates #1978, #1980, #2055, #1983, #1898 and #1900 without merge while preserving their history/source material.
- 2026-09-16: Updated #2113's canonical tests to retire obsolete positive world-sync expectations rather than restoring retired online behaviour.
- 2026-09-16: Qualified #2113 head `2fa216c6...`; one transient `v10-35-layout` shard timeout passed on an unchanged targeted retry.
- 2026-09-16: Merged #2113 as `c3549e6d45b7748f1efcf5c4f4ba134200325a5f`. Obsolete packet/world-sync runtime retirement is complete.
- 2026-09-16: Closed stale #1902 and rebuilt its still-valid local Split Screen map behaviour as #2115 on current `main`. The exact head `30c58717...` passed the complete matrix after an unchanged retry of an unrelated `v10-28-browser-stability-deterministic.mjs` startup timeout; #2115 merged as `95bd8431fd6b8313bf5873a79bd4bc93404d8de9`.

- 2026-09-16: Completed the bounded current-main retired-mode residue audit at `e9adbd16...`. No retired Horde/Spy module is loaded by the supported page bootstrap; the retained network boundary is inert. Kept historical source/evidence and local-runtime online guards untouched because broader removal requires a dedicated local-runtime contract.
