# Phase 7D CSS and JavaScript Delivery

## Verdict

**PASS — bounded delivery corrections are ready for review.**

Phase 7D changes delivery attributes and removes only exact duplicate stylesheet tags. It does not combine CSS files, reorder stylesheets, change the Omega presentation or defer admin input-protection scripts.

## Repository-wide improvements

| Finding | Before | After | Change |
|---|---:|---:|---:|
| Head scripts without `defer` or `async` | 2,319 | 646 | 1,673 removed |
| Duplicate stylesheet references | 5 | 1 | 4 removed |
| Pages with at least 10 stylesheets | 962 | 962 | 0 |
| Pages with at least 12 scripts | 556 | 556 | 0 |

- Eligible blocking analytics references: **1,673 → 0**
- Eligible deferred analytics references after correction: **1,712**
- Exact duplicate stylesheet tags remaining in eligible files: **0**
- Validation checks passed: **11 / 11**

## Delivery policy

- The local `/js/analytics.js` loader now uses `defer` in eligible HTML and generator-owned markup.
- The loader itself still creates the remote Google Analytics script asynchronously.
- Existing script order is retained; no unrelated script receives `defer` or `async`.
- Only byte-identical duplicate stylesheet tags are removed. Same-URL links with different attributes are retained for review.
- `index.html` and `home.html` remain protected and are not rewritten by this phase.

## Browser validation

| Route | HTTP | Analytics tags | Non-blocking | Duplicate stylesheet hrefs | Serious/critical axe nodes |
|---|---:|---:|---|---:|---:|
| 404 page | 200 | 1 | Yes | 0 | 0 |
| About | 200 | 1 | Yes | 0 | 0 |
| Games | 200 | 1 | Yes | 0 | 0 |
| Game: Zeewolf | 200 | 1 | Yes | 0 | 0 |
| Publisher: Ocean Software | 200 | 1 | Yes | 0 | 0 |
| Year: 1989 | 200 | 1 | Yes | 0 | 0 |
| Quiz | 200 | 0 | Yes | 0 | 0 |
| Login | 200 | 1 | Yes | 0 | 0 |

## Remaining duplicate stylesheet references

- `home.html`: /resources/css/ccg-mode.css

Any remaining item is either in a protected/excluded file or uses the same URL with differing attributes and therefore was not removed automatically.

## Deliberate limits

- No stylesheet bundles are merged.
- CSS order, media attributes and cascade ownership remain unchanged.
- Admin input-hardening and firewall scripts are not deferred.
- Large asset optimisation remains Phase 7E.
- Redirect-shell architecture remains Phase 7F.

## Safety

- `index.html` unchanged
- `home.html` unchanged
- `resources/css/intro.css` unchanged
- `js/index-intro.js` unchanged
- `games/games.json` unchanged
- no route, game record, thumbnail, CSS file or JavaScript runtime file renamed or removed
