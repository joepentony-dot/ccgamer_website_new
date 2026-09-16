# Dungeon Carnage runtime

## Scope

The browser game under `arcade/lost-sizzler/`, including retained local runtime extraction, campaign/biome work, UI, gameplay defects, and runtime contracts. Read `arcade/lost-sizzler/PROGRESS.md` on current `main` first: it is the live Dungeon Carnage work register. This file adds PR/branch reconciliation and must not reactivate work that `PROGRESS.md` marks present, retired, or superseded.

## Verified checkpoint — 2026-09-16

Current `main` is `fa25ee38bd97426a392b7415ae3534793eb4fcd9`.

The live work register still correctly records #2098 R24 five-depth room grammar as present, the XP source boundary as present, networked Dungeon Multiplayer/Horde/Spy as retired modes, and #2090 held-fire/Flask repairs as awaiting hands-on acceptance. Its audit SHA is older than current `main`, and its separate-work reference to #2073 is stale because #2105 has since merged.

### Current runtime candidate

| PR | Branch | State | Focus |
| --- | --- | --- | --- |
| #2102 | `codex/dungeon-carnage-extract-local-runtime` | draft, fully qualified | Current guarded extraction of the retained local helper block from `game-network.js`. Head `dcb35f3e1271284e95f4e17de3d192f384ee4682` is based exactly on live `main`: 15 commits ahead, 0 behind, with exactly 11 changed Dungeon files. Keep unmerged without explicit user authorization. |

#2102 current exact delta remains the intended 11 files:

- `arcade/lost-sizzler/index.html`
- `arcade/lost-sizzler/js/game-network.js`
- `arcade/lost-sizzler/js/game-local-runtime.js`
- `arcade/lost-sizzler/js/v10-42-bootstrap.js`
- seven focused Dungeon regression/support files

The branch mechanically moves the retained `hostEnemyStep(...)` through `dropInventorySlot(...)` local gameplay suffix out of `game-network.js`, preserves the obsolete transport prefix for later retirement, and retains the queued early Solo/Split start repair discovered during qualification. It does not delete `game-network.js` or retire the remaining transport in this stage.

### Exact-head qualification

Current head `dcb35f3e1271284e95f4e17de3d192f384ee4682` is green across the current PR-triggered matrix:

- Lost Sizzler Load Safety — PASS
- CCG Site Safety — PASS after rerunning the unchanged failed job
- C64 Dungeon Carnage Mobile Trap Layout — PASS
- Public Code Cache Version — PASS
- Native Mouse Wheel Scroll — PASS
- SEO Automation — PASS
- Structured Data Validation — PASS
- Social Metadata Validation — PASS

The first CCG Site Safety attempt failed only while creating the rendered responsive WebDriver session with an Undici timeout. All preceding syntax/static/layout checks had passed. The failed job was rerun without any code or test change; rendered responsive audit, physical scroll reachability and every subsequent safety audit then passed. Treat the first red as transient CI/browser infrastructure evidence, not a production regression.

### Stale or superseded runtime PRs

| PR | Classification | Reconciliation |
| --- | --- | --- |
| #2062 | **SUPERSEDED** | Its R24 five-depth biome-room goal was refreshed on post-defect `main` and merged through #2098. Do not merge or rebase #2062. |
| #1960 | **SUPERSEDED** | The XP-source-boundary patch was reapplied and merged through #2052; current `main` records the XP boundary as present. |
| #1959 | **OBSOLETE PRODUCT-MODE WORK** | It repairs a Spy soak contract. Spy/Sizzler Saboteurs is a retired product mode and #2069 removed remaining Spy runtime seals. Do not use this as a supported-mode requirement. |
| #1998 | **SUPERSEDED DOCUMENTATION** | Its project-status refresh is older than the merged #2100 `arcade/lost-sizzler/PROGRESS.md` work register. |
| #2055 | **STALE SOURCE MATERIAL** | Startup/menu simplification remains potentially useful design source material, but it predates substantial mode-retirement/runtime work. Rebuild only still-valid presentation pieces as small current-main stages; do not merge it wholesale. |
| #1983 | **STALE / REPRODUCTION REQUIRED** | Do not revive old startup-overlay work unless the defect reproduces on the current deployed/current build. |

### Other unresolved but stale candidates

- #1976 (R30 ownership-audit throttle) may still contain a useful optimisation idea, but it must be re-derived against current `main`; #1978/#1980 are stale evidence children, not independent integration candidates.
- #1902 concerns a still-supported Split Screen map behaviour but is old; compare its delta with current `main` before deciding whether anything remains missing.
- #1900, #1898, #1860 and #1852 are historical diagnostic/stabilisation branches and are not safe bases for new work.
- #1958 belongs to the distribution/packaging workstream, not current Dungeon runtime integration.

## Guardrails and next action

Preserve Solo, Tutorial, local 2P Split Screen and Weekly Vault/account services while retiring obsolete network transport. Do not stack new runtime work on an old PR without checking current `PROGRESS.md`, ordered loading and newer ownership first.

Next safe runtime action: #2102 is qualified and structurally current, but remains draft and unmerged pending explicit user authorization. After that stage, obsolete online transport can be retired in a separate guarded step rather than mixed into the extraction.

Manual acceptance remains separate from CI: #2090 sustained held-fire behaviour and the 3-Artefact Banishment Flask exchange still require hands-on confirmation on the deployed/current build before those reproduced defects are marked closed.

## Session log

- 2026-09-16: Reclassified #2062 as superseded by #2098, #1960 as superseded by #2052, #1959 as obsolete after Spy retirement/#2069, and #1998 as superseded documentation.
- 2026-09-16: Earlier #2102 head `52cd8192...` passed the complete matrix; a later assertion-only head advanced the PR to `dcb35f3e...` on top of current `main`.
- 2026-09-16: Live re-audit confirmed #2102 is 15 ahead/0 behind current `main` with exactly 11 intended files. Its first Site Safety run failed on a WebDriver-session timeout; the unchanged failed job rerun passed every Site Safety step. Current exact head is fully green and remains unmerged pending explicit authorization.
