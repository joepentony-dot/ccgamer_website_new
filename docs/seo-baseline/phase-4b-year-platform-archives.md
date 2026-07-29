# Phase 4B Year and Platform Archive Foundations

## Results

| Check | Count |
|---|---:|
| Game records scanned | **652** |
| Year hub pages | **1** |
| Platform hub pages | **1** |
| Static year routes | **15** |
| Indexable year routes | **14** |
| Single-game noindex year routes | **1** |
| Static platform routes | **2** |
| C64 games | **552** |
| Amiga games | **100** |

## Routes created

- `/games/years/`
- `/games/years/1982/` — 10 games — `index,follow`
- `/games/years/1983/` — 43 games — `index,follow`
- `/games/years/1984/` — 94 games — `index,follow`
- `/games/years/1985/` — 96 games — `index,follow`
- `/games/years/1986/` — 82 games — `index,follow`
- `/games/years/1987/` — 85 games — `index,follow`
- `/games/years/1988/` — 50 games — `index,follow`
- `/games/years/1989/` — 50 games — `index,follow`
- `/games/years/1990/` — 44 games — `index,follow`
- `/games/years/1991/` — 37 games — `index,follow`
- `/games/years/1992/` — 29 games — `index,follow`
- `/games/years/1993/` — 15 games — `index,follow`
- `/games/years/1994/` — 12 games — `index,follow`
- `/games/years/1995/` — 4 games — `index,follow`
- `/games/years/2023/` — 1 game — `noindex,follow`
- `/games/platforms/`
- `/games/platforms/c64/` — 552 games
- `/games/platforms/amiga/` — 100 games

## Generated features

- Static year and platform hubs.
- Direct static links from every archive route to matching game pages.
- Search and bounded platform/year filters as progressive enhancement.
- Canonical, Open Graph and Twitter metadata.
- CollectionPage, BreadcrumbList and ItemList structured data.
- Namespaced CSS with archive thumbnail isolation.
- Deterministic metadata at `games/archive-navigation.json`.

## Indexing policy

- Both hubs and both platform routes use `index,follow`.
- Year routes containing at least 2 games use `index,follow`.
- The 2023 route currently contains one game and uses `noindex,follow`.

## Explicit exclusions

- No changes to `games/games.json`.
- No sitemap or `tools/seo/static-pages.json` integration; that remains Phase 4C.
- No Browse Games discovery links; that remains Phase 4C.
- No previous/next year navigation or platform cross-link expansion; that remains Phase 4C.
- No homepage or intro-loader changes.

## Rollback

Revert the Phase 4B squash merge commit. The generated routes, assets, workflow and metadata can then be removed together.
