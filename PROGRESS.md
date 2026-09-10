# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **42%**

Current milestone: **Licensed Games collection route implemented from repository-backed fallback membership**

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
- Added Collections to the shared primary navigation.
- Extended isolated CI route checks to cover publisher index, collections index, Cartridge Games and Licensed Games.
- Added skip-to-content support, semantic navigation, visible keyboard focus treatment and reduced-motion handling.

## Validation

- Branch isolation remains intact; no merge or write to `main` was performed.
- Canonical `games/games.json` remains unchanged and is only read by the prototype adapter.
- The Licensed Games membership was taken directly from the existing repository page fallback markup, which exposes 24 concrete game links from Action Biker through Dan Dare III - The Escape.
- The collection adapter resolves both migrated collection memberships against normalized canonical game slugs and throws a build error if any referenced game is missing.
- `node --check` passes locally for the updated `collectionArchive.js` candidate.
- Only Cartridge Games and Licensed Games are marked migrated at this checkpoint; the remaining five collection identities stay explicitly pending rather than receiving invented membership.
- The isolated GitHub Actions workflow now verifies `_site/games/collections/licensed-games/index.html` in addition to the existing representative routes.
- End-to-end remote build confirmation for this checkpoint is pending until the branch workflow reports the new commit.

## Blockers

- No critical implementation blocker.
- No isolated preview deployment has been configured yet; this remains deferred until more principal content sections are migrated.

## Next task

Inspect the existing BPjS and BPjM Indexed Games collection source and determine whether its membership can be generated safely from explicit repository data. Prefer an existing canonical collection field if it has a stable documented mapping; otherwise use only concrete fallback membership from the existing collection page. Do not infer membership.

## Completion criteria still outstanding

Complete home migration; remaining collections; Zzap!64; retro specials; music; SEO metadata/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
