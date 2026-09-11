# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **100%**

Current milestone: **PROTOTYPE COMPLETE — core Eleventy prototype is stable, regression-tested and available through an isolated browseable preview.**

## Completed

- Created and retained the dedicated `codex/eleventy-ccg-prototype` branch; `main` and the production deployment remain read-only.
- Kept the rebuild isolated under `prototype-eleventy/` with an Eleventy static-site build, shared Nunjucks layout/includes, shared navigation and responsive CSS.
- Added read-only normalization for canonical `games/games.json`, duplicate-slug protection and full generation of `/games/` plus individual `/games/<slug>/` pages.
- Added generated genre and publisher indexes/detail routes with deterministic, collision-safe slugs.
- Added the seven established collection gateways and migrated source-backed collection membership without changing canonical production data.
- Added source-backed Retro Events, Retro Specials, Zzap!64 and Amiga Demo Music hubs while preserving established public URLs.
- Migrated all ten Amiga Demo Music detail pages into Eleventy while retaining their source-backed title, description, robots, canonical, social metadata, `VideoObject` and `BreadcrumbList` JSON-LD.
- Added shared canonical/robots/Open Graph/Twitter metadata across the prototype.
- Added a data-driven XML sitemap covering prototype hubs, games, genres, publishers, collections and migrated Amiga Demo Music pages.
- Added a prototype-only `_redirects` manifest for the seven explicit historical collection `.html` aliases already evidenced in repository data.
- Preserved the established individual game structured-data contract: `VideoGame + BreadcrumbList` in a schema.org graph, sourced from canonical game data.
- Preserved only repository-established archive-hub structured-data contracts rather than inventing additional schema.
- Completed responsive/mobile and accessibility review, including current-page navigation semantics, 44px minimum interactive targets, resilient small-screen layout, skip navigation, keyboard focus and reduced-motion handling.
- Completed the bounded image/performance pass while retaining native lazy loading, asynchronous image decoding, scoped media preconnects and the dependency-light static shell.
- Completed the homepage migration/content-parity review and retained `/home.html` alongside the prototype root without recreating unnecessary live-site runtime effects.
- Added a sitemap-driven site-wide regression harness to `npm run build`.
- Added an isolated branch-only preview server that serves generated Eleventy output and forces `X-Robots-Tag: noindex, nofollow, noarchive` on preview responses.
- Created an isolated Render preview from `codex/eleventy-ccg-prototype`, separate from GitHub Pages and the production custom domain: `https://ccg-eleventy-preview.onrender.com`.
- Added an exact-commit preview health endpoint and a GitHub Actions deployed-preview smoke workflow.

## Validation

- Branch isolation remains intact; no merge, push or write to `main` was performed.
- Canonical production data/pages, live redirect configuration, production GitHub Pages workflow and `www.cheekycommodoregamer.co.uk` remain unchanged.
- Final broad-regression GitHub Actions run `34616083177` passed every stage before preview work began.
- Preview-server validation GitHub Actions run `34621893370` passed after the branch-only server was added.
- Render successfully built the prototype with Eleventy, generating **865 files** and copying **690 passthrough files**.
- The Render build ran the complete regression harness successfully against **863 canonical URLs** and **3,936 local stylesheet/image references**.
- The final isolated preview deploy for commit `6b521f2d8ca565043f6619e9d3b1f92fdc09d9ad` reached `live` status.
- Final deployed-preview smoke run `34623292409` passed. It first verified that Render was serving the exact branch commit, then successfully fetched representative homepage, `/home.html`, games, game detail, genre, publisher, collection, Retro Specials, Zzap!64, Amiga Demo Music and sitemap routes.
- The deployed smoke also confirmed non-empty HTML/XML responses and the preview-only `noindex` HTTP header.
- An earlier smoke route used `/retro-specials/`, but the generated Eleventy gateway is the established `/games/collections/retro-specials/` route. The smoke target was corrected to the actually generated route rather than inventing a new URL.

## Blockers

- **None.**
- Redirect compatibility intentionally remains limited to aliases explicitly evidenced by repository data; broader redirect rules were not invented.

## Next task

**None — PROTOTYPE COMPLETE.** Do not make further prototype changes on subsequent scheduled runs unless the user explicitly reopens the work or requests a new bounded task.

## Completion criteria

- Principal Eleventy sections generated successfully: **met**.
- Navigation and responsive/mobile use working: **met**.
- Accessibility shell validated: **met**.
- SEO metadata, structured data, sitemap and evidenced compatibility aliases preserved: **met**.
- No critical build/regression failures: **met**.
- Dependency-light static architecture and performance-oriented media handling in place: **met**.
- Browseable isolated preview available without replacing production: **met**.
- Deployed preview smoke-tested against representative public routes: **met**.

**PROTOTYPE COMPLETE**
