# Phase 2A Structured-Data and Metadata Review

This is a read-only repository audit. It does not alter public pages, game data, sitemaps or generators.

## Executive summary

| Check | Count |
|---|---:|
| Public HTML pages audited | **1690** |
| Indexable pages | **854** |
| Typed JSON-LD objects | **670** |
| Invalid JSON-LD blocks | **1** |
| Empty JSON-LD placeholders | **1** |
| Critical schema issues | **1** |
| Schema warnings | **1** |
| Metadata consistency issues | **15** |
| Pages containing VideoObject | **36** |
| VideoObject required-property gaps | **0** |
| Breadcrumb critical issues | **0** |
| Indexable canonical game pages | **655** |
| Canonical game pages with static JSON-LD | **2** |

## Schema type inventory

- `BreadcrumbList`: **235**
- `CollectionPage`: **198**
- `ItemList`: **195**
- `VideoObject`: **36**
- `VideoGame`: **6**

## Generator findings

- `generate-slug-pages.js` defines a VideoGame builder: **True**
- It defines a VideoObject builder: **True**
- It defines a BreadcrumbList builder: **True**
- VideoGame builder occurrences: **1**
- VideoObject builder occurrences: **1**
- Breadcrumb builder occurrences: **1**
- Canonical game wrapper template contains static JSON-LD: **False**

A call count of one means the function is defined but not called elsewhere in that file.

## Video metadata availability in games.json

- Game records: **651**
- Games with a video ID: **651**
- Games with a stored upload date: **0**
- Games with a stored duration: **0**

VideoObject markup must not invent upload dates or durations. Records lacking those fields require verified enrichment or omission of VideoObject until the required data is available.

## Recommended correction batches

1. **Phase 2B — schema validity:** fix invalid blocks and empty placeholders; add permanent validation gates.
2. **Phase 2C — canonical game schema:** connect the existing VideoGame and Breadcrumb builders to canonical game output, using a single maintainable `@graph`.
3. **Phase 2D — video eligibility:** emit VideoObject only where a verified upload date exists; then add duration where verified.
4. **Phase 2E — metadata consistency:** align canonical, Open Graph and Twitter fields without rewriting page content.

## Priority samples

### Invalid JSON-LD

- `retro-specials/favourite-arcade-games-c64-amiga-ports/index.html` block 1: Invalid control character at: line 5 column 368 (char 524)

### Critical schema issues

- `templates/game-template.html` — VideoGame url is not an absolute HTTP(S) URL

### Metadata consistency issues

- `emulation.html` — og:title differs from HTML title
- `emulation.html` — og:description differs from meta description
- `games/collections/amiga-demo-music.html` — og:title differs from HTML title
- `games/collections/amiga-demo-music.html` — Open Graph image exists but twitter:card is missing
- `games/collections/retro-events.html` — og:title differs from HTML title
- `games/collections/retro-events.html` — og:description differs from meta description
- `games/collections/retro-specials.html` — og:title differs from HTML title
- `home.html` — og:title differs from HTML title
- `home.html` — og:description differs from meta description
- `scripts/templates/retro-video-page-template.html` — canonical is not an absolute HTTP(S) URL
- `scripts/templates/retro-video-page-template.html` — og:image is not an absolute HTTP(S) URL
- `templates/base-omega.html` — canonical is not an absolute HTTP(S) URL
- `templates/game-template.html` — canonical is not an absolute HTTP(S) URL
- `templates/retro-page-template.html` — canonical is not an absolute HTTP(S) URL
- `templates/retro-page-template.html` — og:image is not an absolute HTTP(S) URL

## Explicit exclusions

- No public HTML was changed.
- `games/games.json` was not changed.
- The intro-loader stack was not changed.
- No schema was added merely to increase counts.
- No dates, durations, ratings or authorship facts were invented.

## Rollback

Revert the Phase 2A squash merge commit. The PR adds only the audit tooling, workflow and concise report.
