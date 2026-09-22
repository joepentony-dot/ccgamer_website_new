# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` is the product work register. Live `main` remains authoritative when later merges or automation have advanced beyond a recorded checkpoint. The continuation records below supplement the product register with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Active Dungeon Carnage r47 release-blocker candidate — 22 September 2026

- Draft PR #2226 on branch `codex/dungeon-r47-release-blockers` is the active bounded pre-release candidate. It advances the published identity to `V10.42 r47` / `20260922r47`; it is **not release-qualified or merged until its final exact head is fully green**.
- The recurring Inventory → return-to-game → FIRE failure is addressed by a transition recovery boundary that preserves the established `firePlayer` / `queueAttack` owners. Inventory closure resets established attack cadence, repairs stale mode/timers through existing stability owners, restores gameplay focus, then verifies the next valid FIRE intent. Only if the normal path produces no activity does it invoke the existing r20 `attackNow()` fallback.
- The Floor-3 Memory Tile challenge is redesigned from the hazardous 3×3 grid into five numbered, spaced pads in a straight horizontal or vertical line plus a separate purple replay console. Only deliberate player movement counts as a memory input; forced knockback does not. A wrong pad now spawns exactly one monster, pauses the puzzle and waits for deliberate replay.
- Dungeon firearm progression is now sword-first and single-weapon: Archive Sword remains the initial unlimited-melee state; the first weapon pickup acquires Tier 1 Field Pulse; later weapon pickups improve that one firearm subject to floor caps F1→T2, F2→T3, F3→T4, F4→T5 and F5→T6. Three-way fire first unlocks at Tier 4 / Floor 3. Weapon drops at the current floor cap are salvaged into ammunition instead of accumulating redundant guns.
- A bounded developer incident recorder is included. Opt in with `?bugreport=1` (persisted locally), then use the **REPORT BUG** control on desktop/mobile or F8 on desktop immediately after a fault. It records recent input/panel/focus transitions, FIRE timers/buffers, ammo/projectiles, player/weapon state, Memory Pad state, runtime errors and relevant stability diagnostics; it produces copyable text plus JSON and does not claim gameplay/input/render ownership.
- Qualification has already exposed and corrected two stale static-contract assumptions rather than weakening behavior: one r46 release-identity regex after the r47 cache bump, and the mobile trap static source contract expecting legacy `movementTriggers(p)` instead of r47's deliberate `movementTriggers(p,true)`. The dedicated live mobile geometry/trap-damage job remained green while the latter static mismatch was diagnosed.
- The r46 artifact remains the last qualified publication artifact until #2226's final exact head passes the complete matrix and a new r47 package is produced.

### r47 hands-on acceptance after merge

1. Confirm Inventory can be opened/closed repeatedly on keyboard and mobile, followed immediately by successful FIRE every time; if it fails, capture the incident with REPORT BUG before refreshing.
2. On Floor 3, confirm the five numbered Memory Pads are spaced, the centre route is safe, the purple console can replay the sequence without penalty, knockback cannot register a pad, and a deliberate wrong pad spawns exactly one enemy.
3. Confirm the Archive Sword start, first-firearm acquisition, one-firearm-only Inventory presentation, Floor-3 three-way unlock and capped-pickup ammunition salvage feel balanced in real play.
4. Retain the existing startup, sustained Solo/pause-resume, Banishment Flask, mobile trap, mobile camera/landing, r46 visual-presentation and Level-4 directional-torch acceptance gates.
5. Only after r47 gameplay/manual acceptance should the latest qualified itch.io package move to final publication verification.

## Current autonomous Dungeon Carnage checkpoint — 21 September 2026

- Latest verified Dungeon runtime merge checkpoint is now #2222: exact qualified head `d27d714f5d15757e360ce27b49b4d185e379e56d`, merged as `cbbf9a97eb1f83c21eea3a519fd707af28be22bd`. It is based directly on merged #2220 (`f2d5332ceca250861e79185c943b8098c001894a`), which repaired the Level 2 floor-simulation slowdown/trap-cycle liveness regression. #2222 advances build/cache to `V10.42 r46` / `20260921r46`, adds the bounded final visual-maximisation layer, and changes only the Level 3 E/N/W/S torch wrong-answer penalty to exactly one spawned monster.
- #2222 final visual polish consumes established biome/room metadata, wraps existing render/trap presentation owners, adds no perpetual polling/render loop, and declares no simulation, collision, combat, progression, save or economy ownership. Severe-performance and reduced-motion fallbacks remain in place.
- Exact #2222 qualification passed every triggered workflow: Site Safety, SEO, structured/social metadata, itch.io package, cache/version, dedicated mobile trap/layout, native mouse-wheel and Lost Sizzler Load Safety. The first shard-1 attempt completed the long-session soak, live Solo combat endurance and the real five-minute mobile FIRE soak (15 verified attacks over 305,028 ms) before an unchanged post-soak `#resume-btn` Playwright locator timeout. One unchanged failed-job retry on the same exact head passed canonical/Node and all six Chromium shards; no runtime, assertion or timeout was weakened.
- #2190 is merged as `fab013b320ebdb1d9f2cb873ad26a3588f565655`: first-time Solo now enters Tutorial unless explicitly skipped, and the mobile Training Control overlay no longer obstructs the D-pad.
- #2188 established real-touch natural fire/spike/shock trap regression coverage and an initial synchronous R19 repair. #2192 added a trigger-boundary guarantee after exact-main qualification exposed a wrapper/phase race. Repeated current-main qualification then exposed a second ownership case where visible `window.hurtPlayer` could temporarily be the plain canonical function and consume armour/set invulnerability before R19 repaired the contact.
- #2193 closes that remaining ownership race. Canonical `triggerTrap()` now routes a caller-validated active floor-trap contact through the retained R19 damage owner first, with canonical `hurtPlayer()` only as the fallback and the existing post-call guarantee retained as a backstop. The final contract preserves one-HEALTH trap damage, armour, XP boundaries and canonical damage/death semantics.
- Exact #2193 qualification passed CCG Site Safety, SEO Automation, C64 Dungeon Carnage itch.io Package, Public Code Cache Version, Native Mouse Wheel Scroll Contract, both dedicated Mobile Trap Layout jobs, canonical/Node contracts and all six Load Safety Chromium shards. The first shard-4 attempt sampled one shock crossing with only 36.5 ms left in the active phase; an unchanged shard-4 retry on the same exact head passed. No runtime, assertion or timeout was weakened for the retry.
- Latest qualified runtime/package artifact: `C64-Dungeon-Carnage-Itch`, artifact ID `10665815712`, 21,121,606 bytes, GitHub Actions SHA-256 `df779a234219af99ebfb56da8393defd11db30aca64e956711f4b65884deac50`, workflow run `35656738189`, exact source head `d27d714f5d15757e360ce27b49b4d185e379e56d`, merged by #2222 as `cbbf9a97eb1f83c21eea3a519fd707af28be22bd`.
- #2194 merged as `28f0815f9e849090783cd78792c26fcdc8cc5cb9` from exact head `d92fda632216cd0e109a458e7094b4f94fada29c`. It changed only the Dungeon progress/continuation records plus the natural mobile-trap browser probe; no runtime or gameplay owner changed. Exact-head C64 Dungeon Carnage itch.io Package, Public Code Cache Version, Native Mouse Wheel Scroll Contract, SEO Automation and Lost Sizzler Load Safety passed. Load Safety shard 6 initially observed the unchanged V10.36 loading progress at 92% rather than 100% after release readiness; the same unchanged shard passed on one targeted retry, with no runtime, assertion or timeout weakening.
- #2198 corrected the mobile natural-trap browser contract so it only selects genuinely active generated traps; exact head `0739e4300b7badf92483572b5c898490893002a3` merged as `301afdfe9e39ea2551486c5857260cc607d8a038`. This was test-only and did not alter gameplay.
- #2199 rebuilt the deployed-startup production smoke on current main and merged exact head `6888ca6e7eb2d872cd9b460e64604f73682da9bf` as `c0b8eb4a82806d524ce48e97c70888b09b0c327a`. The smoke now samples rendered frames and fails on any pre-authoritative menu exposure, loader reappearance after first valid reveal, or immediate main-mode-button presentation change. C64 Dungeon Carnage itch.io Package, Public Code Cache Version, Native Mouse Wheel Scroll Contract and Lost Sizzler Load Safety all passed; canonical/Node plus all six Chromium shards were green. This is test-only evidence, not a substitute for hands-on startup acceptance.
- #2201 reopens and repairs the deployed mobile defects reproduced after #2199: caller-validated active floor traps now bypass a late mutable `hurtPlayer` owner that could swallow trap-labelled damage and use the retained canonical damage/death owner directly while preserving armour and duplicate-contact protection; coarse/mobile landing presentation now uses one full-width column with readable Solo text. Dedicated mobile trap/layout coverage and all triggered workflows passed. Load Safety shard 6 initially hit the unchanged V10.36 92%-vs-100% loading-progress timing sample and passed on one unchanged targeted retry; no runtime assertion or timeout was weakened.
- #2203 introduced a renderer-only 1.3x camera in mobile Solo/Tutorial when the canvas is 900px wide or narrower. Hands-on feedback showed the playfield was still too small, so #2205 increased that isolated camera to 1.6x without changing desktop Solo or local split-screen. Exact #2205 qualification passed all nine triggered workflows: Site Safety, SEO, structured/social metadata, itch.io package, cache/version, dedicated mobile trap/layout, native mouse-wheel and Lost Sizzler Load Safety including all six Chromium shards.
- Startup/first-visual runtime remediation remains repository-complete through #2185, with the deployed production-smoke contract strengthened by #2199. Hands-on startup acceptance is still required because automated rendered-frame sampling does not replace the user-visible acceptance gate.
- Documentation PR #2191 is **CLOSED / SUPERSEDED WITHOUT MERGE** because it recorded #2192 as the final trap checkpoint before #2193 disproved that assumption.
- Hands-on product gates still remain after #2222: deployed startup acceptance; sustained Solo movement/firing/combat/pause-resume stability; the three-Artefact/Essence Banishment Flask exchange; deployed natural mobile spike/fire/shock damage; full-width mobile landing presentation; mobile Solo/Tutorial playfield-size acceptance; and final hands-on confirmation of the r46 visual treatment plus the one-monster Level 3 directional-puzzle penalty.
- No new Dungeon coding stage is justified unless one of those hands-on checks exposes a reproducible current-build defect.

### Exact next action

1. Hands-on test current deployed/main r46 for startup, sustained Solo/FIRE/pause-resume, mobile trap/menu/camera behaviour, final visual polish and the Level 3 directional-puzzle one-monster penalty.
2. Complete the three-Artefact/Essence Banishment Flask exchange acceptance.
3. If those gates pass, use the latest qualified r46 itch.io artifact and verify Solo, Tutorial, local 2P Split Screen and Weekly Vault website handoff before public itch.io publication.
4. Reopen repository runtime code only for a reproducible current-build defect or an explicit new feature request.

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
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md), [#2129 live regression checkpoint](ai-work/dungeon-carnage-live-freeze-cache-2026-09-17.md), and [startup/first-visual checkpoint](ai-work/dungeon-carnage-startup-first-visual-2026-09-18.md) | Runtime is merged through #2222 at `cbbf9a97eb1f83c21eea3a519fd707af28be22bd` from exact qualified head `d27d714f5d15757e360ce27b49b4d185e379e56d`. #2220 is the current floor-simulation/trap-liveness foundation; #2222 adds bounded r46 visual maximisation and makes a wrong Level 3 directional-torch input spawn exactly one monster. Full exact-head automation is green after one unchanged shard-1 retry for a post-soak locator timeout; hands-on product acceptance remains. |
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
