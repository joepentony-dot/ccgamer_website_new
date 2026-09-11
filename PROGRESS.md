# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **70%**

Current milestone: **Dedicated Amiga Demo Music archive/index generated from repository-backed routes and demo-music records; rich detail-page migration remains separate**

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
- Added `/amiga-demo-music/` as a dedicated lightweight archive index.
- Added `amigaMusicArchive.js`, which combines the ten established local music routes/titles with the ten `demo_music` records in `games/collections/retro-events.json` so the archive reuses repository-backed YouTube IDs instead of inventing or duplicating metadata.
- Added fail-fast validation requiring route/video source counts to match and rejecting invalid local routes or duplicate routes/YouTube IDs.
- Added Music to the shared primary navigation.
- Extended isolated CI route checks to cover the dedicated `/amiga-demo-music/` archive.
- Added skip-to-content support, semantic navigation, visible keyboard focus treatment and reduced-motion handling.

## Validation

- Branch isolation remains intact; no merge or write to `main` was performed.
- Canonical `games/games.json`, `games/collections/retro-events.json`, existing Retro Specials pages, existing Amiga Demo Music detail pages and production pages remain unchanged and are only read/referenced by the prototype.
- The dedicated music archive resolves ten established local `/amiga-demo-music/<slug>/` routes and pairs them with the ten ordered `demo_music` records from the existing JSON source.
- The adapter fails the build if the route count and video-record count diverge, if a local music route is malformed, or if duplicate local routes/YouTube IDs are introduced.
- Detail ownership remains with the existing production-backed `/amiga-demo-music/.../` pages for now; this bounded milestone intentionally does not replace their richer canonical, social, VideoObject, breadcrumb, upload-date and duration metadata.
- The isolated GitHub Actions workflow now requires `_site/amiga-demo-music/index.html` alongside the established representative prototype routes.
- The previously pending Zzap!64 end-to-end workflow should be checked alongside the new archive workflow on the next run; no remote success is assumed until GitHub reports it.
- A full local checkout/build remains unavailable in this connector-only execution environment; remote CI remains the end-to-end build authority.

## Blockers

- No critical implementation blocker.
- Remote end-to-end validation for the newest Amiga Demo Music archive commit is pending after branch update.
- No isolated preview deployment has been configured yet; this remains deferred until the remaining principal detail/SEO work is stable.

## Next task

Migrate the ten Amiga Demo Music detail pages into Eleventy without losing the existing page-specific SEO/video metadata. Preserve each established `/amiga-demo-music/<slug>/` URL and validate canonical URLs, YouTube IDs, descriptions, VideoObject fields, breadcrumb structure, upload dates and durations before allowing the generated pages to replace the current prototype-route ownership.

## Completion criteria still outstanding

Complete home migration; Amiga Demo Music detail migration; SEO metadata/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
