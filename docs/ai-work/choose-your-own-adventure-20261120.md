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

## 20 November 2026 — exact-head CI remediation and additional guards
- First PR-head Social Metadata failed because new OG title/description differed from document metadata; updated only the adventure page to match exact values. The later 9b47889f head's social check PASSED.
- Approved homepage card triggered the existing exact-home CLS change contract. Updated `scripts/home-cls-contract.js` to recognise **only the exact added static adventure link at its current launchpad position**. Existing unrelated changes remain rejected. Added a negative regression for changed gamebook marketing text or an altered href. Corrected an initial invalid regex in the test to a literal `includes` assertion; subsequent head's Navigation Discovery passed.
- Phase 4D SEO workflow re-generated the already published, unique, canonical SID documentary `/retro-specials/50-commodore-64-sid-tunes-zzap64/` in `sitemap-pages.xml`, but its separate strict baseline validator omitted this published page from the reviewed exceptions. Added the *exact* URL to `scripts/validate-year-platform-discovery.js` while requiring a single matching source watch page, one canonical, index/follow robots, and one sitemap entry. No broad allowance, retro page, generated sitemap, catalogue, or unrelated source was modified.
- No third-party CI failures are waived. Every source edit requires fresh full exact-head Actions qualification; previous-head successes are not merged proof. Fresh main was still `47fcde0bdc866ddf7e38e4c130e1aeb332102255` at correction. PR #3129 remains DRAFT / NOT MERGED / NOT LIVE.

## 20 November 2026 — independent full-CI Chromium trap regression qualification

- Latest head before fixture change: `687a48057965f3197ed8a5bd97a6ae7397c6556e`: 21/22 workflow groups green. One full Dungeon Chromium shard failed twice (original attempt and same-shard rerun) on `arcade/lost-sizzler/tests/browser/v10-42-r57-live-trap-crossing.mjs:98`: 24ms keyboard.press returned without the game sampling a movement frame, so the unchanged 3-second real-movement assertion timed out.
- Bounded test-only correction in that exact existing browser regression: hold genuine Playwright keyboard.down until one tile enters the expected cell, then release in finally. Apply on three original keyboard crossing steps. Preserve target coordinates, 3-second waiting limits, damage, armour, hazard event and return-crossing checks. No gameplay JS, engine, site auth, catalogue or production code affected.
- Must re-run complete exact-head CI including all six Chromium shards before a guarded merge; successful historical workflows and original retry are not qualification for this new head. Do not merge with a failing check. Verify Pages and actual production route after merge.

## 20 November 2026 — bounded keypress correction after observed overshoot

- The first hold-until-target test candidate on head `519bdc3f48f19fa6cb27f7faf421bfd355a1a263` still failed shard 5, this time overshooting from the expected x=107 to x=108 before the post-release exact-cell check. This demonstrates the original unbounded hold introduces a second movement at the 138ms cooldown; do not weaken the existing exact-cell assertion or treat that run as a pass.
- The same existing test now uses **one genuine 110ms Playwright press** per direction, waits for the actual `move1<=0` movement cooldown before pressing, then checks target position. Default player `moveMultiplier=1` and `C.player.moveDelay=138ms`; 110ms spans multiple frames but is below the default next tile step. An additional assertion requires the back-key to return exactly to its original cell, with no overshoot. Original first/second HP, armour and canonical event tests remain unchanged. No game runtime, shared keyboard code, CSS, catalogue or site auth changed.
- This is a **source-only test-harness change, NOT a passing result**. Requalify every applicable exact-head GitHub workflow, including all six Chromium shards, before guarded merge. Final branch is READY but not merged or live.
