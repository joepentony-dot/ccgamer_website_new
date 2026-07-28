# Phase 0 SEO and Site-Integrity Baseline

This report is generated from the current repository without changing public pages.

## Executive summary

| Check | Count |
|---|---:|
| HTML pages audited | **1678** |
| Indexable pages | **923** |
| Noindex pages | **755** |
| Indexable pages with duplicate titles | **51** |
| Indexable pages with duplicate meta descriptions | **40** |
| Canonical URLs claimed by multiple indexable pages | **58** |
| Indexable pages missing titles | **0** |
| Indexable pages missing meta descriptions | **21** |
| Indexable pages missing canonicals | **9** |
| Indexable pages without exactly one H1 | **702** |
| Indexable pages with no detected incoming link | **97** |
| Indexable pages absent from sitemaps | **26** |
| Sitemap URLs that canonicalise elsewhere | **0** |
| Broken internal links | **0** |
| Missing local assets | **0** |
| Invalid JSON-LD blocks | **2** |
| Images missing an alt attribute | **0** |

## Game database inventory

- Game records: **651**
- Games with downloads: **650**
- Download links recorded: **651**
- Malformed download links: **0**
- Duplicate download URLs: **1**
- Games with manuals: **565**
- Malformed or missing manual references: **0**
- Games with videos: **651**
- Games missing thumbnails: **0**
- Missing local thumbnail files: **0**

## Highest-priority technical findings

1. Canonical collisions and sitemap inconsistencies should be resolved before archive expansion.
2. Broken internal links and missing local assets should be corrected in small batches.
3. Orphan-page results should be reviewed manually because generated navigation can be injected by JavaScript.
4. Duplicate title and description results should be separated into genuine duplicates and intentional redirect stubs.
5. Remote downloads, manuals and YouTube URLs require a separately throttled network check to avoid provider rate limits.

## Priority samples

### Broken internal links

None detected.

### Indexable orphan-page candidates

- `404.html`
- `amiga-demo-music/9-fingers-spaceballs.html`
- `amiga-demo-music/crionics-hardwired.html`
- `amiga-demo-music/cryonics-neverwhere.html`
- `amiga-demo-music/desert-dream-kefrens.html`
- `amiga-demo-music/enigma-phenomena.html`
- `amiga-demo-music/jesus-on-es.html`
- `amiga-demo-music/odyssey-alzatraz.html`
- `amiga-demo-music/red-sector-folow-me.html`
- `amiga-demo-music/sounds-of-silents.html`
- `amiga-demo-music/state-of-the-art.html`
- `community/admin.html`
- `community/unsubscribe.html`
- `games/b-c-bill/index.html`
- `games/b-c-s-quest-for-tires/index.html`
- `games/bc2-grog-s-revenge/index.html`
- `games/bully-s-sporting-darts/index.html`
- `games/dragon-s-lair-2-escape-from-singe-s-castle/index.html`
- `games/game.html`
- `games/gary-lineker-s-superstar-soccer/index.html`
- `games/h-e-r-o/index.html`
- `games/ivan-ironman-stewart-s-super-off-road/index.html`
- `games/jimmy-white-s-whirlwind-snooker/index.html`
- `games/m-u-l-e/index.html`
- `music/allister-brimble/index.html`
- …and 72 more in the JSON report

### Indexable pages missing from sitemaps

- `404.html`
- `community/activity.html`
- `community/admin.html`
- `community/index.html`
- `community/latest-comments.html`
- `community/profile.html`
- `community/public-profile.html`
- `community/top-rated.html`
- `community/unsubscribe.html`
- `games/b-c-2-grog-s-revenge/index.html`
- `games/b-c-bill/index.html`
- `games/b-c-s-quest-for-tires/index.html`
- `games/bc2-grog-s-revenge/index.html`
- `games/bully-s-sporting-darts/index.html`
- `games/dragon-s-lair-2-escape-from-singe-s-castle/index.html`
- `games/game.html`
- `games/gary-lineker-s-superstar-soccer/index.html`
- `games/h-e-r-o/index.html`
- `games/ivan-ironman-stewart-s-super-off-road/index.html`
- `games/jimmy-white-s-whirlwind-snooker/index.html`
- `games/m-u-l-e/index.html`
- `music/composer.html`
- `music/composers/index.html`
- `quiz/pack-6.html`
- `quiz/quiz-admin.html`
- …and 1 more in the JSON report

### Missing local assets

None detected.

## Repository and PR housekeeping

- Obsolete draft PR #1150 was closed without merging.
- PR #1144 remains open only as a reference source; it is stale, non-mergeable and too large for safe direct use.
- Future corrections should be rebuilt from current `main` as focused pull requests.

## Limitations

- External resources were not fetched, so this report does not claim that every remote download, manual or video is reachable.
- Search Console data is not available from the repository.
- The JSON report contains the complete page-level evidence used for later phases.

## Phase 1 gate

No canonical or indexing change should begin until this baseline has been reviewed and approved.
