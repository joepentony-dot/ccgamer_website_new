# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **50%**

Current milestone: **Top Picks collection route implemented from repository-backed fallback membership**

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
- Added `/games/collections/top-picks/` using the 24 game entries present in the existing Top Picks fallback markup; no additional editorial picks or rankings were inferred.
- Added Collections to the shared primary navigation.
- Extended isolated CI route checks to cover publisher index and all four migrated game collections.
- Added skip-to-content support, semantic navigation, visible keyboard focus treatment and reduced-motion handling.

## Validation

- Branch isolation remains intact; no merge or write to `main` was performed.
- Canonical `games/games.json` remains unchanged and is only read by the prototype adapter.
- The Top Picks membership was taken directly from the existing repository page fallback grid, which exposes 24 concrete game links from Ace Of Aces through Commando.
- The collection adapter resolves all four migrated collection memberships against normalized canonical game slugs and throws a build error if any referenced game is missing.
- `collectionArchive.js` passed local `node --check` syntax validation before the commit was prepared.
- The isolated GitHub Actions workflow now verifies `_site/games/collections/top-picks/index.html` in addition to the existing representative routes.
- A full local checkout/build remains unavailable in the execution container because outbound DNS access to GitHub is blocked; remote CI is used for end-to-end build confirmation when surfaced.

## Blockers

- No critical implementation blocker.
- No isolated preview deployment has been configured yet; this remains deferred until more principal content sections are migrated.

## Next task

Inspect the existing Amiga Demo Music collection/hub relationship and migrate only the repository-backed structure that can be represented safely without duplicating or weakening the dedicated music section planned later in the rebuild.

## Completion criteria still outstanding

Complete home migration; remaining collection/hub compatibility; Zzap!64; retro specials; music; SEO metadata/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
