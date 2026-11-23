# CCG website: Atarimania-benchmarked performance and usability programme

**Registered:** 21 October 2026  
**Status:** Planning/tracking only. No code, live release, or claimed Lighthouse uplift.

## Objective

Make Cheeky Commodore Gamer exceptionally fast and easy to use while retaining the complete Omega visual identity, dual C64/Amiga modes, arcade/emulator integrations, magazine reviews, music, community functionality, and existing SEO routes. Highest priority: page-wide **Cumulative Layout Shift** and mobile performance.

## Reference and evidence

- https://www.atarimania.com/machines/atari-400-800-xl-xe?type=u
- https://www.atarimania.com/machines/atari-arcade/videos
- User-provided Lighthouse 13.4.1, dated 21 October 2026, records the **desktop** Arcade Videos page at Performance 100, FCP approximately 0.54 s, LCP approximately 0.56 s. This one run is not proof of mobile performance.
- CCG repository `games/index.html` currently references around 20 CSS links and 17 script sources; these are **HTML counts**, not measured network requests or evidence that each is unnecessary.
- CCG `js/games-library.js` tries `games/games.json` first with `cache: 'no-store'`. The roughly 194 KB `games-search.json` is fallback only, and lacks system/platform and thumbnail data required by current game cards and filters. Do **not** substitute it without a complete, correctly regenerated browse/search index.
- Existing lazy-load, progressive card batches, analytics deferral and performance protocol must be preserved and built upon.

## Prioritised implementation backlog

1. [ ] Capture fresh, repeatable desktop/mobile Lighthouse JSON (including conditions, LCP, CLS, TBT, bytes and blocking work) for Home, Games Archive, representative canonical C64/Amiga games, Publishers, Music Hub, Zzap!64 and the appropriate emulator surfaces. Use the existing sitemap-wide matrix; do not confuse desktop and mobile scores.
2. [ ] **CLS-first source attribution** across page families. Check first-paint navigation/header/auth, webfonts, images, hero, injected content, video and media containers. Reserve dimensions and geometry; verify desktop/mobile and no-JS flows. Real-user CLS target <=0.10, with near-zero repeatable lab shifts where practicable.
3. [ ] Construct a small, publishing-generated archive index that retains title, slug, **system**, year, publisher, composer, genres, thumbnail and all card/search/filter fields. Keep `games/games.json` authoritative and unchanged; test newly published games and indexing/SEO fallback.
4. [ ] Measure and reduce initial CSS/JS, unused page-global work, long tasks, redundant data fetching and unneeded initial rendering without removing Omega appearance or useful features.
5. [ ] Verify responsive image size, poster-first/click-to-load video, cache/service-worker behaviour, static asset delivery and production response headers. Coordinate with historical deferred-video PR #2719; it is **closed and unmerged**, so no implementation is assumed.
6. [ ] Refine UX for search, filters, A–Z browsing and result discovery only where tested user flows improve; preserve already delivered Games Archive streamlining and all routes/content.
7. [ ] Deliver qualified, small, source-owner-aligned PR batches: exact-head CI, published/generated source parity, accessibility/SEO/performance/site-safety/native-wheel tests, independent review, fresh-main, guarded merge, and **separate deployed browser verification**. Reconcile competing workstreams; distinguish staged, qualified, merged, live and verified counts. Avoid stale PR accumulation.
8. [ ] Repeat representative and site-wide mobile/desktop measurements after each release, reporting both improvements and regressions.

## Target envelope (not a guarantee)

- Desktop Lighthouse Performance: 95–100 where realistically repeatable; Mobile: 90–100 where achievable.
- Real-user Core Web Vitals p75: LCP <= 2.5 s, CLS <= 0.10, INP <= 200 ms.
- Accessibility, Best Practices and SEO must not regress.

## Existing project authority and protections

This is an additional benchmark and acceptance backlog under existing:
- `AGENTS.md`
- `docs/LIGHTHOUSE-PERFORMANCE-PROTOCOL.md`
- `docs/ai-work/lighthouse-sitewide.md`
- `docs/ai-work/website-ux-audit-20261019.md`
- `docs/ai-work/games-interface-ux-20261019.md`
- `docs/AI-CONTINUATION-STATE.md`

Do not change the protected intro stack (`index.html`, `resources/css/intro.css`, `js/index-intro.js`), `games/games.json`, locked Home thumbnails or game-card isolation, emulator links, canonical routes, or unrelated user features. Repair generated pages through their authoritative generators, not bulk manual changes. Do not migrate backend frameworks simply to chase Atarimania's score.

**Issue tracking note:** GitHub Issues is disabled in this repository (API returned HTTP 410), so this plan is submitted as repository documentation rather than an issue.
