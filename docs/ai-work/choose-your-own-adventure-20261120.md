# Choose Your Own Adventure — 20 November 2026

## Status
**STAGED BRANCH ONLY — NOT MERGED OR LIVE.** Branch `feature/choose-your-own-adventure-20261120`, based on protected main `47fcde0bdc866ddf7e38e4c130e1aeb332102255`. This is a bounded owner-requested website addition; do not supersede existing CCG Master Control active workstream or merge while release gates remain incomplete.

## Scope
- New public route: `/choose-your-own-adventure/` (`choose-your-own-adventure/index.html`) with the complete 130-page, 26-ending *The Great 8-Bit Decision* 1983-onward C64 gamebook.
- CSS is scoped to `resources/css/ccg-choose-your-own-adventure.css`; browser engine is scoped to `js/ccg-choose-your-own-adventure.js`. 130 story records are embedded in the page as application/json. No new libraries, authentication, external APIs, backend, database, emulator, catalogue or Dungeon assets.
- Exact requested footer is `Copyright Cheeky Commodore Gamer`, replacing the old fictionalised-scenes disclaimer. Wikimedia image-attribution modal remains accessible from the book cover for third-party credits.
- Homepage launchpad contains one discoverable `Choose Your Own Adventure` link using pre-existing `home-archive-route` styles.
- Public code cache advanced from v263 to v264 for changed/added static code.

## Qualification
- Local extracted JavaScript passes `node --check`; story JSON parses as 130 pages and 26 endings.
- Local headless Chromium using the self-contained HTML (not production HTTP) passed cover-to-scene navigation, next choice, previous-page control, footer text, no runtime errors, and no settled horizontal overflow at 1440px and 390px. The 270ms page-transition animation temporarily translates 9px; measurements were taken once settled.
- Local HTTP test was blocked by environment browser policy (`ERR_BLOCKED_BY_ADMINISTRATOR`); **not evidence of production browser acceptance.**
- Remaining: final exact-head CI and code/performance/cache checks; fresh-main reconciliation; normal guarded PR merge after active-workstream handoff; GitHub Pages publication; verify `/choose-your-own-adventure/`, CSS/JS, homepage entry and desktop/mobile interactions on production. No user data affected.

## Preservation
Do not alter the protected Omega intro, shared header/nav, `games/games.json`, other game assets, sitewide style components, Dungeon Carnage, leaderboard, or the current hourly workstream.
