# CCG website usability audit — 19 October 2026

Objective: reduce time-to-task across all significant page families while preserving Omega identity, accessibility, search indexing, content depth, monetisation, links and existing browser/emulator functionality. 'Perfect' is not a measurable state; real desktop/mobile user flows and regression tests are release gates.

## Navigation
Retain Home, Browse Games, Play C64 and More on desktop provisionally; this is a good simplification but its success is unproven without user testing. Important Genres, Publishers and Collections must be reachable via homepage and Games Archive as well as the prioritised More dropdown. PR #2846 handles desktop More relevance ordering and is a separate, still-gated release.

## Prioritised page-family backlog
1. Homepage: clarify hero / emulator / browse priority, featured media, community, support and merch. Raw HTML repeats PayPal/Patreon links because support artwork has separate desktop hotspots and mobile links; do not remove without rendered visibility tests. Keep existing merchandise visibility/CI contracts.
2. Games Archive: stages 1–4 merged; real desktop/mobile search, platform, year, directory, source generator and 666-game fallback acceptance remain important. Do not change game data or routes just to reduce raw link counts.
3. Publisher index: 206 publishers total (12 featured, 194 other directory cards). Existing publisher-pages.js removes system choices at runtime and creates A–Z jump controls. Current candidate changes the authoritative scripts/generate-publisher-pages.js and corresponding games/publishers/index.html to render a native closed details BEFORE first paint around only the 194 other cards. Featured/search remain visible; searching opens the details automatically; all 206 hrefs remain in no-JS HTML and the summary opens natively without JavaScript. Prevent closing active query results.
4. Individual game pages: Bruce Lee and Ghostbusters HTML contain the same description in Video Archive and a fallback About the Game section, but the latter has a hidden attribute. The authoritative scripts/prepare-seo-game-routes.js preserves this fallback only when an editorial video summary is absent. This is NOT verified visible duplication; retain until rendered-browser evidence shows a defect. Review long magazine scan sections separately without deleting links or editorial data.
5. Music: composer index ~274 composers; assess letter-group collapsed state and whether search matches are immediately visible with keyboard and on mobile before changing it.
6. Zzap!64: award index and additional-review index are different datasets but use separate search surfaces; improve route explanations and hierarchy, not indiscriminate content removal.
7. Developers index: 47 records and two card groups; assess compact directory pattern after publisher acceptance.
8. Genres (15), Collections (7), Years (15), Find Me a Game: focused destinations, retain unless direct testing finds a concrete defect. Retro Specials redirect is intentional and should not be replaced by a competing index.
9. Emulator, game detail runtime, quiz, members, shop, admin: specialised interfaces requiring isolated interaction/authorised source changes, not arbitrary global CSS edits.

## Measurable exit criteria
At desktop 1440px, tablet 768px and mobile 360px: a visitor can find a game, browse genre/publisher, load browser emulator, navigate back, use keyboard and touch, escape overlays, switch C64/Amiga modes, find the correct magazine/manual resources, and reach page footer without overlays/clipping. Preserve no-JS crawlable links and avoid CLS/LCP regressions.
Release one scope at a time: fresh main; explicit independent review; exact-head CI, publisher/game generator parity, SEO and performance; guarded squash merge; separate verified deployment and actual desktop/mobile acceptance. Do not claim an uplift merely from reduced options. GSC Wizard reads were unavailable because its subscription has ended; no traffic-based conclusion was made.

## Current Publisher PR
Change only JS publisher index progressive enhancement, scoped CSS, archive-directory tests, service worker cache and this documentation. Static publisher source keeps all existing 206 directory links. Search auto-expands native details. User-opened state remains when a search is cleared.
PR #2846 is not merged and also bumps public code cache to v167. If it merges first, this publisher branch must be reconciled with fresh main and its code cache bumped to v168, then all checks rerun. Never overwrite either branch or skip code-cache checks.
Review corrections, 19 October: independent first-head review identified a P1 wrong browser count (194 non-featured vs 206 total), P1 late DOM collapse CLS, P2 closing an active search and P2 inaccurate 'all 194' title. Fixed by generator-owned first-paint details, accurate 'other 194' heading, whole-page count in responsive browser audit and blocking summary close during search. Fresh exact-head CI/review still required; PR #2846 cache collision remains.
