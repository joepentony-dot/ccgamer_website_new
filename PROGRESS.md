# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **97%**

Current milestone: **Broad site-wide regression testing completed and validated.**

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
- Completed the bounded image/performance pass while retaining native lazy loading, asynchronous image decoding, scoped media preconnects and the dependency-light static shell.
- Completed the homepage migration/content-parity review and retained `/home.html` alongside the prototype root without recreating unnecessary live-site runtime effects.
- Added a sitemap-driven site-wide regression harness and made it part of `npm run build`, so successful CI now requires the generated site to satisfy broad canonical, metadata, accessibility-shell, output, asset and compatibility checks.

## Validation

- Branch isolation remains intact; no merge, push or write to `main` was performed.
- Canonical production data/pages, live redirect configuration and deployment settings remain unchanged.
- GitHub Actions run `34599055789` passed the responsive/accessibility milestone end to end.
- Performance validation run `34604086776` completed successfully.
- Homepage validation run `34610383007` passed every stage.
- The first strict broad-regression run `34615963737` correctly failed because the new test expected `/home.html` to canonicalize to `/`. Read-only inspection of production `main/home.html` established that the live canonical is actually `/home.html`, so the test was corrected rather than changing established URL semantics.
- Final broad-regression GitHub Actions run `34616083177` passed every stage: Eleventy build, generated routes, responsive/accessibility shell, shared SEO, game structured data, archive-hub structured data, XML sitemap and all seven proven legacy redirects.
- The new broad regression gate validated **863 canonical sitemap URLs** and **3,936 local stylesheet/image references**. It verifies generated output existence, canonical equality, non-empty meta descriptions, accessibility-shell invariants, H1 presence, absence of unresolved `undefined`/`NaN` output, local static-asset existence, non-empty image alt text, `/home.html` canonical preservation and the seven evidenced 301 aliases.
- Eleventy generated 865 files and copied 690 passthrough files in the final green validation run.
- A full local checkout/build remains unavailable in this connector execution environment, so GitHub Actions remains the end-to-end build authority.

## Blockers

- No critical implementation blocker.
- No isolated browseable preview deployment has been configured yet; this is now the final major delivery milestone.
- Redirect compatibility continues to cover only aliases explicitly evidenced by repository data; broader redirect rules will not be invented.

## Next task

Inspect the repository's existing production deployment configuration and choose a preview path that is technically isolated from `www.cheekycommodoregamer.co.uk`. Configure and validate a browseable desktop/mobile preview without changing the live branch, production custom domain or production deployment. After deployment, run a final smoke/regression check against the isolated preview.

## Completion criteria still outstanding

- Configure and validate a browseable isolated preview deployment that cannot replace `www.cheekycommodoregamer.co.uk`.
- Perform the final deployed-preview smoke/regression check.
