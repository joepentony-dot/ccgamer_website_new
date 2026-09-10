# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **46%**

Current milestone: **BPjS and BPjM Indexed Games collection route implemented from repository-backed fallback membership**

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
- Added `/games/collections/licensed-games/` using the 24 game entries present in the existing Licensed Games fallback markup; licensed status was not inferred from titles, publishers or external knowledge.
- Added `/games/collections/bpjs-indexed-games/` using the 24 game entries present in the existing BPjS/BPjM collection fallback markup; no BPjS/BPjM membership was inferred beyond those entries.
- Added Collections to the shared primary navigation.
- Extended isolated CI route checks to cover publisher index and all three migrated game collections.
- Added skip-to-content support, semantic navigation, visible keyboard focus treatment and reduced-motion handling.

## Validation

- Branch isolation remains intact; no merge or write to `main` was performed.
- Canonical `games/games.json` remains unchanged and is only read by the prototype adapter.
- The BPjS/BPjM membership was taken directly from the existing repository page fallback grid, which exposes 24 concrete game links from 1942 through Joe Blade.
- The collection adapter resolves all three migrated collection memberships against normalized canonical game slugs and throws a build error if any referenced game is missing.
- The isolated GitHub Actions workflow now verifies `_site/games/collections/bpjs-indexed-games/index.html` in addition to the existing representative routes.
- End-to-end remote build confirmation for this checkpoint is pending until the branch workflow reports the new commit.

## Blockers

- No critical implementation blocker.
- No isolated preview deployment has been configured yet; this remains deferred until more principal content sections are migrated.

## Next task

Inspect the existing Top Picks collection source and migrate its membership only if concrete repository-backed entries can be mapped safely to normalized game slugs. Do not infer editorial picks or rankings from ratings or external knowledge.

## Completion criteria still outstanding

Complete home migration; remaining collections; Zzap!64; retro specials; music; SEO metadata/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
