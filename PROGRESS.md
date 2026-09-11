# CCG Eleventy Prototype Progress

## Status

Overall completion estimate: **86%**

Current milestone: **Primary archive-hub structured-data ownership has been reviewed against the existing site and preserved only where repository-backed semantics already exist. Remote Eleventy validation is green.**

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
- Existing skip-to-content support, semantic navigation, visible keyboard focus treatment and reduced-motion handling remain in place.

## Validation

- Branch isolation remains intact; no merge, push or write to `main` was performed.
- Canonical production data/pages, live redirect configuration and deployment settings remain unchanged.
- Local static validation passed for the new `hubSchemas.js` module and workflow YAML before the implementation commit.
- Implementation commit `53d54c72f911f9d1a01969492819841e6a4f3596` (`prototype: preserve archive hub structured data`) passed GitHub Actions run `34594019621` end to end.
- Remote validation passed: dependency install, Eleventy build, generated-route checks, shared SEO checks, individual game schema checks, archive-hub schema checks, XML sitemap checks and all seven proven legacy redirect assertions.
- The new CI assertions successfully parsed the Games, Publishers, Collections and Zzap!64 JSON-LD payloads and verified the publisher/collection ItemLists are internally consistent.
- A full local checkout/build is still unavailable in this connector execution environment, so GitHub Actions remains the end-to-end build authority.

## Blockers

- No critical implementation blocker.
- No isolated browseable preview deployment has been configured yet; this remains deferred until responsive/accessibility, performance and regression work is stable.
- Redirect compatibility continues to cover only aliases explicitly evidenced by repository data; broader redirect rules will not be invented.

## Next task

Perform the dedicated responsive/mobile usability and accessibility review across the shared shell and representative homepage, games index, game detail, genre, publisher, collection, Zzap!64 and Amiga Demo Music outputs. Make only bounded fixes supported by the current prototype, extend regression assertions where practical, and preserve the lightweight static-first approach.

## Completion criteria still outstanding

- Complete home migration/content parity review.
- Dedicated responsive/mobile usability review.
- Dedicated accessibility review.
- Image/performance optimisation pass.
- Broader regression testing.
- Configure a browseable isolated preview deployment that cannot replace `www.cheekycommodoregamer.co.uk`.
