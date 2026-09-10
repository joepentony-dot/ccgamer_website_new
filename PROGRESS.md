# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **34%**

Current milestone: **Generated publisher archive routes implemented with deterministic collision-safe slugs**

## Completed

- Created dedicated branch `codex/eleventy-ccg-prototype` from `main`; all prototype work remains isolated there.
- Kept prototype implementation under `prototype-eleventy/` and treated production files plus `main` as read-only.
- Added Eleventy configuration, shared Nunjucks layout, responsive stylesheet, prototype homepage and reusable shared navigation.
- Added a read-only adapter for canonical `games/games.json` with normalization for strings, arrays, ratings, years, thumbnails, descriptions and systems.
- Added duplicate game-slug protection and full-archive generation for `/games/` plus individual `/games/<slug>/` routes.
- Added reusable game-card rendering, responsive game detail/card styling, A–Z archive grouping and accessible archive navigation.
- Added generated `/games/genres/` and `/games/genres/<slug>/` routes with deterministic slugging and build-time collision protection.
- Added generated `/games/publishers/` and `/games/publishers/<slug>/` routes using the same normalized, collision-safe build-time taxonomy pattern.
- Added Publishers to the shared primary navigation.
- Added an isolated GitHub Actions workflow for installing dependencies, building the prototype and checking representative generated routes.
- Added skip-to-content support, semantic navigation, visible keyboard focus treatment and reduced-motion handling.

## Validation

- Branch isolation remains intact; no merge or write to `main` was performed.
- Canonical `games/games.json` remains unchanged and is only read by the prototype adapter.
- Publisher taxonomy consumes normalized `publishers` arrays from the existing adapter and does not mutate source records.
- Publisher labels are consolidated case-insensitively, sorted deterministically, and mapped to stable URL slugs.
- Distinct publisher labels that normalize to the same slug cause an explicit build error rather than silently overwriting output.
- `node --check` passes for the new `publisherArchive.js` data module.
- Publisher index/detail templates mirror the already-established genre archive structure and reuse the existing game-card include.
- GitHub Actions runs are now observable for this branch. The latest navigation checkpoint workflow is queued at the time of this update; the immediately preceding publisher-route workflow was already accepted and started by GitHub Actions.

## Blockers

- No critical implementation blocker.
- Final end-to-end confirmation of the newest publisher/navigation checkpoint remains dependent on the currently queued GitHub Actions run completing.
- No isolated preview deployment has been configured yet; this remains deferred until more principal content sections are migrated.

## Next task

Inspect the existing collections structure and implement a bounded first collections migration that preserves current collection names and URL compatibility while reusing normalized game-card output where the source data permits it. Validate route generation and avoid inventing collection membership that is not represented in existing repository data.

## Completion criteria still outstanding

Complete home migration; collections; Zzap!64; retro specials; music; SEO metadata/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
