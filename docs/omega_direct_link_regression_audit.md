# Omega Continuation Audit — Direct-Link Regression (`/games/{slug}/`)

## Scope
- Route config: `_redirects`
- Game route shell: `games/game.html`
- Runtime loader: `js/load-single-game.js`
- All HTML under `games/`

## Findings

### 1) What currently serves `/games/{slug}/`
- There are **658** slug directory routes at `games/{slug}/index.html`.
- These pages are lightweight redirect shells (`meta refresh` + `window.location.replace`) to `/games/game.html?id=...`.
- There is also a Netlify route fallback in `_redirects` that rewrites `/games/*` to `/games/game.html`.

### 2) Where the interactive page is bootstrapped
- The interactive Omega page is `games/game.html`.
- Hydration/render is handled by `js/load-single-game.js`, which resolves game identity from:
  - pathname slug (`/games/{slug}/`),
  - query `slug`,
  - query `id` (legacy).

### 3) Why users can still land on a stub (Twitter/X in-app risk)
- The repo contains **650** flat slug pages at `games/{slug}.html`.
- **649** of those are SEO stubs containing “View the full interactive game page”.
- Those stub pages were accessible directly (for example from old links or crawled shared links).
- On stub pages, CSS/JS assets are relative (`../resources/...`), which break if a host/rewrite presents the file at `/games/{slug}/` URL depth, causing unstyled/minimal rendering.
- Existing `/games/*` rewrite was non-forced (`200`), so file shadowing could still serve physical slug files instead of always forcing the interactive route.

## Link-format audit summary

- Total HTML pages checked under `games/`: **1330**
- Route-format counts:
  - `/games/{slug}/` directory routes (`games/{slug}/index.html`): **658**
  - `/games/{slug}.html` flat routes (`games/{slug}.html`): **650**
- Page-type classification:
  - Fully interactive game shell (`games/game.html`): **1**
  - SEO stubs (`View the full interactive game page`): **649**
  - Redirect directory shells (`meta refresh` to `/games/game.html?...`): **656**
  - Other non-slug pages (indexes, genres, collections, edge cases): **24**

## Failing-path groups (pre-fix)

1. **Flat slug stubs (`/games/{slug}.html`)**
   - Failure reason: normal visitors can land on SEO stub instead of Omega interactive page.

2. **Any slug path shadowed by physical files**
   - Failure reason: non-forced wildcard rewrites allowed host/file precedence behavior instead of guaranteed interactive routing.

## Implemented fix
- Updated `_redirects` with forced game-route rules:
  - `/games/:slug.html` → `/games/game.html?slug=:slug` (`301!`)
  - `/games/:slug/` → `/games/game.html?slug=:slug` (`200!`)
  - `/games/*` → `/games/game.html` (`200!`)
- Kept explicit safe passthrough routes first for `/games/genres/*`, `/games/collections/*`, `/games/seo/*`, `/games/index.html`, and `/games/game.html`.

This guarantees cold loads of canonical share links (`/games/{slug}/`) and legacy `.html` links both land on the interactive Omega game page.
