# Phase 3C Composer Archive Expansion

## Results

| Check | Count |
|---|---:|
| Game records scanned | **653** |
| Credited composer entities | **270** |
| Existing dedicated composer pages preserved | **20** |
| Credited composers with an existing page | **20** |
| Newly generated static composer routes | **250** |
| Indexable generated routes | **63** |
| Single-game generated noindex routes | **187** |
| Total static composer routes | **270** |
| Linked game-credit relationships | **573** |
| Generated pages written in this run | **0** |
| Stale generated pages removed | **0** |

## Indexing policy

- Existing curated composer pages remain unchanged and retain their current indexing policy.
- Newly generated pages with at least 2 credited games use `index,follow`.
- Newly generated one-game pages use `noindex,follow` until another matching credit is present.
- The music hub and all-composers hub are static, indexable and link to every route.

## Most represented composer credits

- Rob Hubbard: **32** games
- David Whittaker: **22** games
- Martin Galway: **17** games
- Richard Joseph: **17** games
- Ben Daglish: **16** games
- Fred Gray: **13** games
- Allister Brimble: **12** games
- Jonathan Dunn: **11** games
- Jeroen Tel: **9** games
- Mark Cooksey: **9** games
- Barry Leitch: **8** games
- Russell Lieblich: **8** games
- Neil Brennan: **7** games
- Chris Hülsbeck: **6** games
- Dave Thomas: **6** games

## Route-layer normalization

- `chris hulsbeck` → **Chris Hülsbeck**
- `chris huelsbeck` → **Chris Hülsbeck**
- `chris hülsbeck` → **Chris Hülsbeck**

The source records in `games/games.json` remain unchanged.

## Generated features

- Static canonical routes for every credited composer.
- Static game links and structured data on generated composer pages.
- Static composer links in both music hubs, enhanced by the existing JavaScript search and accordion.
- Existing player scripts and curated composer pages preserved.
- Sitemap and static-page integration for indexable routes.

## Explicit exclusions

- No composer biographies, birth details or personal facts were invented.
- No existing curated composer page was rewritten.
- No changes to `games/games.json`.
- No homepage or intro-loader changes.
- The noindex query-string fallback remains available for unknown names.

## Rollback

Revert the Phase 3C squash merge commit. Generated pages, hub fallbacks, registry entries and workflow support can then be removed together.
