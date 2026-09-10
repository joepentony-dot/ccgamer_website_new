# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **10%**

Current milestone: **Read-only game data integration and generated game pages**

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
- Corrected the canonical game-data relative path during validation review before checkpointing this milestone.
- Added prototype README with safety boundary and local build commands.

## Validation

- Branch isolation verified; all writes remain on `codex/eleventy-ccg-prototype`.
- Existing production files on `main` were not updated, deleted, renamed, or merged.
- Canonical `games/games.json` remains read-only and unchanged.
- The data adapter path now resolves from `prototype-eleventy/src/_data/` back to repository-root `games/games.json` using `../../../games/games.json`.
- Generated permalink pattern preserves a simple `/games/<slug>/` route shape for the prototype.
- Representative source records (`20-tons`, `720-degrees`) contain the fields required by the new templates.
- Existing thumbnail URLs are retained and the matching source thumbnail directory is configured as passthrough content.
- Template/CSS/config structure reviewed after the data-path correction.
- A dedicated build-validation workflow now exists on the prototype branch, but a completed remote workflow result has not yet been observed through the available connector.
- A local clone/build attempt from the automation container could not run because that environment cannot resolve github.com; this is an environment/network limitation rather than an Eleventy build failure.

## Blockers

- No critical implementation blocker.
- End-to-end runtime build confirmation is still pending until the prototype GitHub Actions workflow produces an observable result or another build-capable runner is available.
- No preview deployment has been configured yet; this remains intentionally deferred until the core routes are stable.

## Next task

Harden the generated-game pipeline before widening it: add reusable game-card include(s), improve metadata normalization/fallback handling, then expand from the 12-record validation slice toward the complete games archive once build validation is confirmed.

## Completion criteria still outstanding

Shared production-quality navigation; complete home migration; complete generated game archive; genres; publishers; collections; Zzap!64; retro specials; music; SEO/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
