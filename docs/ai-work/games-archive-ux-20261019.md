## 7 November 2026 — generated output qualified, merged and live

Existing #3034 qualified final head `2017de2830b7ffc05d51d24503d4232d1370621b` after correcting the demonstrated publisher marker mismatch. Normal current-main reconciliation preserved its original branch. All 28 executed native workflow runs (20 workflow families) / 30 checks, Workers, 91 focused tests, two idempotent 69-stage offline rebuilds, actual Pages staging (96 cold/warm cases), 40 functional desktop/mobile cases and 36 paired Lighthouse reports passed their applicable gates. Independent review summary `6713241379` / final receipt `6713381584` is clean; final qualification `6713545160`. Final expected-head **normal PR merge** is `54d9b25965d10ff11cf8bcb4699ba8facd91db3e`; its tree equals qualified `2017de2`. No direct main push, force update or branch deletion.

Pages `42418617902` and live navigation `42418826920` succeeded, as did all 12 post-merge workflow groups. All 278 changed public HTML/XML/JSON artifacts served by the custom domain match qualified actual Pages staging byte for byte; all 40 live cases pass with zero production Supabase attempts/page errors. Reliable publishing `42418617872` completed the owner chain and reports **Generated publishing output is already current**, with no replacement output PR. Final production receipt [6713656371](https://github.com/joepentony-dot/ccgamer_website_new/pull/3034#issuecomment-6713656371). The raw GitHub artifact's Azure download returned 403 in this environment; it was not inspected or bypassed. Production proof uses served bytes, qualified owner staging and the exact deployed-head workflow.

All 206 generated publisher records / 1,017 cards retain prior content, metadata, order and links; only the two runtime attributes were added. Source-owned 21 quiz chapters and the 111-link/ten-group guide remain intact. The author's Ferrari Formula One footage correction is retained without changing video IDs or verified metadata. Performance remains below programme targets on existing mobile families: paired publisher Performance 43→46, library 49→51, guide 53→53; no 90+ claim or limit waiver. Full measured findings and commands remain in PR qualification and this record's earlier checkpoints. #3028, #3010 and source #3035 are also merged and production-verified.

### 7 November 21:39 UTC — corrected producer preflight

Both clean `NODE_OPTIONS=--require=/workspace/work/generated-audit/offline-node.cjs node scripts/rebuild-games.js` runs passed all 69 owner stages; complete binary diffs compare identically. All 206 changed publisher records (1,017 rendered cards including secondary credits) are byte-identical to the prior generated version after removing only the two new runtime attributes: no content, published metadata, canonical, media, ordering or link change. The first local repeat attempt saw an earlier disposable `_site` tree and failed its unchanged normalizer guard; moved that artifact outside the source checkout before the clean runs. Existing negative-control and corrected-runtime logs are retained. New final-head release qualification remains required.

## 7 November 2026 — publisher record filter contract defect reproduced (existing #3034)

- During full generated-backlog qualification, real desktop Firebird browser count became **0** although 31 static cards were present. Actual current production HTML has the same marker mismatch: generator supplies `data-publisher-game-card` / `data-game-platform`, while existing `js/publisher-pages.js` selects `[data-publisher-game]` / reads `dataset.system`. This is a reproduced producer/consumer mismatch, not a hypothesis or a Dungeon incident.
- Existing #3034 retains the only implementation stream. Add the two existing runtime attributes to the authoritative card renderer, preserving its established attributes/classes/title/canonical/links/order and all static cards. Existing publisher-search suite now executes actual generated Firebird cards through the real runtime: before fix `0 !== 31`; after fix initial/filtered counts, C64/Amiga/title search/empty/clear and live-region semantics pass. No CSS/browser-JS/cache/runtime/backend/source-data changes or assertions relaxed. Output is regenerated only by the owner.
- Earlier exact head `ee24bb29c6a3353673a5aa74d54129066fb18bc7` has clean independent review `6713241379` / `6713274682`, but is **not release-qualified** because this browser gate failed. New-head full rebuild/idempotence, all applicable native/browser/performance and independent review, fresh-base expected-head merge and production proof remain required. Historical green checks are not permission.

## 1 November 2026 — Games Archive year-search browser acceptance (BRANCH ONLY)

- Main `5ecbd95256c788d1eae43f4a5f7ae48f124193de` includes merged #2991 and a successful Pages deployment, but the existing live navigation browser audit did not exercise year search. This candidate tests the real Games Archive input, result counts, empty state, 1986/1987, title/year combinations and cleared search at 1440px/390px, with expected counts from the actual catalogue. It compares deployed `js/games-library.js` against the exact release.
- Only the existing browser audit and continuation records change; no runtime, cache, catalogue, Omega intro, CSS, ratings, emulator or Dungeon changes. **DRAFT / NOT QUALIFIED / NOT MERGED / NOT LIVE** until exact-head native CI, guarded merge, Pages and production-domain browser acceptance. Owner-controlled holds remain separate.

## 1 November 2026 — Games Archive release-year free-text search (BRANCH ONLY)

- Fresh protected main at diagnosis `6078b4a82231ac7bec829478b08c66ecbd9da71a`. Live Games Archive advertises searching by release year, but `getGameSearchData()` omitted `game.year`; source-executed `1986` returned 0 matches despite 81 actual 1986 games in the 666-record search dataset.
- Bounded fix adds year to existing normalised search fields; source-executed preflight returns exactly 81 matches for 1986 and 90 for 1987, retains Ace of Aces title and combined `1986 ace` search, and rejects the wrong year. Existing archive-directory test gains real-catalogue regression; cache v216→v217. Preserve dropdown year filter, fuzzy search, Omega design, games.json, links, ratings, emulator, backend and intro.
- **BRANCH ONLY / NOT QUALIFIED / NOT MERGED / NOT DEPLOYED / NOT LIVE.** Require exact-head CI, browser/performance safeguards, fresh-main reconciliation, guarded expected-head squash merge, Pages deployment and desktop/mobile live search acceptance. Generated publishing, Amazon, Dungeon Windows and genre CLS holds are independent.

# Omega Games Archive decluttering — 19 October 2026

## Owner intent
Continue the approved UX programme to reduce visible navigation clutter and reach search faster, without losing games, content, canonical routes, C64/Amiga theming, accessibility, emulator access or SEO crawlability.

## Baseline and dependencies
- Homepage discovery release #2839 merged as `ee3ae4e6db4f09ed5ab10dc9befe3b1656a303eb`.
- Shared navigation release #2840 merged to main as `36c8f20e622d555d61e00f0e03738df19e77cadd`, following 18/18 passing Actions and independent no-major-issues review. Actual sitewide live-browser acceptance remains separate from merge.
- The Games Archive is generated/guarded by `scripts/upgrade-games-index.js`; `games/index.html` is its current source-matched published output. Changing only the output would be overwritten by publishing.
- The visible Games Archive has an eight-tile discovery block before its search; direct browse routes are also duplicated under the filters and in the hero.

## This candidate
Branch `codex/omega-games-archive-discovery-20261019` is an isolated Games Archive UX follow-up. Modify the authoritative discovery generator and the corresponding generated `games/index.html` section to wrap **all eight unchanged browse destinations** in a closed native `details` / `summary`. Make the page search/filters reachable sooner without hiding any page source from crawlers or adding JavaScript.
- Use scoped `resources/css/ccg-games-index-omega.css` styles with keyboard focus and C64/Amiga colour variables. The disclosure is controlled natively and remains available without JS.
- Extend `tests/games-index-omega.test.mjs` to protect the section and its generator.
- Advance `service-worker.js` public-code cache from v164 to v165.
- Preserve exactly the previous 731 HTML `href` occurrences, the full 666-game static fallback, canonical/SEO metadata, all route hrefs, media and source JSON. Existing duplicate browse shortcuts remain unchanged in this limited release pending usability verification.

## Release requirements
1. Check source/output parity with `node scripts/upgrade-games-index.js --check`, generator deterministic rebuilding, game count/link inventory and static no-JS fallback.
2. Site Safety, Games Index Omega, generated output/publishing, SEO, cache, Lighthouse, native scroll, mobile and keyboard navigation. Independent code review; correct every justified finding.
3. Refresh main; guarded expected-head squash merge only after all required checks pass, main remains fresh, and no unresolved material review issues.
4. Confirm GitHub Pages deployment and public/real-browser interaction independently. No claim of live deployment from a source-only merge.
5. Do not edit intro loader, homepage locked thumbnail styles, emulator game catalogue or generated per-game pages.
