# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **91%**

Current milestone: **Image/performance optimisation pass completed with bounded, source-safe improvements. Remote Eleventy validation is pending for the newest commits.**

## Completed

- Created and retained the dedicated `codex/eleventy-ccg-prototype` branch; `main` and the production deployment remain read-only.
- Kept the rebuild isolated under `prototype-eleventy/` with an Eleventy static-site build, shared Nunjucks layout/includes, shared navigation and responsive CSS.
- Added read-only normalization for canonical `games/games.json`, duplicate-slug protection and full generation of `/games/` plus individual `/games/<slug>/` pages.
- Added generated genre and publisher indexes/detail routes with deterministic, collision-safe slugs.
- Added the seven established collection gateways and migrated source-backed collection membership without changing canonical production data.
- Added source-backed Retro Events, Retro Specials, Zzap!64 and Amiga Demo Music hubs while preserving established detail URLs.
- Migrated all ten Amiga Demo Music detail pages into Eleventy while retaining their source-backed title, description, robots, canonical, social metadata, `VideoObject` and `BreadcrumbList` JSON-LD.
- Added shared canonical/robots/Open Graph/Twitter metadata across the prototype.
- Added a data-driven XML sitemap covering prototype hubs, games, genres, publishers, collections and migrated Amiga Demo Music pages.
- Added a prototype-only `_redirects` manifest for the seven explicit historical collection `.html` aliases already evidenced in repository data.
- Preserved the established individual game structured-data contract: `VideoGame + BreadcrumbList` in a schema.org graph, sourced from canonical game data.
- Corrected the Nunjucks JSON-LD handoff so game schema is emitted as parseable JSON rather than HTML-escaped entities.
- Completed archive-hub structured-data ownership review and preserved only repository-established schema contracts.
- Completed the dedicated responsive/mobile and accessibility shell review, including current-page navigation semantics, 44px minimum interactive targets, resilient small-screen layout, skip navigation, keyboard focus and reduced-motion handling.
- Completed the bounded image/performance pass:
  - retained native lazy loading and asynchronous decoding for game-card images so archive grids do not eagerly request every thumbnail;
  - retained lazy loading for embedded Amiga Demo Music YouTube players;
  - marked the primary individual-game artwork as high fetch priority because it is the principal above-the-fold visual rather than deferring it behind archive media;
  - added connection warming only on Amiga Demo Music detail pages for the privacy-enhanced YouTube embed/image origins, avoiding site-wide third-party connection overhead;
  - retained the single local stylesheet and dependency-light static shell; no client-side framework, font bundle, animation library or unnecessary JavaScript was introduced;
  - left canonical source images untouched rather than destructively recompressing or rewriting production assets during the prototype phase.

## Validation

- Branch isolation remains intact; no merge, push or write to `main` was performed.
- Canonical production data/pages, live redirect configuration and deployment settings remain unchanged.
- GitHub Actions run `34599055789` previously passed the full responsive/accessibility milestone end to end.
- Existing generated game cards already use `loading="lazy" decoding="async"`; the performance pass preserved this behaviour.
- Existing Amiga Demo Music embeds already use `loading="lazy"`; the performance pass preserved this behaviour and scoped preconnects to those detail pages only.
- Game-detail performance commit `e4a3da228af474093cc5d7442a211fb75ca2540f` adds `fetchpriority="high"` to the principal game image without changing its source asset.
- Music-detail performance commit `91a5b06c7d1b492979d84a9b8ab4a54571e29e7a` adds page-scoped YouTube connection warming without changing the lazy iframe or SEO metadata.
- Eleventy validation run `34604086776` for the first performance commit was in progress at checkpoint time; the newest end-to-end result is therefore recorded as pending rather than assumed successful.
- A full local checkout/build remains unavailable in this connector execution environment, so GitHub Actions remains the end-to-end build authority.

## Blockers

- No critical implementation blocker.
- Remote validation for the newest performance commits is still pending.
- No isolated browseable preview deployment has been configured yet; this remains deferred until broader regression and home-content parity checks are complete.
- Redirect compatibility continues to cover only aliases explicitly evidenced by repository data; broader redirect rules will not be invented.

## Next task

Confirm the newest remote Eleventy validation result, then perform the home migration/content-parity review against the existing CCG homepage. Preserve important branding, archive entry points and content while keeping the prototype static and lightweight. Do not reintroduce unnecessary cinematic effects or client-side dependencies.

## Completion criteria still outstanding

- Confirm remote validation for the performance pass.
- Complete home migration/content parity review.
- Broader regression testing.
- Configure a browseable isolated preview deployment that cannot replace `www.cheekycommodoregamer.co.uk`.
