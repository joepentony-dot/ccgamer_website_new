# Website UX streamlining — 19 October 2026

## Owner request
Reduce apparent menu/homepage clutter while preserving every original route, Omega visual design, game archive, emulator, monetisation links, modes, page metadata and working functionality.

## Branch and scope
Branch `ux/streamline-home-navigation-20261019` from main `d325da691018a71e1e3b5bf55959dcf63a301545`.

- Canonical shared navigation source `js/ccg-nav-core.js` is unchanged. The adaptive desktop More owner `js/ccg-nav-fit.js` moves four secondary primary links and all informational destinations into its existing accessible menu while preserving the crawlable canonical links. Desktop first-paint `ccg-nav-fit.css` hides the same items before JavaScript. The More popover gains a bounded scrollable layout, with direct playable C64 and video routes.
- Home keeps two prominent archive choice cards; the six remaining cards stay in semantic, keyboard-accessible `details/summary`, with CSS solely in `resources/css/home.css`. The dedicated emulator promotion remains a third prominent route. C64/Amiga modes and hero are unmodified.
- Merch shop retains the existing complete clickable card, exact Fourthwall destination, header More link and mobile menu link, but moves after latest community content and before the support panel.
- `scripts/validate-search-home-contract.js` checks a historically accepted baseline while requiring the new home details and merch ordering for the proposed homepage. Canonical/meta/robots/OG requirements remain untouched.
- Specific home, merchandise and adaptive navigation regressions have been extended; public cache advanced to `2026-10-19-public-code-v162`.

## Non-goals and safety
No `index.html`, intro loaders, `games/games.json`, generated game pages, shared publisher state, `emulator/`, game runtime, SEO metadata or unrelated branches changed. The mobile drawer link inventory remains intact: no destinations removed.

## Gate
Do not call live or merge without final-head Actions checks, independently reviewed PR findings, current-main freshness, safe guarded squash merge and deployed desktop/mobile verification. A source-level regression result is not a visual/mobile or Lighthouse measurement.
