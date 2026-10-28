## 28 October 2026 — single-game Explore nav normal-flow correction (BRANCH ONLY)

- Owner reported the Explore / Video / Credits / Manual / Reviews / Tape / Similar / Community section nav floating over individual C64 and Amiga game pages, including `/games/fire-ant/`. Source ownership confirmed: `js/load-single-game.js::buildGameSectionNav` inserts it immediately after the hero; the later `resources/css/game-pages.css` rule at original line 1619 applied `position: sticky`, header-relative `top` and `z-index: 55`, with another mobile `top` offset. This was the concrete cause of the follow-scroll behaviour.
- With Dungeon R147 #2924 **FORMALLY PARKED DRAFT** (six exact-head CI groups passed but subsequent Codex review failed due included review quota), the sole new independent website implementation branch `fix/single-game-explore-nav-normal-flow-20261028` starts from main `e0febc33fcc72ee04f3a06996c979eafcf59637f`. It changes only scoped `resources/css/game-pages.css` (normal flow; remove sticky offsets), existing `tests/single-game-compact-layout.test.mjs` (guard all desktop/mobile scoped rules and insertion order), and `service-worker.js` public code cache v203→v204, plus continuation records. No generated game pages, JS nav, Omega intro, catalogue, emulator, game engine or member data altered.
- Source-executed V8 checks against fetched GitHub branch CSS/loader/cache passed 8 assertions: five nav rule blocks, static positioning, no sticky/fixed, no top or overlay z-index, preserved hero insertion, cache version and regression guard. **This is NOT canonical Node, real desktop/mobile Chromium, exact-head CI, independent review, merge, deployment or live verification.** Do not rerun Codex while included review quota is exhausted; no paid credits. Require exact-head checks, eventual independent clean review, fresh-main reconciliation, guarded merge and public browser confirmation that the nav scrolls away normally above Video Archive.
- Owner Dungeon six Windows acceptance conditions remain OPEN; #2921 chest, #2922 Magic Sacks, #2923 Ward-Break and #2924 armour remain PARKED. **OWNER WAIVER — WINDOWS MANUAL ACCEPTANCE NOT PERFORMED.** Commercial Windows release HOLD. Mobile Lighthouse 78/100 follow-up remains QUEUED and must not be conflated with this nav behaviour fix.

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

## 19 October 2026 — Exact-head first CI finding
- Earlier head `0394dbeb0f18777d95c53b49cfc239977d244559` passed source ordering tests but failed the Live Public Navigation and Navigation Discovery browser audits because the existing Browse by Genre link is `/games/genres/index.html`; the new test expected its route-equivalent `/games/genres/`. Browser output showed the requested first-eight/last-five order and no duplicate hrefs. Preserve the working original destination. Updated `scripts/audit-nav-more-browser.js` to canonicalise `/index.html` and trailing slash only for equality/deduplication checks. This is a test-contract correction, not a production navigation change; new exact-head CI must pass before merge. The Public Code Cache workflow was cancelled on the old head; do not interpret that as a passing check.

## 21 October 2026 — PR #2875 navigation qualification diagnosis
- Pages-preservation PR code head `b8fa80016a228d116e075eb06af8e66efcb2661d` has no navigation runtime/audit or public HTML changes versus current main `00dcc736c5d6adacccb2e8b6703ed20f4b1023a1`. Navigation Discovery first attempt failed on a Selenium stale reference; unchanged rerun job `119469421201` passed all original assertions. Pristine-main full audit also passed locally with Chromium headless shell/ChromeDriver 151.0.7922.34 (only Windows runtime/root paths adapted outside repo).
- Controlled diagnostic resize between find/click reproduced the identical stale menu-anchor reference on both main and candidate: existing responsive fit replaces children. This identifies a pre-existing test timing race; no product regression found and no assertions/timeouts changed. Detailed evidence and remaining review/merge hold: `game-page-pages-release-20261021.md`.
