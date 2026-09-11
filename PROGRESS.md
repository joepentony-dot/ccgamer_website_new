# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **54%**

Current milestone: **Amiga Demo Music collection preserved as a lightweight gateway to the existing music archive**

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
- Added `/games/collections/amiga-demo-music/` as a lightweight gateway preserving the ten explicit links in the existing collection fallback markup. The entries continue to point at their established `/amiga-demo-music/.../` URLs so the later dedicated Music migration remains the single owner of music detail pages.
- Generalized collection-index counts so game collections and non-game gateway collections can describe their source-backed entries accurately.
- Added Collections to the shared primary navigation.
- Extended isolated CI route checks to cover publisher index and all five migrated collection routes.
- Added skip-to-content support, semantic navigation, visible keyboard focus treatment and reduced-motion handling.

## Validation

- Branch isolation remains intact; no merge or write to `main` was performed.
- Canonical `games/games.json` remains unchanged and is only read by the prototype adapter.
- The existing Amiga Demo Music collection fallback exposes exactly ten concrete links into `/amiga-demo-music/`, from `9 Fingers - Spaceballs` through `State of the Art`; those URLs and visible titles were preserved rather than re-derived.
- The dedicated Amiga Demo Music prototype page does not generate or duplicate music detail pages; it is only a collection gateway.
- Existing game-backed collection membership still resolves against normalized canonical game slugs and throws a build error if a referenced game is missing.
- Updated `collectionArchive.js` passed local `node --check` syntax validation before the commit was prepared.
- The isolated GitHub Actions workflow now verifies `_site/games/collections/amiga-demo-music/index.html` in addition to the existing representative routes.
- A full local checkout/build remains unavailable in the execution container because outbound DNS access to GitHub is blocked; remote CI is used for end-to-end build confirmation.

## Blockers

- No critical implementation blocker.
- No isolated preview deployment has been configured yet; this remains deferred until more principal content sections are migrated.

## Next task

Inspect the existing Retro Events collection and its repository-backed JSON/page structure, then migrate only the event routes and metadata that can be represented without inventing content or changing established URLs.

## Completion criteria still outstanding

Complete home migration; remaining collection/hub compatibility; Zzap!64; retro specials; music detail/archive migration; SEO metadata/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
