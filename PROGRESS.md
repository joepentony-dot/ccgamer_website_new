# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **66%**

Current milestone: **Zzap!64 hub/index added as a source-backed static gateway while established `/retro-specials/.../` pages retain detail ownership**

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
- Retro Events preserves the 17 source records not marked `demo_music`, including original titles, YouTube URLs, membership flags, ordering and optional Play Expo badges.
- Explicitly excludes the 10 `demo_music` records embedded in `retro-events.json` so the Retro Events and Amiga Demo Music areas do not duplicate archive ownership.
- Added `/games/collections/retro-specials/` as a lightweight gateway preserving the 20 explicit feature links exposed by the existing Retro Specials collection page.
- Retro Specials preserves the established `/retro-specials/.../` URLs, titles, concise source descriptions and existing members-only markers; it does not create duplicate feature detail pages.
- Added duplicate-URL protection for source-backed Retro Events and Retro Specials entries.
- Added `/zzap64/` as a lightweight Zzap!64 hub derived from the existing Retro Specials gateway data. It currently indexes the five source-backed Zzap!64 feature routes whose established URLs begin `/retro-specials/zzap64-` and does not duplicate those detail pages.
- Added fail-fast validation requiring the Zzap!64 hub to contain source-backed entries and rejecting duplicate Zzap!64 URLs.
- Added Zzap!64 to the shared primary navigation.
- Generalized collection-index labels so non-game gateway collections can report their source-backed entry type accurately.
- Added Collections to the shared primary navigation.
- Extended isolated CI route checks to cover publisher index, all seven migrated collection routes and the new `/zzap64/` hub.
- Added skip-to-content support, semantic navigation, visible keyboard focus treatment and reduced-motion handling.

## Validation

- Branch isolation remains intact; no merge or write to `main` was performed.
- Canonical `games/games.json`, `games/collections/retro-events.json`, existing Retro Specials pages and production pages remain unchanged and are only read/referenced by the prototype.
- The Zzap!64 data adapter derives its entries from the already source-backed Retro Specials adapter instead of introducing a second manual copy of the feature metadata.
- The current Zzap!64 filter resolves five established feature routes: the 1985, 1986, 1987 and 1988 award retrospectives plus the 20 lowest-scoring C64 games feature.
- Zzap!64 detail ownership remains with the existing `/retro-specials/.../` routes; the new `/zzap64/` page is index-only.
- The shared navigation now exposes the static Zzap!64 hub directly.
- The isolated GitHub Actions workflow now requires `_site/zzap64/index.html` alongside the established representative prototype routes.
- Zzap!64 implementation commit: `28654d64d4aa08448f915891114d1a8986a99d12` (`prototype: add source-backed Zzap64 hub`).
- The previously pending Retro Specials implementation commit `4147711d92b99656f2487819fef1eb9376f4d4ff` is now confirmed by GitHub Actions run `34558441623` as completed successfully.
- A new remote GitHub Actions run for the Zzap!64 implementation commit has not yet surfaced through the branch run listing, so its end-to-end validation remains pending rather than assumed successful.
- A full local checkout/build remains unavailable in this connector-only execution environment; remote CI remains the end-to-end build authority when the new run becomes observable.

## Blockers

- No critical implementation blocker.
- Remote end-to-end validation for the new Zzap!64 implementation commit is pending visibility.
- No isolated preview deployment has been configured yet; this remains deferred until more principal content sections are migrated.

## Next task

Inspect and migrate the dedicated Amiga Demo Music archive/index layer using the existing repository-backed music records and established `/amiga-demo-music/.../` URLs, while keeping the already-built collection gateway as navigation only and avoiding duplicate ownership.

## Completion criteria still outstanding

Complete home migration; dedicated music detail/archive migration; SEO metadata/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
