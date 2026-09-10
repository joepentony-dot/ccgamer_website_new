# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **30%**

Current milestone: **Generated genre archive routes implemented with deterministic collision-safe slugs**

## Completed

- Created dedicated branch `codex/eleventy-ccg-prototype` from the current `main` head.
- Kept prototype files isolated under `prototype-eleventy/` so production files remain untouched.
- Added Eleventy package manifest and configuration.
- Added a shared Nunjucks base layout.
- Added a lightweight responsive prototype stylesheet.
- Added a static prototype home page.
- Replaced the Games placeholder with a build-time generated Games index.
- Added a read-only Eleventy data adapter that reads the canonical `games/games.json` without modifying it.
- Added pagination-driven individual game pages at `/games/<slug>/`.
- Added existing thumbnail passthrough support so generated cards/details can reuse canonical CCG artwork without copying or altering source images.
- Added responsive game-card and game-detail styling.
- Added an isolated GitHub Actions workflow intended to run `npm install`, build the prototype, and verify representative generated routes.
- Corrected the canonical game-data relative path during validation review before checkpointing the initial integration milestone.
- Added prototype README with safety boundary and local build commands.
- Added reusable `_includes/components/game-card.njk` so game-list presentation is no longer duplicated in the Games index.
- Hardened game metadata normalization with trimmed text values, array/single-value normalization for genres and publishers, numeric rating validation, thumbnail path normalization, system labels, safe description fallbacks, and numeric year validation.
- Added build-time duplicate-slug protection so multiple canonical records cannot attempt to emit the same `/games/<slug>/` route during prototype validation.
- Expanded the deterministic validation archive from 12 records to a bounded 100-record sample.
- Removed the remaining 100-record validation cap after the broader sample showed the adapter assumptions were safe enough to proceed.
- Enabled the complete normalized game archive for Eleventy generation while keeping the canonical database read-only.
- Updated the Games index copy so the prototype now reports the full normalized archive rather than a bounded sample.
- Added reusable `_includes/components/site-nav.njk` and moved primary navigation out of the base layout markup.
- Added an accessible skip link and visible keyboard-focus treatment to the shared layout/style layer.
- Added build-time `gameArchive` grouping derived from the normalized game data, with deterministic A–Z groups plus a fallback `#` group for non-letter titles.
- Reworked `/games/` into a server-rendered A–Z archive with lightweight jump links, per-letter headings and back-to-A–Z links, avoiding a client-side filtering dependency.
- Added responsive archive-navigation styling and reduced-motion handling for smooth-scroll behaviour.
- Added build-time `genreArchive` taxonomy data derived only from normalized game records.
- Added deterministic genre slug generation with normalization for punctuation, accents and ampersands.
- Added explicit build-time collision protection so two distinct genre labels cannot silently emit the same genre route.
- Added `/games/genres/` as a server-rendered genre index with per-genre game counts.
- Added pagination-driven `/games/genres/<slug>/` pages that reuse the existing game-card component.
- Added Genres to the shared primary navigation.
- Extended the isolated workflow route checks to include the genre index and representative `/games/genres/arcade/` route.

## Validation

- Branch isolation verified; all writes remain on `codex/eleventy-ccg-prototype`.
- Existing production files on `main` were not updated, deleted, renamed, or merged.
- Canonical `games/games.json` remains read-only and unchanged.
- The data adapter resolves from `prototype-eleventy/src/_data/` back to repository-root `games/games.json` using `../../../games/games.json`.
- Generated permalink pattern preserves `/games/<slug>/` for individual prototype pages.
- Metadata normalization tolerates missing/blank strings, publisher data represented as arrays or single values, missing descriptions, invalid/empty ratings, invalid years, and thumbnails with a leading slash.
- Duplicate game slugs are prevented from producing conflicting output pages; the first normalized canonical record is retained and later duplicates are logged and skipped in the prototype build.
- The Games index and individual pagination template consume normalized records only.
- Existing thumbnail URLs remain source-backed and no canonical artwork was copied or altered.
- Full-archive enablement changes only removed the artificial `.slice(0, 100)` cap; normalization and duplicate-route safeguards remain intact.
- Shared navigation uses semantic `<nav>` markup with a primary-navigation label, and the layout provides a skip target at `#main-content`.
- A–Z archive grouping is computed at build time from normalized titles and does not mutate the source dataset or add runtime JavaScript.
- Archive anchors are deterministic (`games-a` through `games-z`, with `games-other` for non-letter titles), and only initials that actually exist in the normalized archive are emitted.
- Genre taxonomy generation uses the normalized `genres` arrays only and does not alter source records.
- Genre labels are consolidated case-insensitively before route generation; generated slugs are deterministic and a collision between distinct labels fails the build instead of overwriting output.
- `node --check` passes for the new genre taxonomy data module.
- Canonical source data confirms `arcade` is present, so the representative workflow route assertion has a valid source genre.
- Remote GitHub Actions runtime confirmation remains pending until a run is observable after this checkpoint.

## Blockers

- No critical implementation blocker.
- End-to-end runtime build confirmation remains pending until the isolated prototype workflow produces an observable result or another build-capable runner is available.
- No preview deployment has been configured yet; this remains intentionally deferred until the core generated routes and archive taxonomy are more mature.

## Next task

Generate publisher archive data and `/games/publishers/` routes using the same deterministic taxonomy pattern. Validate publisher normalization and slug collisions against the full normalized archive before extending shared navigation.

## Completion criteria still outstanding

Complete home migration; publishers; collections; Zzap!64; retro specials; music; SEO/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
