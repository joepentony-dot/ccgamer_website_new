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
