# Phase 4D Permanent Year and Platform Archive Validation

## Final validation results

| Check | Result |
|---|---:|
| Source game records validated | **651** |
| Unique public archive routes | **19** |
| Archive pages with canonical, robots and schema validation | **19** |
| Year-page game memberships validated | **651** |
| C64 platform memberships validated | **552** |
| Amiga platform memberships validated | **99** |
| Existing canonical game targets validated | **651** |
| Indexable archive routes in registry and sitemap | **18** |
| Existing non-archive registry entries preserved in order | **230** |
| Noindex year excluded | **2023** |

## Requirements already satisfied before Phase 4D

- Static year and platform routes were generated deterministically.
- Browse Games contained one bounded year/platform discovery block.
- Previous-year and next-year links followed the represented-year sequence.
- Relevant platform cross-links, static registry entries and sitemap entries were present.
- The 2023 route used `noindex,follow` and was excluded from indexable discovery files.
- Protected-file hashing, bounded generated scope and repeat-generation checks were active.

## Safeguards added or strengthened in Phase 4D

- Exact route uniqueness across both hubs, all 15 year routes and both platform routes.
- Exactly one correct canonical and robots directive on every archive page.
- Structural validation of CollectionPage, BreadcrumbList and ItemList JSON-LD on every archive page.
- Exact source-data membership checks for all 651 year links, 552 C64 links and 99 Amiga links.
- Validation that every archive game target exists and is its own canonical game route.
- Exact registry and sitemap occurrence checks for all 18 indexable archive routes.
- Absence checks preventing irrelevant C64 or Amiga cross-links on year pages.
- Stable-order checks for registry entries and sitemap URLs owned by other workflows.
- Phase 5B compatibility permits only the reviewed manual-viewer utility exclusion and rejects its reintroduction.

## Safety

- No changes to `games/games.json`.
- No changes to `index.html`, `home.html`, `resources/css/intro.css` or `js/index-intro.js`.
- No archive design, copy, route, thumbnail or public navigation redesign.
- Phase 4B generation and Phase 4C discovery integration remain the source of public output.

## Rollback

Revert the Phase 4D squash merge commit. Phase 4B and Phase 4C public archive output remains independently generated and restorable.
