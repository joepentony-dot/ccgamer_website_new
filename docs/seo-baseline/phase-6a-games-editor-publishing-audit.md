# Phase 6A Games Editor Publishing Audit

## Verdict

**Current publishing readiness: NOT READY**

The audit used a synthetic 652nd game only inside a disposable Git worktree. The real `games/games.json` and protected homepage files were not changed.

## Current database

- Existing game records: **651**
- Synthetic sandbox records: **652**
- Existing browser package regression test: **PASS**
- Synthetic output checks passed: **14 / 18**

## Editor source inspection

- Expected game-entry fields mapped: **Yes**
- Duplicate slug validation: **Present**
- Duplicate ID validation: **Present**
- Canonical wrapper included in package: **Yes**
- Legacy redirect included in package: **Yes**
- Search and index output included: **Yes**
- Browser rebuild button exists: **Yes**
- Matching rebuild API endpoint exists: **No**
- Local save mode: **client-download**

## Generator command results

| Command | Result |
|---|---|
| `node scripts/build-games.js` | FAIL |
| `node scripts/generate-publisher-pages.js` | PASS |
| `node scripts/generate-developer-pages.js` | PASS |
| `node scripts/generate-composer-pages.js` | PASS |
| `node scripts/generate-year-platform-pages.js` | FAIL |
| `node scripts/integrate-year-platform-discovery.js` | FAIL |
| `node scripts/generate-downloads-page.js` | PASS |
| `node scripts/update-downloads-static-pages.js` | PASS |
| `node scripts/generate-sitemaps.js` | PASS |
| `node scripts/validate-sitemaps.js` | PASS |
| `node scripts/validate-year-platform-discovery.js` | FAIL |

## Synthetic game output results

| Check | Result |
|---|---|
| games json count incremented | PASS |
| synthetic record once | PASS |
| games index once | PASS |
| games search once | PASS |
| canonical wrapper created | PASS |
| canonical wrapper owns url | PASS |
| canonical wrapper has videogame schema | FAIL |
| canonical wrapper has breadcrumb schema | FAIL |
| legacy redirect created | PASS |
| legacy redirect noindex | PASS |
| legacy redirect targets canonical | PASS |
| publisher archive linked | PASS |
| developer archive linked | PASS |
| composer archive linked | PASS |
| year archive linked | FAIL |
| c64 archive linked | FAIL |
| downloads archive linked | PASS |
| sitemap canonical once | PASS |

## Rebuild coverage

`scripts/rebuild-games.js` currently calls:

`build-games.js`, `generate-publisher-pages.js`, `generate-downloads-page.js`, `update-downloads-static-pages.js`, `generate-retro-pages.js`, `generate-sitemaps.js`, `verify-seo.mjs`

Expected publishing generators missing from that runner: `generate-developer-pages.js`, `generate-composer-pages.js`, `generate-year-platform-pages.js`, `integrate-year-platform-discovery.js`.

## Fixed-total safeguards

- Phase 4D fixed game total of 651: **Present**
- Phase 4D fixed C64 total of 552: **Present**
- Phase 4D fixed Amiga total of 99: **Present**
- Phase 4D fixed represented-year total of 15: **Present**

## Blocking findings

- Synthetic publishing output is incomplete: canonical_wrapper_has_videogame_schema, canonical_wrapper_has_breadcrumb_schema, year_archive_linked, c64_archive_linked.
- The editor exposes a Rebuild Everything button, but the local admin API does not implement `/admin/api/rebuild-games`.
- The documented rebuild runner does not call every archive generator: generate-developer-pages.js, generate-composer-pages.js, generate-year-platform-pages.js, integrate-year-platform-discovery.js.
- Permanent validators still contain fixed 651/552/99/15 totals, so a legitimate new game can fail CI.
- Editor documentation and save implementations describe different deployment modes and need one authoritative workflow.
- One or more real publishing commands fail with the synthetic record: node scripts/build-games.js, node scripts/generate-year-platform-pages.js, node scripts/integrate-year-platform-discovery.js, node scripts/validate-year-platform-discovery.js.

## Recommended Phase 6B correction order

1. Replace fixed database totals with data-derived expectations while retaining minimum baseline and uniqueness safeguards.
2. Establish one authoritative game publishing command that regenerates game wrappers, search/index data, publishers, developers, composers, years, platforms, downloads and sitemaps in a deterministic order.
3. Implement the browser rebuild endpoint for the supported deployment environment, or remove/rename the button so it cannot imply a function that is unavailable.
4. Reconcile package download, local browser download and Supabase/GitHub save modes into one documented publishing workflow.
5. Add a permanent synthetic-game transaction test that creates, validates and removes a temporary record without committing it.
6. Retest a real new-game addition through a draft pull request before declaring the editor production-ready.

## Safety

- No synthetic game was committed.
- No public HTML, CSS, JavaScript or game data was changed by this audit.
- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and the real `games/games.json` retained their original hashes.
