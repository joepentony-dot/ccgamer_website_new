# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **14%**

Current milestone: **Hardened read-only game pipeline and reusable card component**

## Completed

- Created dedicated branch `codex/eleventy-ccg-prototype` from the current `main` head.
- Kept prototype files isolated under `prototype-eleventy/` so production files remain untouched.
- Added Eleventy package manifest and configuration.
- Added a shared Nunjucks base layout.
- Added a lightweight responsive prototype stylesheet.
- Added a static prototype home page.
- Replaced the Games placeholder with a build-time generated Games index.
- Added a read-only Eleventy data adapter that reads the canonical `games/games.json` without modifying it.
- Limited the first integration pass to a deterministic 12-game slice while templates and URL behaviour are validated.
- Added pagination-driven individual game pages at `/games/<slug>/`.
- Added existing thumbnail passthrough support so generated cards/details can reuse canonical CCG artwork without copying or altering source images.
- Added responsive game-card and game-detail styling.
- Added an isolated GitHub Actions workflow intended to run `npm install`, build the prototype, and verify representative generated routes.
- Corrected the canonical game-data relative path during validation review before checkpointing the initial integration milestone.
- Added prototype README with safety boundary and local build commands.
- Added reusable `_includes/components/game-card.njk` so game-list presentation is no longer duplicated in the Games index.
- Hardened game metadata normalization with trimmed text values, array/single-value normalization for genres and publishers, numeric rating validation, thumbnail path normalization, system labels, and safe description fallbacks.
- Updated the Games index to render through the reusable game-card include.

## Validation

- Branch isolation verified; all writes remain on `codex/eleventy-ccg-prototype`.
- Existing production files on `main` were not updated, deleted, renamed, or merged.
- Canonical `games/games.json` remains read-only and unchanged.
- The data adapter resolves from `prototype-eleventy/src/_data/` back to repository-root `games/games.json` using `../../../games/games.json`.
- Generated permalink pattern preserves a simple `/games/<slug>/` route shape for the prototype.
- Metadata normalization now tolerates missing/blank strings, publisher data represented as either arrays or single values, missing descriptions, invalid/empty ratings, and thumbnails with a leading slash.
- Reusable card include only consumes normalized fields from the adapter, reducing template coupling to the canonical JSON shape.
- Existing thumbnail URLs remain source-backed and no canonical artwork was copied or altered.
- A workflow-run lookup for the latest prototype commit returned no associated run yet, so completed remote build confirmation remains pending rather than failed.

## Blockers

- No critical implementation blocker.
- End-to-end runtime build confirmation is still pending until the isolated prototype workflow produces an observable result or another build-capable runner is available.
- No preview deployment has been configured yet; this remains intentionally deferred until the core routes are stable.

## Next task

Validate the hardened pipeline against a broader sample of canonical game records and inspect edge cases in the full database shape. If the normalized fields remain safe, widen the generated Games archive beyond the 12-record validation slice while retaining build-time generation and stable `/games/<slug>/` URLs.

## Completion criteria still outstanding

Shared production-quality navigation; complete home migration; complete generated game archive; genres; publishers; collections; Zzap!64; retro specials; music; SEO/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
