# Phase 4A Year and Platform Archive Audit

## Results

| Check | Count |
|---|---:|
| Game records scanned | **652** |
| Records with a usable release year | **652** |
| Records missing a usable release year | **0** |
| Distinct release years | **15** |
| C64 records | **553** |
| Amiga records | **99** |
| Other or missing platform records | **0** |
| Existing static year archive pages | **15** |
| Existing static platform archive pages | **2** |

## Release-year coverage

| Year | Total | C64 | Amiga |
|---:|---:|---:|---:|
| 1982 | 10 | 10 | 0 |
| 1983 | 43 | 43 | 0 |
| 1984 | 94 | 94 | 0 |
| 1985 | 96 | 96 | 0 |
| 1986 | 83 | 83 | 0 |
| 1987 | 85 | 83 | 2 |
| 1988 | 50 | 46 | 4 |
| 1989 | 49 | 40 | 9 |
| 1990 | 44 | 31 | 13 |
| 1991 | 37 | 18 | 19 |
| 1992 | 29 | 8 | 21 |
| 1993 | 15 | 0 | 15 |
| 1994 | 12 | 0 | 12 |
| 1995 | 4 | 0 | 4 |
| 2023 | 1 | 1 | 0 |

Years represented in the game data without a detected static year archive: **None**.

## Existing route findings

- Static year archive pages detected: **15**
- Static platform archive pages detected: **2**
- Static links to year archives: **43**
- Static links to platform archives: **25**
- Query-string year links: **0**
- Query-string platform links: **0**
- Year filter control detected on the current browse surface: **Yes**
- Platform filter control detected on the current browse surface: **No**

## Recommended implementation split

### Phase 4B — Archive foundations

- Add a crawlable year hub and a crawlable platform hub.
- Add stable C64 and Amiga archive routes.
- Add one static route for each represented release year.
- Render static game links so the archives remain useful without JavaScript.
- Use the existing game data only; do not invent or repair release years in this phase.

### Phase 4C — Discovery integration

- Add bounded links from Browse Games to the new hubs.
- Add previous/next year navigation and platform cross-links.
- Register indexable routes in the sitemap and static-page registry.
- Preserve existing game, developer, composer and downloads workflows.

### Phase 4D — Permanent validation

- Verify route uniqueness, canonical consistency, robots policy, sitemap membership and game-link coverage.
- Detect future records with missing or unsupported platform/year values.
- Prevent archive workflows from reordering or removing each other’s registry entries.

## Explicit exclusions

- No public HTML was changed by this audit.
- No game record was changed.
- No release year or platform was inferred beyond the existing source fields.
- The homepage and intro-loader stack remain untouched.
