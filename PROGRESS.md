# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **38%**

Current milestone: **Collections index plus source-backed Cartridge Games route implemented**

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
- Added `/games/collections/cartridge-games/` using the 24 game entries present in the existing Cartridge Games fallback markup; no additional collection membership was inferred.
- Added Collections to the shared primary navigation.
- Extended isolated CI route checks to cover publisher index, collections index and Cartridge Games.
- Added skip-to-content support, semantic navigation, visible keyboard focus treatment and reduced-motion handling.

## Validation

- Branch isolation remains intact; no merge or write to `main` was performed.
- Canonical `games/games.json` remains unchanged and is only read by the prototype adapter.
- The collection adapter resolves source-backed cartridge membership against normalized canonical game slugs and throws a build error if a referenced game is missing.
- `node --check` passes for the new `collectionArchive.js` module.
- The Collections index preserves the existing seven collection identities: Cartridge Games, Licensed Games, BPjS and BPjM Indexed Games, Top Picks, Amiga Demo Music, Retro Events and Retro Specials.
- Only Cartridge Games is marked migrated in the prototype at this checkpoint; the other six remain explicitly pending rather than receiving invented memberships.
- The isolated GitHub Actions workflow now verifies `_site/games/collections/index.html` and `_site/games/collections/cartridge-games/index.html` in addition to representative game, genre and publisher routes.
- The newest workflow-triggering commit is `9166fcd3f4fd432d13f387777c042dfbf684a571`. The available workflow-run lookup currently returns no associated run, so end-to-end remote build confirmation for this checkpoint remains pending rather than treated as a successful build.

## Blockers

- No critical implementation blocker.
- End-to-end remote build confirmation for the newest collection checkpoint is not yet observable through the available GitHub workflow lookup.
- No isolated preview deployment has been configured yet; this remains deferred until more principal content sections are migrated.

## Next task

Inspect the existing Licensed Games collection page and migrate its membership only from repository-backed entries. If its static fallback membership resolves cleanly against normalized canonical game slugs, add the `/games/collections/licensed-games/` prototype route and extend CI validation. Do not infer licensed status from game titles, publishers or external knowledge.

## Completion criteria still outstanding

Complete home migration; remaining collections; Zzap!64; retro specials; music; SEO metadata/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
