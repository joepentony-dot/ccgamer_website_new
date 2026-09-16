# Dungeon Carnage runtime

## Scope

The browser game under `arcade/lost-sizzler/`, including retained local runtime extraction, campaign/biome work, UI, gameplay defects, and runtime contracts. Read `arcade/lost-sizzler/PROGRESS.md` on current `main` first: it is the live Dungeon Carnage work register. This file adds PR/branch reconciliation and must not reactivate work that `PROGRESS.md` marks present, retired, or superseded.

## Verified checkpoint — 2026-09-16

`origin/main` is `e40f5c4f`. The current live register on `main` already records #2098 R24 five-depth room grammar as present, the XP source boundary as present, networked Dungeon Multiplayer/Horde/Spy as retired modes, and the guarded local-runtime extraction as the next code cleanup after #2096.

### Current runtime candidate

| PR | Branch | State | Focus |
| --- | --- | --- | --- |
| #2102 | `codex/dungeon-carnage-extract-local-runtime` | draft | Current guarded extraction of the retained local helper block from `game-network.js`. Frozen at `52cd8192fca707423d48fc77761195c231619ffe`; against current `main` it is 14 commits ahead and only the later generated-output #2101 commit behind. Exact-head canonical Node, six-shard Chromium, safety, mobile, cache/version, validation, SEO, native-wheel and Workers checks passed. Keep frozen and unmerged without explicit authorization. |

### Stale or superseded runtime PRs

| PR | Classification | Reconciliation |
| --- | --- | --- |
| #2062 | **SUPERSEDED** | Its R24 five-depth biome-room goal was refreshed on post-defect `main` and merged through #2098. Do not merge or rebase #2062. |
| #1960 | **SUPERSEDED** | The XP-source-boundary patch was reapplied and merged through #2052; current `main` records the XP boundary as present. |
| #1959 | **OBSOLETE PRODUCT-MODE WORK** | It repairs a Spy soak contract. Spy/Sizzler Saboteurs is a retired product mode and #2069 removed remaining Spy runtime seals. Do not use this as a supported-mode requirement. |
| #1998 | **SUPERSEDED DOCUMENTATION** | Its project-status refresh is older than the merged #2100 `arcade/lost-sizzler/PROGRESS.md` current work register. |
| #2055 | **STALE SOURCE MATERIAL** | Startup/menu simplification remains a useful design source, but the branch is 182 commits behind and contains assumptions from before later mode retirement. Rebuild only still-valid presentation pieces as small current-main stages; do not merge it wholesale. |
| #1983 | **STALE / REPRODUCTION REQUIRED** | Startup-overlay work is 366 commits behind current main. Do not revive it unless the defect reproduces on the current deployed/current build after later identity and startup changes. |

### Other unresolved but stale candidates

- #1976 (R30 ownership-audit throttle) has no evidence of being merged and may still contain a useful runtime optimisation, but it is an old base and must be re-derived against current `main` before use.
- #1978 and #1980 are old verification/evidence children of #1976 and should not be treated as independent merge candidates.
- #1902 (split-screen M map) is old but concerns a still-supported mode; compare its exact delta with current main before deciding whether anything remains missing.
- #1900, #1898, #1860 and #1852 are long-lived historical diagnostic/stabilisation branches. They are not safe bases for new work and must not be merged wholesale.
- #1958 is primarily an old offline-package foundation and is handled in the distribution workstream; it is not a current Dungeon runtime integration candidate.

## Guardrails and next action

Do not stack new runtime work on an old PR without first checking current `arcade/lost-sizzler/PROGRESS.md`, current ordered script loading, and whether newer merged work already owns the requested behaviour. Preserve Solo, Tutorial, local 2P Split Screen and Weekly Vault/account services while retiring obsolete network transport.

Next safe runtime action: keep #2102 frozen at `52cd8192fca707423d48fc77761195c231619ffe` and review/merge it only with explicit authorization after reconfirming its exact 11-file delta and green exact-head evidence. Later network-adapter retirement branches audited on 2026-09-16 are stale/divergent and do not supersede #2102.

Manual acceptance remains separate from CI: `PROGRESS.md` still requires hands-on confirmation of #2090 held-fire behaviour and the 3-Artefact Banishment Flask exchange before those reproduced defects are closed.

## Session log

- 2026-09-16: Reconciled this record against current `main` and the newer merged #2100 work register. Reclassified #2062 as superseded by #2098, #1960 as superseded by #2052, #1959 as obsolete after Spy retirement/#2069, and #1998 as superseded documentation. No Dungeon runtime code changed.
- 2026-09-16: Re-audited current `main`, all active runtime PRs and same-topic candidate branches. Corrected only the stale queued-start source assertion on #2102; no runtime logic changed. Exact head `52cd8192fca707423d48fc77761195c231619ffe` passed the complete fresh matrix and remains draft/unmerged pending explicit authorization.
- 2026-09-16: Initial continuation checkpoint created from a fetch of `origin` and the live GitHub open-PR inventory. No runtime code changed.
