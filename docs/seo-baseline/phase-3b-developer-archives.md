# Phase 3B Developer Archive Foundation

## Results

| Check | Count |
|---|---:|
| Game records scanned | **666** |
| Static developer routes | **47** |
| Indexable credited routes | **47** |
| No-credit noindex routes | **0** |
| Developer hub pages | **1** |

## Indexing policy

- The developer hub and pages with at least 1 credited games use `index,follow`.
- Single-game developer pages with one verified catalogue credit use `index,follow`. No-credit and noncanonical fallbacks are not promoted.
- Every route remains linked from the static developer hub.

## Route-layer normalization

- `inforgrames` → **Infogrames**

The source records in `games/games.json` remain unchanged.

## Most represented developer credits

- Mastertronic: **8** games
- Broderbund: **6** games
- Lucasfilm Games: **6** games
- Sensible Software: **5** games
- Delphine Software: **3** games
- Infogrames: **3** games
- Capcom: **2** games
- Konami: **2** games
- Ocean: **2** games
- Reaktor Software: **2** games
- US Gold: **2** games
- 3-2-1 Software: **1** game
- Andromeda Software: **1** game
- Argus Press Software: **1** game
- Ariolasoft: **1** game

## Generated features

- Crawlable developer hub with search and C64/Amiga filters.
- Static developer pages containing direct game links.
- CollectionPage, BreadcrumbList and ItemList structured data.
- Canonical, Open Graph and Twitter metadata.
- Sitemap inclusion for the hub and all verified catalogue-backed canonical developer routes, including single-credit routes.
- A static discovery link from the main Browse Games page.

## Explicit exclusions

- No changes to `games/games.json`.
- No biographies, company histories or unsupported relationships were added.
- No homepage or intro-loader changes.
- Zero-credit and noncanonical fallback pages are excluded; single-credit canonical developer routes remain eligible.

## Rollback

Revert the Phase 3B squash merge commit. The generated archive can then be removed by reverting the generator, workflow and generated outputs together.
