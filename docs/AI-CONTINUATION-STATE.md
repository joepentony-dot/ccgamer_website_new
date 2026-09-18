# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` is the product work register. Live `main` remains authoritative when later merges or automation have advanced beyond a recorded checkpoint. The continuation records below supplement the product register with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Current autonomous Dungeon Carnage checkpoint — 18 September 2026

- Verified Dungeon runtime merge checkpoint on live `main`: `4c56d2bccd73350359c8b3246b0d70142894d353` — merged startup/first-visual remediation (#2145).
- Stage 7 #2140 remains merged as `f4fecd858fab8d43cd9d6732ab56495cfb313116`.
- Stage 8 #2141 merged from exact qualified head `e5d4333d4e8dc2912b2ffc9c5abc13f79d4b4a2d` as `53cba902af9dbf1e118f3f274836120f6c30bb40`.
- Exact Stage 8 qualification passed the dedicated itch.io package workflow, CCG Site Safety, Public Code Cache Version, SEO Automation, Native Mouse Wheel Scroll Contract, canonical/Node contracts and all six Lost Sizzler Chromium shards.
- Load Safety shard 2 initially timed out only in the unchanged `v10-41-stage8-scout-persistence.mjs` startup wait. The unchanged targeted shard retry passed; no runtime code, assertion or timeout was weakened.
- The qualified head produced artifact `C64-Dungeon-Carnage-Itch` (artifact ID `10533819282`, 21,109,428 bytes, SHA-256 `5bcb8a915490382327f16fba0ba6ea5dcc20e0b1ba9d156dfc5a5d2a438b3c38`).
- Stage 8 keeps the canonical CCG website runtime unchanged, excludes website account bootstraps and retired custom commerce from the staged package, preserves Solo/Tutorial/local Split Screen, and hands Weekly Vault back to the canonical website.
- Repository-side itch.io release preparation is complete. Public itch.io page creation, artifact upload/publication and the final public URL remain external release actions; no URL is invented in source.
- Startup/first-visual flicker remediation #2145 is repository-complete. Exact qualified head `432af71f6d19612a54e274f9114c6b3ef35e7450` merged as `4c56d2bccd73350359c8b3246b0d70142894d353`.
- #2145 moves release-loader ownership into the original HTML/render-blocking first visual state and pre-aligns the visible R55 button presentation before reveal. No artificial startup delay or gameplay ownership change was introduced.
- Exact #2145 qualification passed all eight triggered workflows, including Lost Sizzler Load Safety canonical/Node coverage and all six Chromium shards. Detailed checkpoint: `docs/ai-work/dungeon-carnage-startup-first-visual-2026-09-18.md`.
- The programme remains milestone-first; broad legacy cleanup stays backlog unless it blocks an active player-facing workstream.

### Manual acceptance state

Two product-level checks remain unresolved and must not be inferred from automated tests:

1. sustained Solo movement/firing/combat/pause-resume stability after #2129;
2. 3 Artefacts/Essences → 1 Banishment Flask without first buying a Gold Flask, while Gold and Score remain unchanged.

For both, record exactly:

**MANUAL ACCEPTANCE DEFERRED — USER CURRENTLY UNAVAILABLE TO TEST**

These deferred gates do not block independent repository work that does not depend on their outcome.

### Exact next action

1. Treat #2145 startup/first-visual remediation as repository-complete on merge `4c56d2bccd73350359c8b3246b0d70142894d353`; do not reopen it without new current-build evidence.
2. Keep the two Dungeon product acceptance checks explicitly deferred until the user is available to perform them.
3. Keep public itch.io page creation, artifact upload/publication and the final public URL as an external release gate.
4. Commodore Quest 3 repository reconstruction is complete in draft #2143 at exact head `15e48c3743775f2ba582134e9e04303e07bb4ea4`; all automated qualification is green. The next Quest action is the required hands-on browser playtest of The Bedroom and 36% Conversion Bout. Do not merge before that acceptance.
5. Treat the Content Publisher magazine/no-music repair as repository-complete: #2150 merged as `5223f5053bceee18e70e70440992f31ff2510c7d`, generated archive output #2157 merged as `bde682be7311c5206b390a4bcfbd52891bc83fbc`, and the Lemon refresh success-counter follow-up #2159 merged as `13311f9e8b7a0a9376bbd5ca84451eb37d908a40`. #2110 is closed unmerged and must not be revived merely to reintroduce game-music upload into the unified publisher.
6. Treat #1976 as source material only unless current-main evidence independently justifies re-deriving that optimisation.

## Single-game archive presentation checkpoint — 18 September 2026

- Shared individual-game presentation PR **#2146** merged as `50a527599b9521e07ec2c593703fcf7fc26858fb`.
- It applies through the common single-game CSS/runtime/template/generator owners, so the layout improvement is library-wide rather than Road Rash-specific.
- The implementation standardises the compact content frame, tightens desktop/mobile browsing, adds available-section navigation, reserves actual generated cover dimensions to reduce CLS, and improves year/platform search-social titles.
- Current-main reconciliation found no implementation-path overlap with later Dungeon or generated-video work. The only overlap was this continuation index, which has been reconciled onto the latest main checkpoint.
- Road Rash is now generated through the authoritative publishing chain and its canonical page materialises 21 magazine-review records with source links. Do not hand-edit that generated page; future changes must continue through source data and Reliable Games Publishing.

## Site-wide public layout and discovery follow-up — 18 September 2026

- Site-wide public layout PR **#2167** merged as `9cdc9aa8415ae83201704d139feedc97bf215ccd` from exact qualified head `790885738ca67938f26ce683cf3c319de55feda2`.
- Shared public archive/info density is tightened via scoped `data-ccg-page` rules in `ccg-master.css`; Home, single-game, quiz, admin, community-auth and arcade/game runtimes remain excluded.
- Exact-head layout qualification passed CCG Site Safety, E3/viewport/WARP/E6, navigation/PWA/SEO and all six Lost Sizzler Chromium shards. Older #2156 is closed as superseded.
- Site-wide public page SEO/discovery PR **#2170** merged as `a3c06e47857223cf9d155899b3204e6bc881b2d3` from exact head `3d4c6440ce2dd561f09edc5c6f0489ec6fef7634`.
- #2170 adds missing robots/social/schema/breadcrumb/preconnect coverage to seven bounded public pages and deliberately preserves the protected Home dual-hero preload contract.
- #2170 passed Site Safety, Structured Data, Social Metadata, SEO, Quiz/Retro Collections, PWA, navigation, year/platform and mouse-wheel validation.
- Stale #2151 and diagnostic-only #2168 are closed without merge as superseded/completed.
- This work is independent of Dungeon Carnage and Content Publisher runtime ownership.

## Historical checkpoint notes

- PR #2120 was a redundant movement-wrapper proposal and is closed without merge.
- Content Publisher PR #2150 is merged; generated archive output #2157 and refresh-counter follow-up #2159 are also merged. The older game-music endpoint PR #2110 is closed without merge as superseded.
- Diagnostic-only Defect 4 PR #2122 is closed without merge.
- #2102 is merged. The retained local Dungeon gameplay suffix lives in `game-local-runtime.js`.
- #2113 is merged. Obsolete networked Dungeon Multiplayer packet routing, remote-player simulation and world serializer/receiver logic is retired; only inert compatibility owners required by the local session shell remain.
- #2115 is merged. The full explored dungeon map supports Solo and local Split Screen, uses a dedicated non-playing map mode, and ignores held-M repeats.
- #2111 remains a merged SEO/video-page automation result. #2109 remains the authoritative merged game/archive publication result; these are separate generated-output scopes.
- Superseded runtime/documentation/generated-output PRs #2073, #2062, #1960, #1959, #1998, #2107, #1759 and #1752 remain closed without merge.
- Additional stale runtime/verification candidates #1978, #1980, #2055, #1983, #1898, #1900 and #1902 are closed without merge. #1976 remains source material for a possible current-main optimisation re-derivation.
- The old custom PayPal/private-download/browser-paywall chain is retired from the active PR queue: #1961–#1975 (excluding unrelated #1976), #1977, #1979, #1981 and #1987–#1994 are closed as superseded by the itch.io distribution decision.
- The old packaging/desktop stack #1958, #1982, #1984, #1985, #1986, #1995 and #1996 is also closed without merge as an integration vehicle. Its history remains source material only for a fresh current-main itch.io artifact.

## Current workstreams

| Workstream | Record | Current GitHub state |
| --- | --- | --- |
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md), [#2129 live regression checkpoint](ai-work/dungeon-carnage-live-freeze-cache-2026-09-17.md), and [#2145 first-visual checkpoint](ai-work/dungeon-carnage-startup-first-visual-2026-09-18.md) | Startup/first-visual remediation #2145 is merged as `4c56d2bccd73350359c8b3246b0d70142894d353` after exact-head full-matrix qualification. Repository-side itch.io preparation remains complete; two independent manual product gates remain deferred. |
| Dungeon Carnage commerce and distribution | [dungeon-carnage-commerce-distribution.md](ai-work/dungeon-carnage-commerce-distribution.md) | Stage 8 #2141 is merged and the verified standalone HTML5 artifact is repository-ready. Public itch.io page creation/upload/final URL remain external; the retired custom commerce/paywall and desktop/Windows graphs stay closed. |
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | #2150 is merged and the unified Content Publisher no longer exposes game-music upload. Magazine-source recovery is live/archive best-effort and no longer blocks canonical publishing. #2157 materialised the Road Rash archive/reviews and #2159 fixed the successful-refresh counter path. #2110 is closed unmerged as superseded. |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | Fresh draft #2143 is the qualified current-main Quest 3 candidate at exact head `15e48c3743775f2ba582134e9e04303e07bb4ea4`; all automated checks are green. Old #2056 is closed as superseded. Hands-on Bedroom + 36% Conversion Bout acceptance remains the merge gate. |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | #2146 individual-game presentation, #2167 site-wide public layout and #2170 bounded public-page discovery metadata are merged. Generated outputs remain workflow-owned; #2169 is the latest generated SEO/video automation merge observed before #2170. |

## Remaining non-Dungeon-defect PR classes at this checkpoint

- #2056 — **CLOSED / SUPERSEDED** by fresh current-main Quest 3 draft #2143. #2143 is exact-head automated-green and waiting only on the documented hands-on browser acceptance gate.
- #1976 — old R30 optimisation source material; re-derive only if the optimisation is still justified on current `main`.
- #1860 and #1852 — historical long-running containment/stabilisation branches. They are not safe bases for new Dungeon runtime work; reconcile their broader remaining account/backend or historical-evidence purpose separately before any closure or extraction decision.

## Always re-check before acting

- Inspect current `main`, the target branch, its merge base and changed paths.
- Query the live open-PR inventory and inspect status/checks for every PR the task could affect.
- Treat PR descriptions and continuation files as evidence, not authority: compare them with the actual current diff and workflow state.
- Do not infer that similarly named remote branches are active or ready; use an open PR or explicit ownership/evidence to establish relevance.
- Do not revive a closed/superseded branch merely because its code remains in Git history. Re-derive any still-useful idea against current `main`.

## Checkpoint update template

In the affected workstream file, record: date/time; branch/PR and base; verified current commit or merge-base relationship; files or interfaces touched; tests/checks actually run and result; blockers/decisions; and the smallest safe next action. If the open-PR inventory or top-level status changed materially, update this file too.
