# Phase 8B Home Hero LCP Correction

## Verdict

**PASS**

Phase 8B removes only the desktop-width restriction from the two existing homepage hero preload tags. The C64 and Amiga images, CSS backgrounds, mode logic, layout and visual assets are unchanged.

## Measured result

| Measurement | Baseline | Candidate |
|---|---:|---:|
| Median C64 hero request start | 3721.7 ms | 192.9 ms |
| Median observed browser LCP | 4904 ms | 4712 ms |
| Median Lighthouse LCP | 18939.77 ms | 19927.01 ms |

## Validation

- `candidate_has_two_mode_safe_hero_preloads`: **PASS**
- `c64_request_starts_earlier`: **PASS**
- `c64_request_starts_within_500ms`: **PASS**
- `c64_mode_preserved`: **PASS**
- `amiga_mode_preserved`: **PASS**
- `hero_geometry_preserved`: **PASS**
- `hero_computed_styles_preserved`: **PASS**
- `lighthouse_lcp_not_regressed`: **PASS**

## Public change

- `home.html`: remove `media="(min-width: 1024px)"` from the existing C64 and Amiga hero image preloads.
- No CSS, JavaScript, image, route, game record or intro-loader change.

## Safety

- The homepage hero dimensions and computed background styles match the baseline after normalising only the localhost measurement origin.
- Saved C64 and Amiga modes remain intact.
- Full browser screenshots and Lighthouse JSON files are retained as workflow artifacts.
