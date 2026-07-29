# Final Phase 7 Regression Audit

## Verdict

**PASS WITH WARNINGS**

This is a read-only comparison of current `main` commit `b4c4ea40ac2c028f96b3c7fac1b4a4c21bc96a31` against the original Phase 7A baseline commit `4163b51e62d5b94a21ecb9b47dc6d7eb418fb823`. It repeats the repository-wide static scan, representative axe checks, and the same seven Lighthouse runs, then verifies Phase 7 route, generator, navigation, publisher-logo, sitemap and metadata safeguards.

- Hard regression failures: **0**
- Audit warnings: **10**
- Current live axe violations: **0**
- Current serious/critical axe nodes: **0**
- Median Lighthouse performance: **60 → 68**
- Median Lighthouse accessibility: **100 → 100**
- Game records: **651**
- Sitemap URLs discovered: **938**

## Static scan comparison

| Finding | Phase 7A | Current | Change |
|---|---:|---:|---:|
| Missing document language | 1 | 0 | -1 |
| Missing viewport meta | 654 | 654 | +0 |
| Missing main landmark | 633 | 632 | -1 |
| Missing H1 | 2 | 1 | -1 |
| Missing skip link | 921 | 919 | -2 |
| Images missing alt attribute | 1 | 0 | -1 |
| Images missing intrinsic dimensions | 29,493 | 27,400 | -2,093 |
| Form controls missing a label | 8 | 0 | -8 |
| Iframes missing a title | 1 | 0 | -1 |
| Iframes not lazy loaded | 23 | 22 | -1 |
| Duplicate IDs | 3 | 1 | -2 |
| Head scripts without defer or async | 2,319 | 646 | -1,673 |
| Duplicate stylesheet references | 5 | 1 | -4 |

## Lighthouse lab comparison

Lab scores vary between runs and do not replace Search Console or CrUX field data.

| Route | Mode | Perf A | Perf now | LCP A (s) | LCP now (s) | CLS A | CLS now | KiB A | KiB now |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Game: Zeewolf | mobile | 58 | 53 | 16.2 | 14.1 | 0.000 | 0.032 | 11,120 | 4,325 |
| Games | desktop | 75 | 81 | 1.5 | 1.1 | 0.306 | 0.342 | 769 | 768 |
| Games | mobile | 60 | 84 | 7.6 | 3.1 | 0.000 | 0.107 | 768 | 768 |
| Genres | mobile | 58 | 54 | 14.0 | 10.5 | 0.000 | 0.292 | 2,867 | 2,768 |
| Home | desktop | 86 | 86 | 1.3 | 0.9 | 0.212 | 0.258 | 1,306 | 1,061 |
| Home | mobile | 58 | 56 | 9.1 | 13.2 | 0.000 | 0.073 | 3,221 | 2,310 |
| Quiz | mobile | 75 | 68 | 4.9 | 4.3 | 0.000 | 0.093 | 295 | 394 |

## Phase 7 integrity checks

| Check | Result |
|---|---|
| `game_count_651` | PASS |
| `powerdrome_absent` | PASS |
| `genre_shortcut_present` | PASS |
| `visible_platform_shortcut_absent` | PASS |
| `publisher_index_logo_present` | PASS |
| `activision_page_logo_present` | PASS |
| `rebuild_completed` | PASS |
| `rebuild_deterministic` | PASS |
| `publisher_validator_passed` | PASS |
| `year_platform_validator_passed` | PASS |
| `redirect_missing_targets_zero` | PASS |
| `redirect_external_targets_zero` | PASS |
| `redirect_chains_zero` | PASS |
| `redirect_target_mismatches_zero` | PASS |
| `redirect_canonical_mismatches_zero` | PASS |
| `redirect_delays_zero` | PASS |
| `representative_pages_exist` | PASS |
| `representative_canonicals_match` | PASS |
| `core_detail_schema_present` | PASS |
| `representative_sitemap_coverage` | PASS |
| `representative_assets_resolve` | PASS |
| `sitemaps_parse` | PASS |

## Representative metadata and sitemap checks

| Page | Exists | Canonical | JSON-LD blocks | In sitemap |
|---|---|---|---:|---|
| Games | Yes | Yes | 0 | Yes |
| Zeewolf | Yes | Yes | 1 | Yes |
| Genres | Yes | Yes | 0 | Yes |
| Publishers | Yes | Yes | 1 | Yes |
| Activision | Yes | Yes | 1 | Yes |
| Quiz | Yes | Yes | 0 | Yes |

Archive and utility pages without JSON-LD are recorded as remaining metadata opportunities rather than regressions. Detail pages covered by earlier structured-data work remain mandatory.

## Generator repeatability

- Completed: **True**
- Deterministic across two rebuilds: **True**
- First rebuild changed repository paths: **0**
- Publisher-logo validator: **PASS**
- Year/platform validator: **PASS**
- Temporary generator changes were discarded after validation.

## Redirect-route integrity

- Redirect pages: **726**
- Missing targets: **0**
- External targets: **0**
- Redirect chains: **0**
- Target mismatches: **0**
- Canonical mismatches: **0**
- Delayed refreshes: **0**

## Hard failures

- None

## Warnings and remaining opportunities

- Representative archive or utility pages without JSON-LD: Games, Genres, Quiz.
- Game: Zeewolf mobile lab LCP was 14.1s, above the 2.5s reference.
- Games desktop lab CLS was 0.342, above the 0.1 reference.
- Games mobile lab LCP was 3.1s, above the 2.5s reference.
- Games mobile lab CLS was 0.107, above the 0.1 reference.
- Genres mobile lab LCP was 10.5s, above the 2.5s reference.
- Genres mobile lab CLS was 0.292, above the 0.1 reference.
- Home desktop lab CLS was 0.258, above the 0.1 reference.
- Home mobile lab LCP was 13.2s, above the 2.5s reference.
- Quiz mobile lab LCP was 4.3s, above the 2.5s reference.

## Historical workflow noise

The following recent failed or cancelled `main` runs belong to older commit SHAs and are listed separately from this audit's own result:

- `Refresh Publisher Archives` — failure on `ca96984989c8` (2026-07-29T18:08:52Z)
- `Reliable Games Publishing` — failure on `ca96984989c8` (2026-07-29T18:08:52Z)
- `Phase 4D Permanent Year and Platform Validation` — failure on `ca96984989c8` (2026-07-29T18:08:52Z)
- `Refresh Developer Archives` — failure on `ca96984989c8` (2026-07-29T18:08:48Z)
- `Refresh Publisher Archives` — failure on `93b8c29c3bdd` (2026-07-29T17:19:10Z)
- `Refresh Developer Archives` — failure on `93b8c29c3bdd` (2026-07-29T17:19:10Z)
- `Phase 4D Permanent Year and Platform Validation` — failure on `93b8c29c3bdd` (2026-07-29T17:19:09Z)
- `Reliable Games Publishing` — failure on `93b8c29c3bdd` (2026-07-29T17:19:09Z)
- `Refresh Publisher Archives` — failure on `45951c982651` (2026-07-29T16:28:33Z)
- `Refresh Developer Archives` — failure on `45951c982651` (2026-07-29T16:28:32Z)

## Safety

- No public HTML, CSS, JavaScript, image, game record, route or sitemap is changed by this audit.
- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and `games/games.json` are hash-protected.
- The authoritative game rebuild is run twice only in the temporary workflow worktree; all generated changes are discarded.
- Detailed static, live, Lighthouse, redirect, generator and comparison evidence is uploaded as a workflow artifact.
