# Phase 3B Developer Archive Foundation

## Results

| Check | Count |
|---|---:|
| Game records scanned | **652** |
| Static developer routes | **36** |
| Indexable multi-game routes | **11** |
| Single-game noindex routes | **25** |
| Developer hub pages | **1** |

## Indexing policy

- The developer hub and pages with at least 2 credited games use `index,follow`.
- Single-game developer pages use `noindex,follow` until another credited game is present.
- Every route remains linked from the static developer hub.

## Route-layer normalization

- `inforgrames` → **Infogrames**

The source records in `games/games.json` remain unchanged.

## Most represented developer credits

- Mastertronic: **8** games
- Broderbund: **6** games
- Lucasfilm Games: **6** games
- Sensible Software: **4** games
- Delphine Software: **3** games
- Infogrames: **3** games
- Capcom: **2** games
- Konami: **2** games
- Ocean: **2** games
- Reaktor Software: **2** games
- US Gold: **2** games
- 3-2-1 Software: **1** game
- Argus Press Software: **1** game
- Ariolasoft: **1** game
- Binary Asylum: **1** game

## Generated features

- Crawlable developer hub with search and C64/Amiga filters.
- Static developer pages containing direct game links.
- CollectionPage, BreadcrumbList and ItemList structured data.
- Canonical, Open Graph and Twitter metadata.
- Sitemap inclusion for the hub and multi-game routes.
- A static discovery link from the main Browse Games page.

## Explicit exclusions

- No changes to `games/games.json`.
- No biographies, company histories or unsupported relationships were added.
- No homepage or intro-loader changes.
- No single-game developer page was placed in the sitemap.

## Rollback

Revert the Phase 3B squash merge commit. The generated archive can then be removed by reverting the generator, workflow and generated outputs together.
