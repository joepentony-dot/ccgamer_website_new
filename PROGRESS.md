# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **62%**

Current milestone: **Retro Specials collection preserved as a source-backed gateway while retaining established `/retro-specials/.../` detail ownership**

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
- Retro Specials preserves the established `/retro-specials/.../` URLs, titles, concise source descriptions and the three entries explicitly marked members-only; it does not create duplicate feature detail pages.
- Added duplicate-URL protection for source-backed Retro Events and Retro Specials entries.
- Generalized collection-index labels so non-game gateway collections can report their source-backed entry type accurately.
- Added Collections to the shared primary navigation.
- Extended isolated CI route checks to cover publisher index and all seven migrated collection routes, including Retro Events and Retro Specials.
- Added skip-to-content support, semantic navigation, visible keyboard focus treatment and reduced-motion handling.

## Validation

- Branch isolation remains intact; no merge or write to `main` was performed.
- Canonical `games/games.json`, `games/collections/retro-events.json`, the existing Retro Specials page and production pages remain unchanged and are only read/referenced by the prototype.
- The existing Retro Specials page exposes 20 explicit `/retro-specials/.../` feature links; these are represented as gateway entries rather than inferred taxonomy.
- Existing members-only markers were retained for `commodore-64-memories-1982`, `retro-games-day-family-gaming` and `zx-spectrum-memories-hodgy`.
- Shared duplicate-URL validation now rejects collisions in both Retro Events and Retro Specials source-backed gateway entries.
- The isolated GitHub Actions workflow now verifies `_site/games/collections/retro-specials/index.html` in addition to the existing representative routes.
- Implementation commit: `4147711d92b99656f2487819fef1eb9376f4d4ff` (`prototype: add Retro Specials gateway`).
- Post-commit repository reads confirm the new Nunjucks route exists on `codex/eleventy-ccg-prototype` with the expected permalink and gateway behavior.
- Remote GitHub Actions status for the new implementation commit has not surfaced through the available run/status lookup yet; this is recorded as pending rather than assumed successful.
- A full local checkout/build remains unavailable in the execution container because outbound DNS access to GitHub is blocked; remote CI remains the end-to-end build authority when the run becomes observable.

## Blockers

- No critical implementation blocker.
- Remote end-to-end validation for the latest Retro Specials commit is pending visibility.
- No isolated preview deployment has been configured yet; this remains deferred until more principal content sections are migrated.

## Next task

Inspect the existing Zzap!64 hub, data sources and URL structure, then migrate the hub/index layer first using only repository-backed content while avoiding duplication with Retro Specials feature routes.

## Completion criteria still outstanding

Complete home migration; Zzap!64; dedicated music detail/archive migration; SEO metadata/structured data/sitemaps/redirect compatibility; accessibility review; image/performance work; regression testing; and an isolated browseable preview deployment.
