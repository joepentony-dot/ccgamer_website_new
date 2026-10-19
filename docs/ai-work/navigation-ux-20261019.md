# Omega site navigation streamlining — 19 October 2026

## Objective and source of authority
The owner authorised reducing menu clutter without losing the Omega C64/Amiga visual identity, game content, independent routes, SEO, accessibility, or emulator functionality. Keep existing canonical header/route structure in `js/ccg-nav-core.js`; do not fork public markup. Existing desktop More and responsive drawer owners are `js/ccg-nav-fit.js` and `js/ccg-global.js`. Music also has an independent bootstrap and drawer in `js/ccg-music-navigation.js`.

## Release dependencies
- Homepage PR #2839 was safely squash-merged into main as `ee3ae4e6db4f09ed5ab10dc9befe3b1656a303eb` after 16 green workflows. Live production rendering was not yet independently certified.
- Sitewide navigation PR #2840 is a separate follow-up on `codex/omega-global-nav-compact-20261019`; it was reconciled against main and retargeted to main after the homepage squash merge. Final new branch head, CI, review and main freshness must be rechecked at release time.
- No emulator game data, title/catalogue metadata, intro loader, home thumbnail baselines, generated-game publishing output, or SEO metadata was changed for the sitewide nav work.

## Intended user experience
- On desktop from 1200px: Home, Browse Games, Play C64, More are directly available. Genres, Publishers, Collections, Music Hub, Find Me a Game, Zzap!64, Quiz, Emulation, CCG Games, Install, About and Contact remain in the real, scrollable More menu. The Fourthwall merchandise entry stays accessible and external-safe.
- On mobile: Home, Browse Games, Play C64 are Quick links; all other canonical routes remain in Explore more, and Merch Shop remains available. On music pages, the independent drawer uses this same structure.
- Existing popover open/close, backdrop/outside click, Escape, route navigation, keyboard focus, scrolling and active-page state must work. Preserve C64/Amiga mode toggle, emulator responsive hamburger and controller functions.

## Implementation details
- `js/ccg-nav-fit.js`: keep canonical five permanently pinned routes and add a separate set of secondary archive routes to More; add a direct Play C64 link without changing the canonical header.
- `resources/css/ccg-nav-fit.css`: hide secondary choices from the desktop navigation from first paint; reserve an inert width-matched Play C64 placeholder until the deferred controller attaches the link, protect the More top-layer dropdown and limit its height for scrolling.
- `js/ccg-global.js`: reduce the mobile drawer's Quick links to Home, Browse Games, Play C64, with existing destinations in Explore more.
- `js/ccg-music-navigation.js`: match the mobile drawer behaviour on Music routes; keep Merch Shop at the top of Explore more.
- `scripts/audit-music-first-paint.js`: follow Music through a real More click rather than trying to click a deliberately hidden source link, while retaining actual first-paint samples and movement bounds.
- `scripts/audit-nav-more-browser.js`: verify Emulation, Music and Publishers in More, and exercise the Emulation destination through real WebDriver navigation; preserve pointer hit tests and other destinations.
- `tests/nav-discovery-scroll.test.mjs`: explicitly guard specialist links, header first-paint placeholder and Music quick-link parity.
- `service-worker.js`: public code namespace advanced to v164 for changed shared files.

## Review findings and actions
- First reviewer identified desktop header CLS because the Play C64 action was deferred. A width-matched first-frame placeholder was added and that review thread was resolved.
- Subsequent review required navigation browser assertions to match the approved reorganisation, music drawer parity, and documentation. The outdated literal-set finding was rendered obsolete by retaining the original five-entry set and adding a separate secondary UX pinned set. Avoid defeating behavioural browser tests: updated tests must still click and navigate the real new destination.
- Do not resolve outstanding review threads until exact-head checks confirm fixes. Ask for independent latest-head review again after revisions.

## Remaining qualification
1. Verify PR #2840 changed-file inventory and fresh `main` against its exact head; no old homepage or SEO files should reappear.
2. Require latest-head site-safety, Games Index, header first-frame, Music first-paint, navigation discovery, SEO, Lighthouse, cache, PWA, and full browser test matrices to pass. Observe real CI results; do not reuse historical green checks.
3. Resolve reviewer findings with evidence, re-review current head, and verify GitHub merge permissions/branch protection.
4. Guarded squash merge only when qualified and owner-authorised; independently confirm deployed live assets and desktop/mobile navigation afterward. Keep GitHub merge, deployment, and live acceptance as separate states.

## 19 October work checkpoint
- On initial inspection at `111d310dc148681dc3981a6dc3924fed0a6b2ca4`, Header First-Frame Stability and Navigation Discovery Scroll were failing. Logs identified a WebDriver click on hidden Music and an obsolete assertion that Emulation remained in the desktop row.
- The branch was extended with the Music drawer fix, route-aware real-click audits, additional regression assertions and cache v164. These new revisions were *staged only*; fresh CI not yet qualified at the time of this checkpoint entry. No production deployment claimed.

## 19 October 2026 — Desktop More relevance order follow-up (not yet merged)
- User supplied a desktop Games Archive screenshot showing Merch Shop, CCG Games, Install CCG App, About Me and Contact at the top of More. Requested archive discovery priorities first, and the last five menu links as Merch Shop → Install CCG App → CCG Games → About Me → Contact.
- Isolated branch `codex/omega-more-menu-relevance-order-20261019` changes only the desktop More owner `js/ccg-nav-fit.js`, preserving canonical `js/ccg-nav-core.js`, mobile `js/ccg-global.js`, Music drawer ownership, CSS and all href destinations. Introduced an explicit archive ranking: Genre, Publishers, Collections, Find Me a Game, Music, Zzap!64, Quiz, Emulation; additional overflow links stay ahead of the five supporting destinations. The five supporting routes are appended last with no duplicates; merchandising retains its secure external link attributes.
- Added static navigation ordering guard in `tests/nav-discovery-scroll.test.mjs`, real WebDriver ordering/deduplication assertion in `scripts/audit-nav-more-browser.js` at both 1440px and 1920px, and public code cache v167.
- Scope is desktop **More only**, not the mobile drawer. Require exact-head CI including navigation discovery, site safety, PWA, cache, Lighthouse, full browser qualification, current main, no unresolved independent review findings and guarded expected-head squash merge. Repository merge does not establish live deployment. User screenshot demonstrates prior menu, not post-change behaviour.
