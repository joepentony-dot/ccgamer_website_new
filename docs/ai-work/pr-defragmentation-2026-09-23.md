# PR defragmentation programme — 23 September 2026

## Objective

Reduce the repository to a small set of authoritative current PRs without losing useful implementation, tests or evidence. Older PRs are not closed merely because they are old: compare them against current `main` and the newest survivor for the workstream, migrate or reconcile still-required unique work, qualify the resulting exact head, then close the superseded PR.

Current open-PR count at this checkpoint: **23**, reduced from **28**.

## Rules

- Preserve the protected intro loader stack: `index.html`, `resources/css/intro.css`, `js/index-intro.js`.
- Preserve Omega identity, C64/Amiga modes, native document mouse-wheel scrolling, `ccg-cards.css` thumbnail-context isolation and the known-good Home image-fit baseline.
- Keep Dungeon runtime, UTA/content publishing and website UX work isolated where possible.
- Never weaken tests to make a survivor green.
- Surviving PRs still require exact-head qualification and explicit merge authorisation.
- Closing a superseded PR is allowed only after its useful unique work has been accounted for.

## Consolidated tracker

| PR | Workstream | Status | Current disposition |
| --- | --- | --- | --- |
| #2306 | Home discovery dashboard | **BLOCKED** | Intentional redesign chain; follows #2305. |
| #2305 | Archive directories | **BLOCKED** | Intentional redesign chain; follows #2304. |
| #2304 | Site UX / record redesign / scroll | **ACTIVE** | Authoritative UX survivor. Retro-video CLS route from #2234 and home/sitewide physical-wheel regressions from #2258/#2247 have been reconciled here; exact-head qualification required. |
| #2303 | Dungeon Carnage R54 | **ACTIVE** | Authoritative Dungeon survivor. Defragmentation has begun importing still-useful #2302 R54 presentation work; exact-head qualification required. |
| #2302 | Dungeon R54 predecessor | **BLOCKED** | Do not close yet. Unique R54 corridor/message-rail/test coverage found and is being reconciled into #2303. |
| #2300 | VideoObject uploadDate timezone | **ACTIVE** | Standalone current work; rebuild on current main when its turn arrives. |
| #2297 | UTA residual reconciliation | **SUPERSEDED** | Closed after newer rebuild #2298 had already merged and current generated output advanced. |
| #2293 | Dungeon trap diagnostics | **BLOCKED** | Audit against #2303 before closure. |
| #2290 | Dungeon trap activation | **BLOCKED** | Audit against #2303 before closure. |
| #2288 | Dungeon reconciliation | **SUPERSEDED** | Closed; branch carried no files ahead of the current Dungeon survivor. |
| #2284 | Dungeon public-route cleanup | **BLOCKED** | Audit unique route/deployment work against #2303/current main. |
| #2270 | Full UTA audit | **BLOCKED** | Preserve any unique audit/publishing capability not already on current main. |
| #2269 | UTA runtime freshness | **SUPERSEDED** | Closed after later merged UTA freshness work covered the live-cache behaviour. |
| #2263 | Content Publisher enrichment | **BLOCKED** | Audit unique publishing/enrichment safeguards before closure. |
| #2260 | Dungeon FIRE liveness | **BLOCKED** | Audit unique recovery/tests against #2303. |
| #2259 | Dungeon FIRE hotfix | **BLOCKED** | Audit unique recovery/tests against #2303. |
| #2258 | Home wheel regression | **BLOCKED** | Core home centre-screen wheel coverage migrated into #2304; close only after the new #2304 exact head qualifies. |
| #2247 | Site-wide wheel audit | **BLOCKED** | Broad physical-wheel route coverage migrated into #2304; close only after the new #2304 exact head qualifies. |
| #2246 | Dungeon owner preview | **BLOCKED** | Audit preview/maintenance behaviour against current Dungeon/public route. |
| #2238 | Member profile identity | **ACTIVE** | Standalone unless later audit proves supersession. |
| #2235 | Retro mobile CLS stability | **BLOCKED** | Audit implementation/tests against current UX survivor before closure. |
| #2234 | Retro mobile CLS diagnostic | **SUPERSEDED** | Closed after its unique retro-video diagnostic route was migrated to #2304; old measurement snapshots remain historical evidence only. |
| #2229 | Dungeon mobile HUD/shop | **BLOCKED** | Audit unique mobile/firearm work against #2303. |
| #2224 | Dungeon elemental portals | **BLOCKED** | Audit unique presentation work against #2303. |
| #2223 | Dungeon ordered loader | **BLOCKED** | Audit unique loader progress work against #2303. |
| #2206 | Dungeon checkpoint reconciliation | **SUPERSEDED** | Closed; only stale checkpoint documentation remained. |
| #2176 | Commodore Quest | **ACTIVE** | Standalone unless later audit proves supersession. |
| #1860 | Supabase/media containment | **ACTIVE** | Standalone, guarded containment scope. |

### Relevant merged authority

| PR | Status | Role |
| --- | --- | --- |
| #2298 | **MERGED** | Authoritative rebuilt residual UTA reconciliation already represented on current `main`. |

## Current manual-pass progress

1. Open PR count reduced **28 → 23**.
2. #2234 unique reusable source change — the 50 Essential Amiga Games Phase 8A route — was migrated to #2304 before closure.
3. #2247/#2258 unique site-wide and Home physical wheel regression intent has been consolidated into #2304 rather than discarded.
4. #2302 was not closed after audit found missing unique R54 coverage. The first recovered items now being carried into #2303 are:
   - floor-specific corridor presentation;
   - message-rail layout/readability repair for important notices;
   - regression assertions covering the restored presentation and retired online rejoin wording.
5. Qualification of the changed #2304 and #2303 exact heads is required before their predecessor PRs can be closed.

## Next order

1. Let the new #2304 exact head qualify. If fully green, classify #2247/#2258 as superseded and close them, then prepare #2304 for its authorised merge decision.
2. Let the new #2303 exact head qualify and continue the #2302 feature/test audit; do not close #2302 until every useful unique R54 item is either present, intentionally rejected with evidence, or obsolete.
3. Continue Dungeon predecessor reconciliation (#2293/#2290/#2284/#2260/#2259/#2246/#2229/#2224/#2223).
4. Reconcile #2235 against the current UX/performance line.
5. Reconcile #2270/#2263 against merged/current UTA and publishing ownership.
6. Preserve #2300/#2238/#2176/#1860 as standalone work unless a later audit proves otherwise.
