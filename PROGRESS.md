# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **80%**

Current milestone: **Generated XML sitemap and evidence-backed legacy collection URL compatibility are now validated on the isolated Eleventy prototype**

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
- Added a generated `/sitemap.xml` covering static prototype hubs, every normalized game route, every generated genre route, every generated publisher route, every migrated collection route and all ten Amiga Demo Music detail canonicals.
- Replaced the initial `collections.all` sitemap approach after validation proved that paginated genre/publisher/game outputs were not comprehensively represented there; the final sitemap is deliberately data-driven from the same canonical prototype adapters that own those routes.
- Audited legacy collection URL ownership and found seven explicit `.html` aliases already recorded in `collectionArchive.js`; no game, genre or publisher redirects were inferred without source evidence.
- Added a prototype-only `_redirects` manifest mapping those seven proven legacy collection `.html` URLs to their trailing-slash Eleventy routes with permanent redirects, and configured Eleventy to copy that manifest only into the prototype build output.
- Added CI regression checks for the sitemap and all seven evidence-backed legacy collection redirects.

## Validation

- Branch isolation remains intact; no merge or write to `main` was performed.
- Canonical `games/games.json`, production pages, production redirect/deployment configuration and existing music pages remain unchanged.
- The prior shared-SEO validation is confirmed green in GitHub Actions.
- The first sitemap attempt correctly failed CI because `collections.all` omitted paginated genre output; diagnostic validation identified `/games/genres/arcade/` as the missing representative route rather than allowing an incomplete sitemap to pass.
- The corrected data-driven sitemap subsequently passed the full remote Eleventy build, generated-route checks, shared SEO checks and sitemap assertions.
- The prototype redirect manifest passed the full remote Eleventy build, route checks, shared SEO checks, sitemap checks and all seven legacy redirect assertions.
- CI continues to verify representative homepage, game, genre, collection and Amiga Demo Music detail outputs.
- A full local checkout/build remains unavailable in this connector-only execution environment because GitHub HTTPS credentials are not exposed to the container; remote GitHub Actions remains the end-to-end build authority.

## Blockers

- No critical implementation blocker.
- No isolated preview deployment has been configured yet; this remains deferred until the remaining structured-data, usability/performance and regression work is stable.
- Redirect compatibility currently covers only aliases explicitly evidenced by repository data. Any broader legacy URL migration must be source-backed before rules are added.

## Next task

Complete the remaining structured-data ownership review, beginning with generated game pages and primary archive hubs. Preserve existing source-backed schema where it exists, avoid generic or invented structured data, and add representative regression assertions before moving into the dedicated responsive/mobile and accessibility review.

## Completion criteria still outstanding

Complete home migration review; remaining structured-data ownership review; dedicated responsive/mobile usability review; accessibility review; image/performance optimisation; broader regression testing; and an isolated browseable preview deployment.
