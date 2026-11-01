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
