# Phase 0 SEO and Site-Integrity Baseline

This report is generated from the current repository without changing public pages.

## Executive summary

| Check | Count |
|---|---:|
| HTML pages audited | **1690** |
| Indexable pages | **934** |
| Noindex pages | **756** |
| Indexable pages with duplicate titles | **53** |
| Indexable pages with duplicate meta descriptions | **42** |
| Canonical URLs claimed by multiple indexable pages | **59** |
| Indexable pages missing titles | **3** |
| Indexable pages missing meta descriptions | **27** |
| Indexable pages missing canonicals | **12** |
| Indexable pages without exactly one H1 | **706** |
| Indexable pages with no detected incoming link | **108** |
| Indexable pages absent from sitemaps | **37** |
| Sitemap URLs that canonicalise elsewhere | **0** |
| Broken internal links | **4** |
| Missing local assets | **4** |
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

- `scripts/templates/retro-video-page-template.html` → `__COLLECTION_URL__`
- `templates/game-template.html` → `/games/{{SLUG}}/`
- `templates/retro-video-content.html` → `{{collection_url}}`
- `templates/retro-video-content.html` → `{{youtube_watch_url}}`

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
- `index_temp.html`
- …and 83 more in the JSON report

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
- `index_temp.html`
- `music/composer.html`
- `music/composers/index.html`
- `quiz/pack-6.html`
- …and 12 more in the JSON report

### Missing local assets

- `index_temp.html` → `resources/audio/c64_speech_stayawhile.mp3`
- `resources/quiz.html` → `../css/engine.css`
- `resources/quiz.html` → `css/main.css`
- `resources/quiz.html` → `../js/engine.js`

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
