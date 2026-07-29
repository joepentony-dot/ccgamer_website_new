# Final Phase 7 Regression Audit

## Verdict

**FAIL**

This is a read-only comparison of current `main` commit `063fe313807b2bad624485e0dad93b011c872d18` against the original Phase 7A baseline commit `4163b51e62d5b94a21ecb9b47dc6d7eb418fb823`. It repeats the repository-wide static scan, representative axe checks, and the same seven Lighthouse runs, then verifies Phase 7 route, generator, navigation, publisher-logo, sitemap and metadata safeguards.

- Hard regression failures: **1**
- Audit warnings: **0**
- Current live axe violations: **0**
- Current serious/critical axe nodes: **0**
- Median Lighthouse performance: **60 → 74**
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
| Game: Zeewolf | mobile | 58 | 47 | 16.2 | 14.1 | 0.000 | 0.032 | 11,120 | 4,325 |
| Games | desktop | 75 | 80 | 1.5 | 1.3 | 0.306 | 0.343 | 769 | 768 |
| Games | mobile | 60 | 76 | 7.6 | 3.5 | 0.000 | 0.093 | 768 | 768 |
| Genres | mobile | 58 | 52 | 14.0 | 13.6 | 0.000 | 0.264 | 2,867 | 2,867 |
| Home | desktop | 86 | 87 | 1.3 | 0.9 | 0.212 | 0.232 | 1,306 | 1,131 |
| Home | mobile | 58 | 52 | 9.1 | 11.5 | 0.000 | 0.155 | 3,221 | 3,035 |
| Quiz | mobile | 75 | 74 | 4.9 | 5.0 | 0.000 | 0.104 | 295 | 394 |

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
| `representative_schema_present` | FAIL |
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

## Generator repeatability

- Completed: **True**
- Deterministic across two rebuilds: **True**
- First rebuild changed paths in the temporary worktree: **12779**
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

- `representative_schema_present`

## Warnings

- None

## Historical workflow noise

The following recent failed or cancelled `main` runs, when returned, belong to older commit SHAs and are listed separately from this audit's own result:

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
