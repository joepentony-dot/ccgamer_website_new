# Games Archive search-and-results layout — 19 October 2026

## Why this change
The owner requests that the main body of /games/ be simplified, not only the top discovery tile area. The original page has eight large browse cards, separate search/year/system panels, a full on-screen A–Z button grid, a redundant row of category shortcuts, and letter-based accordion game results.

## Dependencies and authority
- Stage 1 homepage PR #2839 and Stage 2 shared navigation PR #2840 are safely merged on main. Stage 2 merge commit: `36c8f20e622d555d61e00f0e03738df19e77cadd`.
- Stage 3 archive tile disclosure PR #2843 merged to main as `91fc618939ac474b184629addba858e458499902` after 19/19 checks. Its authoritative discovery section is owned by `scripts/upgrade-games-index.js`.
- This Stage 4 branch is `codex/omega-games-interface-compact-20261019`, branched from the exact reviewed #2843 work, not unrelated main changes.

## User-facing layout
- A single visually unified search-and-filter panel on the Games Archive: original title search, C64/Amiga/all system buttons, year selector and live status remain operative, with the year filter alongside the system filter on wide screens and vertically stacked on mobile.
- A native, closed but keyboard-accessible 'Browse A–Z and other game sections' disclosure retains all existing A–Z buttons and all seven existing archive shortcut links.
- The live letter accordion / game results display stays outside the disclosure, as the dominant content directly below search. Existing games-library JS is unchanged.
- The entire existing 731 href inventory and game catalogue remain unmodified. Preserve the crawlable no-JS/static fallback and all original element IDs, filter data attributes and accessibility hooks.
- Scoped CSS changes only in `resources/css/ccg-games-index-omega.css`; do not alter the locked global cards/thumbnails, genre hubs, home page or intro stack.
- `tests/games-index-omega.test.mjs` protects source IDs, filter choices, disclosure position and scoped CSS; advance public code cache to v166.

## Risks and release procedure
- `games/index.html` is generated output. This stage modifies the filter/search area outside the authoritative generated discovery section; check rebuilding from `scripts/upgrade-games-index.js` and `scripts/rebuild-games.js` retains the new structure. Do not auto-merge without that verification.
- Native details keeps buttons in DOM but hidden until the user expands it; verify keyboard summary toggle, A–Z button letter selection, mobile layout, search typing, clear search, platform filter, year filter, active game accordion, Game Manuals, and links without JavaScript.
- Stage 3 has merged. Stage 4 PR #2844 is a six-file change retargeted to main; require fresh-main reconciliation, exact-head CI and independent review, expected-head guarded squash merge, and deployed browser acceptance.
- Safeguard unrelated SEO/noindex, C64 CRT linking/publisher data, emulator runtime, Dungeon Carnage project, intro loader and home thumbnail contracts.

## 19 October continuation
- Stage 3 #2843 is merged as `91fc618939ac474b184629addba858e458499902`. Auto-generated output PR #2845 advanced main to `ccd7c58113c67742f621a5c15a393359ac60ee63`, changing five unrelated retro-special and sitemap files, not the Games Archive.
- Initial Stage 4 review found incorrectly over-escaped JavaScript regexes in `tests/games-index-omega.test.mjs`. Commit `031f5c86e462efb5eebb1bfad6652505e00f2733` corrected the error. All current-head validation must rerun. No claim of merge or deployed acceptance.
