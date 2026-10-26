# Phase 4C Year and Platform Archive Discovery Integration

## Results

| Check | Count |
|---|---:|
| Browse Games archive shortcuts | **2** |
| Year routes with previous/next navigation | **15** |
| Indexable year routes registered | **15** |
| Archive hubs registered | **2** |
| Platform routes registered | **2** |
| Total archive entries managed in static registry | **19** |
| Existing non-archive registry entries preserved in order | **573** |

## Discovery integration

- Added bounded Browse Games links to `/games/years/` and `/games/genres/`.
- Added previous-year and next-year navigation across every represented release year.
- Added direct C64 and Amiga cross-links where those systems are represented on a year route.
- Added a direct cross-link between the C64 and Amiga platform archives.

## Sitemap policy

- Registered both archive hubs, both platform routes and the 15 indexable year routes.
- Registered only current metadata-indexable years; excluded any years still marked `noindex,follow`.
- Rebuilt the year/platform-owned registry block in metadata order, preserving all foreign-owner entries and their relative order.

## Permanent safeguards

- Phase 4B regeneration runs before Phase 4C integration.
- Phase 4C reapplies discovery links after generated pages are rebuilt.
- Validation checks registry membership, sitemap membership, route cross-links and foreign-entry order.
- Existing publisher, developer, composer, download, retro, genre, collection and core registry entries are not rewritten by the Phase 4C integration script.
- The year/platform-owned block is rebuilt in the same metadata order on every pass, while foreign registry entries remain byte-equivalent and in their existing relative order.

## Explicit exclusions

- No changes to `games/games.json`.
- No homepage or intro-loader changes.
- No new public route families.
- No sitemap inclusion for any route marked noindex by current year metadata.

## Rollback

Revert the Phase 4C squash merge commit. Phase 4B archive foundations remain independently restorable through their generator.
