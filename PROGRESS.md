# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **58%**

Current milestone: **Retro Events collection preserved as a source-backed gateway without duplicating Amiga Demo Music records**

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
- Added `/games/collections/retro-events/` as a lightweight gateway driven directly from the existing `games/collections/retro-events.json` source.
- Retro Events now preserves the 17 source records not marked `demo_music`, including original titles, YouTube URLs, membership flags, ordering and optional Play Expo badges.
- Explicitly excludes the 10 `demo_music` records embedded in `retro-events.json` so the Retro Events and Amiga Demo Music areas do not duplicate archive ownership.
- Added duplicate-URL protection for source-backed Retro Events entries.
- Generalized collection-index labels so non-game gateway collections can report their source-backed entry type accurately.
- Added Collections to the shared primary navigation.
- Extended isolated CI route checks to cover publisher index and all six migrated collection routes, including Retro Events.
- Added skip-to-content support, semantic navigation, visible keyboard focus treatment and reduced-motion handling.

## Validation

- Branch isolation remains intact; no merge or write to `main` was performed.
- Canonical `games/games.json`, `games/collections/retro-events.json` and production pages remain unchanged and are only read by the prototype.
- The existing Retro Events JSON contains 27 records: 17 event/feature records plus 10 records explicitly marked `type: "demo_music"`; only the 17 non-demo-music records are surfaced by the Retro Events prototype gateway.
- Retro Events entries are read at Eleventy build time from the repository source, sorted by their existing `order` field and rejected if duplicate URLs are detected.
- Updated `collectionArchive.js` passed local `node --check` syntax validation.
- The new Retro Events Nunjucks page passed static front-matter/permalink checks.
- The isolated GitHub Actions workflow now verifies `_site/games/collections/retro-events/index.html` in addition to the existing representative routes.
- Remote Eleventy validation for commit `1302f5698de0e36558dbed1afac60b972d8dafc1` started successfully and was still in progress at the latest check.
- A full local checkout/build remains unavailable in the execution container because outbound DNS access to GitHub is blocked; remote CI remains the end-to-end build confirmation.

## Blockers

- No critical implementation blocker.
- Remote CI for the newest Retro Events route is currently pending completion rather than failed.
- No isolated preview deployment has been configured yet; this remains deferred until more principal content sections are migrated.

## Next task

Inspect the existing Retro Specials collection and any repository-backed data or generated page inputs, then migrate only explicit source-backed entries and established URLs without inventing membership or duplicating detail-page ownership.

## Completion criteria still outstanding

Complete home migration; Retro Specials and remaining collection/hub compatibility; Zzap!64; dedicated music detail/archive migration; SEO metadata/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
