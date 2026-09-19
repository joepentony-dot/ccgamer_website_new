# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` is the product work register. Live `main` remains authoritative when later merges or automation have advanced beyond a recorded checkpoint. The continuation records below supplement the product register with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Current autonomous Dungeon Carnage checkpoint — 18 September 2026

- Live repository `main`: `66c2aa8441fc67961e1b3fa116da6537ea41002b`, the documentation-only checkpoint merge #2183 on top of runtime merge #2182 (`4319ff84ea8bca41559347915d0ab5d2c1a0e873`; exact runtime head `dfce128672fd90c8edf7900b3bac3a14095e58fe`).
- #2180 merged from exact head `c51522ab2b9b97046f23ed492d68a94b8fc3233f` as `bf4cfa4b68f1bc14bf89e81e71fa35fa585b2fb3`. It keeps the canonical loader authoritative when premature run/tutorial active-state flags appear before V10.42 release readiness.
- #2181 merged from exact head `275773ccdab4e6ca20b4bae77bff2847fac5b66c` as `69ba137423b0f435af9b5a6577b77c64668015e1`. It changes only the production-smoke expected build/cache identity to `V10.42 r34` / `20260918r34`.
- The post-#2181 production smoke reached the correct release generation but exposed one separate stale-browser presentation defect: the current Update Available badge could be overwritten by the legacy V10.41 brand observer.
- #2182 adds one guard in `v10-41-landing-notification-polish.js` so the legacy observer stops writing release labels when `CCGLostSizzlerVersion.state.outdated === true`. No gameplay, loader, movement, combat, save, progression, shop, Banishment, packaging or menu-flow ownership changed.
- #2182 exact-head qualification passed C64 Dungeon Carnage itch.io Package, Public Code Cache Version, Native Mouse Wheel Scroll Contract and Lost Sizzler Load Safety, including canonical/Node, discovery and all six Chromium shards.
- Latest qualified runtime/package artifact: `C64-Dungeon-Carnage-Itch`, artifact ID `10566350206`, 21,111,022 bytes, GitHub Actions SHA-256 `147782cb38cab392817b1bd4670f670ca0bcc2d51264839378d50bf229237be6`, workflow run `35390021405`, exact head `dfce128672fd90c8edf7900b3bac3a14095e58fe`.
- The push-triggered **Lost Sizzler Production Smoke** passed on deployed current `main` `66c2aa8441fc67961e1b3fa116da6537ea41002b` in workflow run `35397906108`. It verified live `V10.42 r34 / 20260918r34`, matching `version.json`, the stale-browser Update Available prompt, feedback endpoint validation/CORS, and the Weekly Vault read/backend projection. Deploy GitHub Pages, live public-navigation verification and push Load Safety also passed for the same mainline.
- Three product-level hands-on gates remain unresolved: current deployed startup acceptance, sustained Solo movement/firing/combat/pause-resume stability, and the three-Artefact/Essence Banishment Flask exchange.
- No new Dungeon coding stage is justified unless one of the three remaining hands-on gates exposes a reproducible defect.

### Exact next action

1. On deployed current main `66c2aa8441fc67961e1b3fa116da6537ea41002b`, require a direct loader → final V10.42 menu transition with no compact/intermediate flash and no loader → page → loader pulse.
2. Complete sustained Solo acceptance.
3. Complete the three-Artefact/Essence Banishment Flask exchange acceptance.
4. Only after those gates pass, publish the latest qualified runtime itch.io artifact and verify Solo, Tutorial, local 2P Split Screen and Weekly Vault website handoff.
5. Reopen repository code only for new evidence or an explicit new feature request.

## Historical Dungeon Carnage checkpoint — earlier 18 September 2026

- Verified Dungeon runtime merge checkpoint: `38c79b61271be59791fe5f46dbc796b243f317dc` — merged module-startup loader-flicker correction (#2164). Live repository `main` is now `74e6147d28333e0d6082d7fc69a42a20bc0b52f7`; later commits are documentation/website work, not a newer Dungeon runtime.
- Stage 7 #2140 remains merged as `f4fecd858fab8d43cd9d6732ab56495cfb313116`.
- Stage 8 #2141 merged from exact qualified head `e5d4333d4e8dc2912b2ffc9c5abc13f79d4b4a2d` as `53cba902af9dbf1e118f3f274836120f6c30bb40`.
- Exact Stage 8 qualification passed the dedicated itch.io package workflow, CCG Site Safety, Public Code Cache Version, SEO Automation, Native Mouse Wheel Scroll Contract, canonical/Node contracts and all six Lost Sizzler Chromium shards.
- Load Safety shard 2 initially timed out only in the unchanged `v10-41-stage8-scout-persistence.mjs` startup wait. The unchanged targeted shard retry passed; no runtime code, assertion or timeout was weakened.
- The original Stage 8 artifact is superseded as the publication candidate by the pinned post-#2164 runtime artifact: `C64-Dungeon-Carnage-Itch`, artifact ID `10561459333`, 21,110,985 bytes, GitHub Actions SHA-256 `f8a2142824b41b85d29006cf72d52c511b2bce9e879178ad9d45f4700a38c464`, workflow run `35380506012`. Documentation-only package reruns do not supersede it unless Dungeon runtime/package inputs change.
- Stage 8 keeps the canonical CCG website runtime unchanged, excludes website account bootstraps and retired custom commerce from the staged package, preserves Solo/Tutorial/local Split Screen, and hands Weekly Vault back to the canonical website.
- Repository-side itch.io release preparation is complete. Public itch.io page creation, artifact upload/publication and the final public URL remain external release actions; no URL is invented in source.
- Startup remediation progressed beyond #2145 after hands-on evidence. #2153 exact head `8a2fc01022612a13d0c4f52f276a4d7d62deee4e` merged as `ba75374ea45871e24885a0d2cdbd57bb61f1ae95`, preventing reveal before authoritative V10.42 menu composition. #2164 exact head `43b916c3b974628446c2c9eeb55e66f47b8b14e9` merged as `38c79b61271be59791fe5f46dbc796b243f317dc`, removing the transient legacy release-ready CSS hide that caused loader → page → loader flicker. Automated qualification is complete; deployed hands-on startup retest after #2164 remains required. Detailed checkpoint: `docs/ai-work/dungeon-carnage-startup-first-visual-2026-09-18.md`.
- The programme remains milestone-first; broad legacy cleanup stays backlog unless it blocks an active player-facing workstream.

### Manual acceptance state

Three product-level checks remain unresolved and must not be inferred from automated tests:

1. deployed startup retest after #2164: no compact/intermediate menu flash and no loader → page → loader pulse;
2. sustained Solo movement/firing/combat/pause-resume stability after #2129;
3. 3 Artefacts/Essences → exactly 1 Banishment Flask without first buying a Gold Flask, while Gold and Score remain unchanged.

**MANUAL ACCEPTANCE REQUIRED — AUTOMATED QUALIFICATION DOES NOT SUBSTITUTE FOR THESE GATES**

No further Dungeon coding stage is justified unless one of these checks exposes a reproducible defect.

### Exact next action

1. Retest the deployed/current Dungeon build after #2164 and require a direct loader → final V10.42 menu transition.
2. If startup passes, complete sustained Solo acceptance.
3. Complete the three-Artefact/Essence Banishment Flask exchange acceptance.
4. After all hands-on gates pass, upload the latest qualified itch.io artifact and verify Solo, Tutorial, local 2P Split Screen and Weekly Vault website handoff before publication.
5. Do not create new Dungeon repository work merely to keep development active; reopen only for a verified defect or explicit new feature request.

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
- #1852 is closed without merge as a superseded historical Solo-stabilisation integration branch.
- #2102 is merged. The retained local Dungeon gameplay suffix lives in `game-local-runtime.js`.
- #2113 is merged. Obsolete networked Dungeon Multiplayer packet routing, remote-player simulation and world serializer/receiver logic is retired; only inert compatibility owners required by the local session shell remain.
- #2115 is merged. The full explored dungeon map supports Solo and local Split Screen, uses a dedicated non-playing map mode, and ignores held-M repeats.
- #2111 remains a merged SEO/video-page automation result. #2109 remains the authoritative merged game/archive publication result; these are separate generated-output scopes.
- Superseded runtime/documentation/generated-output PRs #2073, #2062, #1960, #1959, #1998, #2107, #1759 and #1752 remain closed without merge.
- Additional stale runtime/verification candidates #1978, #1980, #2055, #1983, #1898, #1900 and #1902 are closed without merge. #1976 is also closed without merge; its optimisation history remains source material only.
- The old custom PayPal/private-download/browser-paywall chain is retired from the active PR queue: #1961–#1975 (excluding unrelated #1976), #1977, #1979, #1981 and #1987–#1994 are closed as superseded by the itch.io distribution decision.
- The old packaging/desktop stack #1958, #1982, #1984, #1985, #1986, #1995 and #1996 is also closed without merge as an integration vehicle. Its history remains source material only for a fresh current-main itch.io artifact.

## Current workstreams

| Workstream | Record | Current GitHub state |
| --- | --- | --- |
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md), [#2129 live regression checkpoint](ai-work/dungeon-carnage-live-freeze-cache-2026-09-17.md), and [startup/first-visual checkpoint](ai-work/dungeon-carnage-startup-first-visual-2026-09-18.md) | Runtime is merged through #2182; current main is `66c2aa8441fc67961e1b3fa116da6537ea41002b`. Exact-head qualification, deployment, production smoke, live navigation and push Load Safety are green. Only the three documented hands-on product gates remain. |
| Dungeon Carnage commerce and distribution | [dungeon-carnage-commerce-distribution.md](ai-work/dungeon-carnage-commerce-distribution.md) | Stage 8 #2141 is merged and the verified standalone HTML5 artifact is repository-ready. Public itch.io page creation/upload/final URL remain external; the retired custom commerce/paywall and desktop/Windows graphs stay closed. |
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | #2150 is merged and the unified Content Publisher no longer exposes game-music upload. Magazine-source recovery is live/archive best-effort and no longer blocks canonical publishing. #2157 materialised the Road Rash archive/reviews and #2159 fixed the successful-refresh counter path. #2110 is closed unmerged as superseded. |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | Draft #2176 is the current Quest 3 reconstruction at exact head `09a11f2ce26b4ba5848b29e75ad33534212a0458`; all automated checks are green. Current `main` has advanced without touching any of the 17 candidate paths, so no drift-only rebase is justified. Hands-on Bedroom + 36% Conversion Bout acceptance remains the merge gate. |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | #2146 individual-game presentation, #2167 site-wide public layout and #2170 bounded public-page discovery metadata are merged. Generated outputs remain workflow-owned; #2169 is the latest generated SEO/video automation merge observed before #2170. |

## Remaining active draft PR classes at this checkpoint

- #2176 — Quest 3 current-main reconstruction; exact-head automated qualification is green and current-main drift does not touch its 17 candidate paths. The documented Bedroom + 36% Conversion Bout hands-on browser acceptance remains the merge gate.
- #1860 — Supabase-egress/account/backend containment programme; remains draft and requires its own staging/authenticated acceptance gates before any production cut-over decision.
- #1976 — **CLOSED / SUPERSEDED AS ACTIVE WORK**. Historical R30 optimisation source material only.
- #1852 — **CLOSED / SUPERSEDED**. Historical Solo-stabilisation integration branch only; the current Dungeon programme and manual gates are tracked elsewhere.

## Always re-check before acting

- Inspect current `main`, the target branch, its merge base and changed paths.
- Query the live open-PR inventory and inspect status/checks for every PR the task could affect.
- Treat PR descriptions and continuation files as evidence, not authority: compare them with the actual current diff and workflow state.
- Do not infer that similarly named remote branches are active or ready; use an open PR or explicit ownership/evidence to establish relevance.
- Do not revive a closed/superseded branch merely because its code remains in Git history. Re-derive any still-useful idea against current `main`.

## Checkpoint update template

In the affected workstream file, record: date/time; branch/PR and base; verified current commit or merge-base relationship; files or interfaces touched; tests/checks actually run and result; blockers/decisions; and the smallest safe next action. If the open-PR inventory or top-level status changed materially, update this file too.
