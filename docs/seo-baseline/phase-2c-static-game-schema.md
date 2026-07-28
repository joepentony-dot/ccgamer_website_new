# Phase 2C Static Game and Breadcrumb Schema

Phase 2C connects the existing game-page generator to conservative static Schema.org markup without rebuilding existing wrapper metadata.

## Results

| Check | Before | After |
|---|---:|---:|
| Canonical game pages | **651** | **651** |
| Pages with static `VideoGame` | **0** | **651** |
| Pages with static `BreadcrumbList` | **0** | **651** |
| Static `VideoObject` entries added | **0** | **0** |
| Non-schema wrapper content changed | — | **0** |
| Legacy redirect stubs changed | — | **0** |
| Protected files changed | — | **0** |

## Schema format

Each canonical `/games/<slug>/` wrapper now contains one marked JSON-LD block with a Schema.org `@graph` containing one `VideoGame` and one three-level `BreadcrumbList`.

The graph uses facts already stored in `games/games.json`: title, description, year, platform, genres, publisher and thumbnail.

## Preservation method

The generator injects or replaces only the marked schema block inside an existing canonical wrapper. All titles, descriptions, canonical links, Open Graph fields, Twitter fields, redirect targets and existing encoding are retained byte-for-byte outside that block.

## Deliberate exclusions

- No `VideoObject` is emitted because verified upload dates are not stored.
- No `AggregateRating` is emitted from a single editorial score.
- No `author` is inferred from the publisher.
- Existing `.html` game redirects are unchanged.
- `games/games.json`, the dynamic game shell, homepage and intro-loader stack are unchanged.

## Permanent validation

The structured-data workflow regenerates both retro pages and canonical game wrappers in a temporary workspace, validates the resulting JSON-LD, checks generator scope and requires committed outputs to remain current.

## Rollback

Revert the Phase 2C squash merge commit.
