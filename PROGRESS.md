# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **5%**

Current milestone: **Initial isolated Eleventy scaffold**

## Completed

- Created dedicated branch `codex/eleventy-ccg-prototype` from the current `main` head.
- Kept prototype files isolated under `prototype-eleventy/` so production files remain untouched.
- Added Eleventy package manifest and configuration.
- Added a shared Nunjucks base layout.
- Added a lightweight prototype stylesheet with responsive mobile behavior.
- Added a static prototype home page.
- Added a valid `/games/` placeholder route so navigation is not broken before data integration.
- Added prototype README with safety boundary and local build commands.

## Validation

- Branch isolation verified before writing changes.
- Existing `main` files were not updated, deleted, renamed, or merged.
- Prototype navigation targets currently resolve within the scaffold (`/` and `/games/`).
- Eleventy configuration and templates were reviewed for syntax/structure consistency.
- Full `npm install && npm run build` has **not yet been executed in a runner**, so runtime build validation remains pending.

## Blockers

- No critical blocker.
- A build-capable runner or preview workflow is still required for end-to-end Eleventy validation.

## Next task

Integrate a small read-only slice of the existing CCG game data into the prototype, generate the Games index from data, and establish one generated individual game page while preserving existing source data unchanged.

## Completion criteria still outstanding

Shared production-quality navigation; complete home migration; generated game pages; genres; publishers; collections; Zzap!64; retro specials; music; SEO/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
