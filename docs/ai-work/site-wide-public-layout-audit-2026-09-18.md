# Site-wide public layout audit — 18 September 2026

## Scope

Follow-up to merged PR #2146, which moved all individual game pages onto the shared premium compact single-game layout/runtime/generator path.

This audit reviewed the public page families represented by the generated sitemaps rather than hand-editing isolated pages.

Observed sitemap inventory at the start of this follow-up:

- `sitemap-pages.xml`: 387 public non-game routes.
- `sitemap-games.xml`: 660 game routes.
- Combined audited public-route inventory: 1,047 URLs.

## Changes applied

### Publisher archives — 162 sitemap routes

Shared owner: `resources/css/publishers.css`

- desktop browsing frame reduced from 1400px to 1240px;
- hero and section padding tightened;
- tools, breadcrumbs, card bodies and wayfinding spacing tightened;
- game-card grids use `content-visibility: auto` with intrinsic-size fallbacks so large publisher catalogues defer off-screen layout/paint without removing crawlable content;
- mobile frame and card spacing tightened.

### Developer archives — 12 sitemap routes

Shared owner: `resources/css/developers.css`

- same 1240px compact archive frame;
- tighter hero, tools, sections and cards;
- off-screen developer/game cards use `content-visibility: auto`;
- mobile width/padding tightened.

### Year / platform archives — 18 sitemap routes

Shared owner: `resources/css/year-platform-archives.css`

- same 1240px archive frame;
- tighter hero, filters, sections and game-card body spacing;
- long year/platform game grids defer off-screen rendering with `content-visibility: auto`;
- mobile archive spacing tightened.

### Retro video details — Retro Specials, Retro Events, Amiga Demo Music

Shared owner: `resources/css/retro-video-pages.css`

- shared detail frame reduced from 1320px to 1240px;
- hero padding/gap and section spacing tightened;
- text line length reduced for faster scanning;
- related cards use `content-visibility: auto`;
- mobile detail width and spacing tightened.

### Music / composer hub

Shared owner: `resources/css/music-composer.css`

- retained its intentionally narrower format and tightened it slightly from 1080px to 1040px;
- reduced section/card spacing;
- individual composer game rows use off-screen render deferral.

## Audited and deliberately not reworked

These families were inspected and already match the desired compact hierarchy closely enough that a broad override would create more regression risk than benefit:

- Home — existing locked home layout remains untouched.
- Games index — already uses the 1240px Omega archive landing system.
- Genre and collection pages — already use the compact category Omega system (roughly 980–1020px editorial hero/content widths).
- About / Contact / Emulation — shared info shell already caps at 1200px with readable 68–76ch copy widths.
- Community/account — already uses a narrow auth/account shell and does not benefit from the archive layout rules.
- Complete Index — already has a compact dedicated layout.
- Redirect/stub routes — no visual redesign required.

## Performance / cache

The changed public CSS is cacheable code, so `CODE_CACHE_VERSION` is bumped from `2026-09-18-public-code-v5` to `2026-09-18-public-code-v6`.

## Guardrails

- No individual generated publisher/developer/year/platform/retro/composer page is hand-edited.
- No Dungeon Carnage, Commodore Quest or other game runtime is changed.
- No home layout CSS is changed.
- No game data is changed.
- Content remains present in the DOM for indexing; `content-visibility` only defers off-screen style/layout/paint work in supporting browsers.

## Validation

`tests/site-wide-public-layout-audit.test.mjs` protects:
- the 1240px archive frame;
- off-screen card rendering deferral;
- compact retro detail layout;
- narrow music/composer layout;
- required public-code cache namespace bump.
