# Phase 4C Year and Platform Archive Discovery Integration

## Results

| Check | Count |
|---|---:|
| Browse Games archive shortcuts | **2** |
| Year routes with previous/next navigation | **15** |
| Indexable year routes registered | **14** |
| Archive hubs registered | **2** |
| Platform routes registered | **2** |
| Total archive entries managed in static registry | **18** |
| New archive entries appended this run | **0** |
| Existing non-archive registry entries preserved in order | **230** |

## Discovery integration

- Added bounded Browse Games links to `/games/years/` and `/games/genres/`.
- Added previous-year and next-year navigation across every represented release year.
- Added direct C64 and Amiga cross-links where those systems are represented on a year route.
- Added a direct cross-link between the C64 and Amiga platform archives.

## Sitemap policy

- Registered both archive hubs, both platform routes and the 14 indexable year routes.
- Kept `/games/years/2023/` out of the static registry and sitemap while it remains `noindex,follow`.
- Preserved every existing valid registry entry in place and appended only missing year/platform entries.

## Permanent safeguards

- Phase 4B regeneration runs before Phase 4C integration.
- Phase 4C reapplies discovery links after generated pages are rebuilt.
- Validation checks registry membership, sitemap membership, route cross-links and foreign-entry order.
- Existing publisher, developer, composer, download, retro, genre, collection and core registry entries are not rewritten by the Phase 4C integration script.
- Existing valid year/platform entries are not removed and re-appended, preventing registry-order ping-pong with other archive workflows.

## Explicit exclusions

- No changes to `games/games.json`.
- No homepage or intro-loader changes.
- No new public route families.
- No sitemap inclusion for the noindex 2023 route.

## Rollback

Revert the Phase 4C squash merge commit. Phase 4B archive foundations remain independently restorable through their generator.
