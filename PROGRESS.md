# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **77%**

Current milestone: **Prototype-wide shared SEO metadata is now emitted centrally for Eleventy pages using the shared base layout**

## Completed

- Created dedicated branch `codex/eleventy-ccg-prototype` from `main`; all prototype work remains isolated there.
- Kept prototype implementation under `prototype-eleventy/` and treated production files plus `main` as read-only.
- Added Eleventy configuration, shared Nunjucks layout, responsive stylesheet, prototype homepage and reusable shared navigation.
- Added a read-only adapter for canonical `games/games.json` with normalization for strings, arrays, ratings, years, thumbnails, descriptions and systems.
- Added duplicate game-slug protection and full-archive generation for `/games/` plus individual `/games/<slug>/` routes.
- Added reusable game-card rendering, responsive game detail/card styling, A–Z archive grouping and accessible archive navigation.
- Added generated `/games/genres/` and `/games/genres/<slug>/` routes with deterministic slugging and build-time collision protection.
- Added generated `/games/publishers/` and `/games/publishers/<slug>/` routes using the same normalized, collision-safe build-time taxonomy pattern.
- Added a prototype `/games/collections/` index preserving the seven established collection names and legacy URLs from the existing site.
- Added `/games/collections/cartridge-games/`, `/licensed-games/`, `/bpjs-indexed-games/` and `/top-picks/` from explicit repository fallback membership only.
- Added `/games/collections/amiga-demo-music/` as a lightweight gateway preserving the ten explicit established music routes.
- Added `/games/collections/retro-events/` driven directly from `games/collections/retro-events.json`, excluding records marked `demo_music` to avoid ownership overlap.
- Added `/games/collections/retro-specials/` preserving the 20 explicit feature links exposed by the existing Retro Specials collection page.
- Added `/zzap64/` as a lightweight source-backed hub for the five established Zzap!64 Retro Specials routes and added Zzap!64 to shared navigation.
- Added `/amiga-demo-music/` as a dedicated lightweight archive index and added Music to the shared primary navigation.
- Added `amigaMusicArchive.js`, which reads the ten existing `/amiga-demo-music/<slug>/index.html` source pages at build time and preserves their title, description, robots directive, canonical URL, Open Graph video/image fields, Twitter metadata, `VideoObject` JSON-LD and `BreadcrumbList` JSON-LD.
- Added generated Eleventy detail pages for all ten established `/amiga-demo-music/<slug>/` routes with responsive privacy-enhanced YouTube embeds and source-backed YouTube links.
- Replaced fragile index-based demo-video pairing with identity matching against each source page's `VideoObject.embedUrl`.
- Added fail-fast validation for missing source pages, malformed routes, missing SEO/schema fields, canonical mismatches, unmatched YouTube IDs, duplicate routes/canonicals/YouTube IDs, and incomplete source-to-record matching.
- Added skip-to-content support, semantic navigation, visible keyboard focus treatment and reduced-motion handling.
- Added shared SEO metadata to `layouts/base.njk`: canonical URL, robots directive, Open Graph title/description/url/site name, Twitter card/title/description/url/site, and optional social image handling.
- Canonical generation uses the established production hostname plus Eleventy's generated `page.url`, preserving trailing-slash route ownership rather than inventing a new URL model.
- Extended isolated CI with representative canonical and social-metadata assertions covering homepage, game, genre and collection outputs.

## Validation

- Branch isolation remains intact; no merge or write to `main` was performed.
- Canonical `games/games.json`, production pages, existing music pages and production deployment configuration remain unchanged.
- The previous full Amiga Demo Music implementation build is green in GitHub Actions.
- Shared SEO changes are confined to `prototype-eleventy/src/_includes/layouts/base.njk` and the isolated `eleventy-prototype.yml` validation workflow.
- CI now fails if representative generated routes do not contain their expected production-domain canonical URLs, `og:site_name`, or the established `@CheekyC64Gamer` Twitter site identity.
- The newest shared-SEO validation commit has not yet surfaced a remote workflow result, so it is recorded as pending rather than assumed successful.
- A full local checkout/build remains unavailable in this connector-only execution environment because GitHub HTTPS credentials are not exposed to the container; remote GitHub Actions remains the end-to-end build authority.

## Blockers

- No critical implementation blocker.
- Remote GitHub Actions confirmation for the newest shared SEO checkpoint is pending.
- No isolated preview deployment has been configured yet; this remains deferred until the remaining routing/sitemap regression work is stable.

## Next task

Continue the SEO and URL-compatibility pass by adding a generated XML sitemap for Eleventy-owned public routes and auditing established `.html` versus trailing-slash compatibility. Preserve existing public URL ownership and add regression checks before introducing any redirect compatibility layer.

## Completion criteria still outstanding

Complete home migration review; XML sitemap and legacy URL/redirect compatibility; remaining structured-data ownership review; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
