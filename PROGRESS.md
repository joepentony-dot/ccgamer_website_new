# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **89%**

Current milestone: **Dedicated responsive/mobile usability and accessibility review completed across the shared shell and representative generated routes. Remote Eleventy validation is green.**

## Completed

- Created and retained the dedicated `codex/eleventy-ccg-prototype` branch; `main` and the production deployment remain read-only.
- Kept the rebuild isolated under `prototype-eleventy/` with an Eleventy static-site build, shared Nunjucks layout/includes, shared navigation and responsive CSS.
- Added read-only normalization for canonical `games/games.json`, duplicate-slug protection and full generation of `/games/` plus individual `/games/<slug>/` pages.
- Added generated genre and publisher indexes/detail routes with deterministic, collision-safe slugs.
- Added the seven established collection gateways and migrated source-backed collection membership without changing canonical production data.
- Added source-backed Retro Events, Retro Specials, Zzap!64 and Amiga Demo Music hubs while preserving established detail URLs.
- Migrated all ten Amiga Demo Music detail pages into Eleventy while retaining their source-backed title, description, robots, canonical, social metadata, `VideoObject` and `BreadcrumbList` JSON-LD.
- Added shared canonical/robots/Open Graph/Twitter metadata across the prototype.
- Added a data-driven XML sitemap covering prototype hubs, games, genres, publishers, collections and migrated Amiga Demo Music pages.
- Added a prototype-only `_redirects` manifest for the seven explicit historical collection `.html` aliases already evidenced in repository data.
- Preserved the established individual game structured-data contract: `VideoGame + BreadcrumbList` in a schema.org graph, sourced from canonical game data.
- Corrected the Nunjucks JSON-LD handoff so game schema is emitted as parseable JSON rather than HTML-escaped entities.
- Completed the primary archive-hub schema ownership review against production source:
  - `/games/` preserves the existing `CollectionPage + BreadcrumbList` contract.
  - `/games/publishers/` preserves the existing `CollectionPage + BreadcrumbList + ItemList` contract, with the ItemList generated from the normalized publisher archive instead of a stale hard-coded count.
  - `/games/collections/` preserves the existing `CollectionPage + BreadcrumbList + ItemList` contract, using the prototype canonical trailing-slash collection routes while retaining the proven legacy `.html` aliases through redirects.
  - `/zzap64/` preserves the existing `CollectionPage` contract.
  - Home and `/games/genres/` intentionally receive no invented hub schema because the inspected production sources do not establish equivalent JSON-LD ownership there.
- Added build-time consistency guards for publisher and collection hub schema counts.
- Extended isolated CI with archive-hub JSON-LD parse/ownership assertions and regression checks ensuring Home/Genres remain free of invented hub-schema markers.
- Completed the dedicated responsive/mobile and accessibility shell review:
  - retained the visible skip link, semantic `<main>` target, labelled primary navigation, visible keyboard focus and reduced-motion handling;
  - added `aria-current="page"` to the relevant primary navigation entry on the homepage and principal archive hubs;
  - retained a lightweight label-based navigation on small screens rather than adding a JavaScript-only hamburger dependency;
  - raised primary navigation, brand, archive-jump and button targets to a minimum 44px height;
  - improved small-screen navigation wrapping and width use while keeping all primary destinations visible;
  - hardened long-text and grid-item overflow behaviour to reduce horizontal scrolling risk;
  - tightened small-screen `h1` scaling while retaining fluid typography;
  - added CI regression checks across representative home, archive, game, genre, publisher, collection, Zzap!64 and Amiga Demo Music outputs.

## Validation

- Branch isolation remains intact; no merge, push or write to `main` was performed.
- Canonical production data/pages, live redirect configuration and deployment settings remain unchanged.
- Static pre-write checks confirmed the intended accessibility/mobile invariants before repository changes.
- Navigation accessibility commit `1e8c4f44e6912e60af3786b70d5a4d79ac85fc8b` added current-page semantics only on `codex/eleventy-ccg-prototype`.
- Responsive shell commit `8836e0d137ca07a5e0ae191766883abc2ff0a0f9` added bounded CSS resilience and touch-target improvements only inside the prototype.
- Validation commit `0b05a47f30d9b6192dd4323b659135c1a566552a` extended the isolated Eleventy workflow with responsive/accessibility regression assertions.
- GitHub Actions run `34599055789` passed end to end.
- Remote validation passed: dependency install, Eleventy build, generated-route checks, responsive/accessibility shell checks, shared SEO checks, individual game schema checks, archive-hub schema checks, XML sitemap checks and all seven proven legacy redirect assertions.
- The new accessibility stage verified representative homepage, games index, game detail, genre hub/detail, publisher hub, collections hub, Zzap!64 hub and Amiga Demo Music hub/detail outputs.
- A full local checkout/build is still unavailable in this connector execution environment, so GitHub Actions remains the end-to-end build authority.

## Blockers

- No critical implementation blocker.
- No isolated browseable preview deployment has been configured yet; this remains deferred until the performance and broader regression pass is stable.
- Redirect compatibility continues to cover only aliases explicitly evidenced by repository data; broader redirect rules will not be invented.

## Next task

Perform the image/performance optimisation pass across representative generated pages. Audit image loading/decoding, avoid unnecessary eager media, confirm the static shell remains dependency-light, and add bounded regression checks for performance-sensitive markup without changing canonical source assets or degrading visual/content fidelity.

## Completion criteria still outstanding

- Complete home migration/content parity review.
- Image/performance optimisation pass.
- Broader regression testing.
- Configure a browseable isolated preview deployment that cannot replace `www.cheekycommodoregamer.co.uk`.
