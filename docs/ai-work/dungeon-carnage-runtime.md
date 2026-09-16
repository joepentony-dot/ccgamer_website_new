# Dungeon Carnage runtime

## Scope

The browser game under `arcade/lost-sizzler/`, including retained local runtime extraction, campaign/biome work, UI, gameplay defects, and runtime contracts. Read `arcade/lost-sizzler/PROGRESS.md` for the product backlog, but prefer live `main` when later merges or automation have advanced beyond a recorded checkpoint.

## Verified checkpoint — 2026-09-16

The material runtime checkpoint is the merged #2102 stage:

- qualified head: `dcb35f3e1271284e95f4e17de3d192f384ee4682`
- merge commit: `5112035f0d1f3c80fdb4fa2c6c83ff0228778600`

Later merged #2111 generated SEO/video pages and #2104 continuation/governance documentation did not change Dungeon runtime ownership. Always re-check live `main` before starting the next runtime stage.

The live work register correctly records #2098 R24 five-depth room grammar as present, the XP source boundary as present, networked Dungeon Multiplayer/Horde/Spy as retired modes, #2102 local-runtime extraction as present, and #2090 held-fire/Flask repairs as awaiting hands-on acceptance.

### Completed runtime stage

#2102, `codex/dungeon-carnage-extract-local-runtime`, is **MERGED**.

The merged stage:

- moved the retained local gameplay suffix from `game-network.js` into `game-local-runtime.js`
- kept the obsolete online packet/world-sync prefix in `game-network.js` for a later guarded retirement stage
- loaded `game-local-runtime.js` immediately after `game-network.js` and before `game-play.js`
- preserved Solo, Tutorial, local 2P Split Screen, Weekly Vault/account, save/progression and established gameplay ownership
- retained the queued early Solo/Split start repair discovered during qualification
- did not delete `game-network.js` or remove the remaining transport prefix

### Merge qualification evidence

The exact #2102 head was green across the current PR-triggered matrix before merge:

- Lost Sizzler Load Safety — PASS
- CCG Site Safety — PASS after rerunning the unchanged failed job
- C64 Dungeon Carnage Mobile Trap Layout — PASS
- Public Code Cache Version — PASS
- Native Mouse Wheel Scroll — PASS
- SEO Automation — PASS
- Structured Data Validation — PASS
- Social Metadata Validation — PASS

The first CCG Site Safety attempt failed only while creating the rendered responsive WebDriver session with an Undici timeout. The unchanged failed job rerun passed rendered responsive audit, physical scroll reachability and every subsequent safety step. No production code, timeout or assertion was changed to obtain green.

### Retired stale/superseded runtime PRs

| PR | Classification | Current state |
| --- | --- | --- |
| #2062 | **SUPERSEDED** by merged #2098 R24 refresh | Closed without merge |
| #1960 | **SUPERSEDED** by merged/current XP-source boundary | Closed without merge |
| #1959 | **OBSOLETE PRODUCT-MODE WORK** after Spy retirement | Closed without merge |
| #1998 | **SUPERSEDED DOCUMENTATION** by merged #2100 work register | Closed without merge |
| #2055 | **STALE SOURCE MATERIAL** | Remains open; do not merge wholesale. Rebuild only still-valid presentation pieces on current `main`. |
| #1983 | **STALE / REPRODUCTION REQUIRED** | Do not revive unless the startup-overlay defect reproduces on the current deployed build. |

### Other unresolved but stale candidates

- #1976 (R30 ownership-audit throttle) may contain a useful optimisation idea, but it must be re-derived against current `main`; #1978/#1980 are stale evidence children, not independent integration candidates.
- #1902 concerns a still-supported Split Screen map behaviour but is old; compare its delta with current `main` before deciding whether anything remains missing.
- #1900, #1898, #1860 and #1852 are historical diagnostic/stabilisation branches and are not safe bases for new work.
- #1958 belongs to the distribution/packaging workstream, not current Dungeon runtime integration.

## Guardrails and next action

Preserve Solo, Tutorial, local 2P Split Screen and Weekly Vault/account services while retiring obsolete network transport. Do not delete `game-network.js` wholesale: after #2102 it still owns the remaining obsolete online packet/world-sync prefix.

Next safe runtime code stage, when this workstream is resumed, is a **separate guarded retirement of that obsolete online transport prefix** against current `main`. Do not mix that stage with portal, topology, NPC/merchant, menu or release-distribution work.

Manual acceptance remains separate from CI: #2090 sustained held-fire behaviour and the 3-Artefact Banishment Flask exchange still require hands-on confirmation on the deployed/current build before those reproduced defects are marked closed.

## Session log

- 2026-09-16: Reclassified #2062, #1960, #1959 and #1998 as superseded/obsolete; they are now closed without merge.
- 2026-09-16: Qualified #2102 head `dcb35f3e...`, including a successful unchanged rerun of one transient Site Safety/WebDriver timeout.
- 2026-09-16: Merged #2102 with an expected-head guard. The retained local runtime extraction is complete.
- 2026-09-16: Post-merge reconciliation confirmed later #2111/#2104 changes did not alter Dungeon runtime ownership.
