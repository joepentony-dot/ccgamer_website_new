# Phase 2B Schema Validity and Validation Gate

Phase 2B repairs the two syntax-level findings from the merged Phase 2A review and installs a permanent repository-wide structured-data validator.

## Results

| Check | Before | After |
|---|---:|---:|
| Invalid JSON-LD blocks | **1** | **0** |
| Empty JSON-LD blocks | **1** | **0** |
| Unresolved JSON-LD template blocks | — | **0** |
| Critical structured-data issues | — | **0** |

## Repairs

- `retro-specials/favourite-arcade-games-c64-amiga-ports/index.html` now contains JSON-escaped paragraph breaks.
- `admin/templates/retro-video-template.html` uses dedicated JSON-safe placeholders.
- `scripts/generate-retro-pages.js` JSON-escapes schema values before insertion.
- `games/game.html` no longer exposes an empty JSON-LD block before data exists.
- `js/load-single-game.js` assigns the JSON-LD type when the client payload is populated.

## Permanent validation

`scripts/validate_structured_data.py` rejects invalid or empty JSON-LD, unresolved template tokens and critical `VideoObject`, `BreadcrumbList` or `VideoGame` field errors. The permanent workflow validates both committed pages and a full temporary retro-page regeneration without committing unrelated generated output.

## Explicit exclusions

- `games/games.json` was not changed.
- The homepage and intro-loader stack were not changed.
- No dates, durations, ratings or authorship facts were invented.
- No navigation, CSS, sitemap or thumbnail changes were made.

## Rollback

Revert the Phase 2B squash merge commit.
