# Phase 14 — Smart Game Discovery

## Purpose

Improve movement between single-game pages by upgrading the existing related-games carousel. This phase does not add a competing recommendations panel and does not use account history, personal ratings or tracking data.

## Recommendation inputs

Every recommendation is calculated from the existing `games/games.json` archive using:

- another platform version of the same title;
- exact publisher matches;
- developer and producer matches;
- shared genres;
- shared CCG collections;
- shared credited musicians, coders or graphics contributors;
- system matches;
- release-year proximity;
- a small quality tie-break from the existing CCG rating.

The recommendation labels explain the strongest reasons for each match.

## Diversity controls

A simple score alone can produce a row dominated by one publisher or genre. The selector therefore:

- limits repeated games from the same publisher;
- limits repeated games from the same primary genre;
- avoids duplicate titles except for a deliberate other-platform version;
- uses a deterministic archive-based tie-break so results do not jump around between visits.

## Existing interface retained

The enhancement reuses:

- `.game-section--related`;
- `#relatedGamesTrack`;
- the existing carousel controls;
- the existing related-card structure.

The section title changes to **Smart Archive Matches**, and a short explanation states which archive fields were used.

## Performance

- The archive dataset is loaded with browser caching enabled.
- Recommendation work is scheduled with `requestIdleCallback` where supported.
- Card images remain lazy loaded with fixed dimensions.
- The module exits immediately on non-game pages.

## Privacy

The module does not read or write:

- Supabase account data;
- private libraries;
- ratings belonging to signed-in members;
- local browsing history;
- analytics identifiers.

Recommendations are identical for every visitor viewing the same game page.

## Safety

The phase does not modify:

- `index.html`;
- `home.html`;
- `resources/css/intro.css`;
- `js/index-intro.js`;
- `games/games.json`.

The existing `load-single-game.js` renderer remains untouched. The enhancement is loaded as an optional shared module through `js/ccg-nav-core.js`, making it independently removable and testable.
