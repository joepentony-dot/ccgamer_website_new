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
5. Keep #2110 parked behind its documented Cloudflare configuration blocker; do not rebase or retest it solely because `main` advanced.
6. Treat #1976 as source material only unless current-main evidence independently justifies re-deriving that optimisation.

## Single-game archive presentation checkpoint — 18 September 2026

- Shared individual-game presentation work is in PR **#2146** on `codex/single-game-premium-layout-seo`.
- It applies through the common single-game CSS/runtime/template/generator owners, so the layout improvement is library-wide rather than Road Rash-specific.
- The implementation standardises the compact content frame, tightens desktop/mobile browsing, adds available-section navigation, reserves actual generated cover dimensions to reduce CLS, and improves year/platform search-social titles.
- Current-main reconciliation found no implementation-path overlap with later Dungeon or generated-video work. The only overlap was this continuation index, which has been reconciled onto the latest main checkpoint.
- Road Rash remains a separate publishing-output issue until `/games/road-rash/` is generated successfully; do not hand-edit the canonical generated page.

## Site-wide public layout audit checkpoint — 18 September 2026

- Merged individual-game presentation PR #2146 as `50a527599b9521e07ec2c593703fcf7fc26858fb`; its shared changes apply to all individual game pages.
- Follow-up branch `codex/site-wide-public-layout-audit` audits the remaining public sitemap families from that merged main.
- Public sitemap inventory at branch start: 387 non-game routes + 660 game routes = 1,047 routed public URLs.
- High-impact shared families changed on the follow-up branch: publishers, developers, year/platform archives, retro video details (Retro Specials / Retro Events / Amiga Demo Music), and music/composer pages.
- Home, Games Index, genre/collection Omega pages, info pages, community/account and Complete Index were audited but not broadly overridden because their existing width/density systems are already closer to the target and changing them would add regression risk without a concrete gain.
- Detailed scope and guardrails: `docs/ai-work/site-wide-public-layout-audit-2026-09-18.md`.
- Do not hand-edit generated page instances to reproduce these changes; preserve the shared CSS/generator ownership model.

## Historical checkpoint notes

- PR #2120 was a redundant movement-wrapper proposal and is closed without merge.
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
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | #2103 and #2105 are merged; #2073 is closed. #2110 remains the current draft endpoint follow-up but is **BLOCKED** by missing/mismatched Cloudflare runtime configuration. Repository-side work for that blocker is already complete. |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | Fresh draft #2143 is the qualified current-main Quest 3 candidate at exact head `15e48c3743775f2ba582134e9e04303e07bb4ea4`; all automated checks are green. Old #2056 is closed as superseded. Hands-on Bedroom + 36% Conversion Bout acceptance remains the merge gate. |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | PR #2146 owns the current shared individual-game layout/CWV/SEO refinement; later generated SEO/video commits remain separate. #2109 and #2111 are prior merged publication/automation checkpoints. |

## Remaining non-Dungeon-defect PR classes at this checkpoint

- #2110 — deliberately deferred **BLOCKED** Content Publisher endpoint follow-up; do not rebase/retest solely because `main` advanced.
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
