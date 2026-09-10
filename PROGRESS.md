# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **22%**

Current milestone: **Complete normalized game archive enabled in the isolated Eleventy build**

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
- Latest prototype commit `ee7c178a6251f5177540b0956a745b7bf24a6dbd` currently has no reported commit-status checks and no observable associated workflow run, so remote runtime build confirmation remains pending rather than failed.

## Blockers

- No critical implementation blocker.
- End-to-end runtime build confirmation is still pending until the isolated prototype workflow produces an observable result or another build-capable runner is available.
- No preview deployment has been configured yet; this remains intentionally deferred until the core routes and shared navigation are more mature.

## Next task

Begin production-quality shared navigation and archive usability work now that the complete game archive is enabled. Prioritise lightweight server-generated grouping/browsing aids and accessible navigation rather than large client-side filtering bundles. Then begin generated genre and publisher archive routes from the normalized game dataset.

## Completion criteria still outstanding

Shared production-quality navigation; complete home migration; genres; publishers; collections; Zzap!64; retro specials; music; SEO/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
