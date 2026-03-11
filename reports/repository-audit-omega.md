# Omega Repository Audit (Static Snapshot)

## Inventory
- HTML files: 2044
- CSS files: 44
- JavaScript files: 97
- JSON data files: 14
- Sitemap files: 3

## Generators and build scripts
- `scripts/generate-slug-pages.js` builds game slug pages from `games/games.json`.
- `scripts/generate-retro-pages.js` builds retro video pages from `data/retro-events.json` and `data/amiga-demo-music.json`.
- `scripts/generate-sitemaps.js` composes game and page sitemaps and pulls generated retro page URLs.

## Data relationship map
- `games/games.json` → `scripts/generate-slug-pages.js` → `/games/{slug}/index.html`
- `data/retro-events.json` → `scripts/generate-retro-pages.js` → `/retro-events/{slug}/index.html` and `/retro-specials/{slug}/index.html`
- `data/amiga-demo-music.json` → `scripts/generate-retro-pages.js` → `/amiga-demo-music/{slug}/index.html`
- Retro and game outputs → `scripts/generate-sitemaps.js` → `sitemap-pages.xml` and `sitemap-games.xml`

## Duplication findings
- Retro page layout shell duplicated inside `templates/retro-page-template.html` and static collection/game Omega shells.
- Game/collection/retro pages repeatedly include the same Omega CSS stack (`ccg-master`, `ccg-mode`, `ccg-effects`, `ccg-anim`, `ccg-overlays`, `ccg-cards`, `games`, `ccg-footer`, `ccg-mobile-lite`).
- Repeated background wrapper (`ccg-bg`) and page scaffold (`ccg-page`, `ccg-main`, footer) appears across page families.

## Legacy and redirect notes
- Game slug pages are redirect stubs pointing to `games/game.html` query routes; this is intentional and should stay for compatibility.
- Existing static `_redirects` file present at `static/_redirects`; no URL rewrites changed in this optimisation pass.

## CSS/JS optimisation notes (safe mode)
- Introduce shared Omega base/content templates to remove HTML duplication first.
- Keep CSS and JS file load order stable to avoid regressions.
- Consolidation candidates should be phased into compatibility wrappers before removing legacy assets.

## Image audit notes
- Large image corpus under `resources/images/` should be batched for duplicate/perceptual hashing checks.
- WebP generation recommended as opt-in derivative assets; avoid in-place replacement for this pass.
