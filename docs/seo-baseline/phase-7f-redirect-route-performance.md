# Phase 7F Redirect-Route Performance Review

## Verdict

**PASS — redirect-route delivery is ready for review.**

Phase 7F removes the analytics request from verified `noindex` redirect shells while retaining their targets, canonical metadata and query/hash forwarding.

## Results

| Finding | Before | After |
|---|---:|---:|
| Redirect pages | 726 | 726 |
| Analytics tags on redirect pages | 0 | 0 |
| Redirect pages with delivery assets | 4 | 4 |
| Source redirect templates with analytics | 0 | 0 |
| Missing static targets | 0 | 0 |
| Redirect chains | 0 | 0 |

- Static redirect pages: **726**
- Dynamic redirect pages: **0**
- Checks passed: **10 / 10**

## Policy

- Redirect shells remain `noindex,follow` and retain existing zero-delay redirect behaviour.
- Static destinations must exist and must not be another redirect shell.
- Relative internal destinations are resolved from the redirect page location before validation.
- Source templates are validated separately from published redirect pages.
- Redirect targets, canonicals, query strings and fragments are not rewritten.
- Canonical destination pages continue loading analytics normally.
- These are GitHub Pages compatibility shells; this phase does not claim HTTP 301/308 behaviour.

## Remaining findings

### Chains
- None

### Missing targets
- None

### Canonical mismatches
- None

### Remaining delivery assets
- `games/super-cars-ii.html`: `{"path": "games/super-cars-ii.html", "assets": ["script:../js/ccg-mobile-lite.js", "script:../js/ccg-base.js", "script:../resources/js/ccg-share.js", "script:/js/ccg-schema.js", "link:https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap", "link:../resources/css/ccg-master.css", "link:../resources/css/ccg-mode.css", "link:../resources/css/ccg-effects.css", "link:../resources/css/ccg-anim.css", "link:../resources/css/ccg-overlays.css", "link:../resources/css/ccg-cards.css", "link:../resources/css/games.css", "link:../resources/css/ccg-footer.css", "link:../resources/css/ccg-mobile-lite.css", "img:../resources/images/thumbnails/all/super_cars_ii.png"]}`
- `games/turrican-ii-the-final-fight.html`: `{"path": "games/turrican-ii-the-final-fight.html", "assets": ["script:../js/ccg-mobile-lite.js", "script:../js/ccg-base.js", "script:../resources/js/ccg-share.js", "script:/js/ccg-schema.js", "link:https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap", "link:../resources/css/ccg-master.css", "link:../resources/css/ccg-mode.css", "link:../resources/css/ccg-effects.css", "link:../resources/css/ccg-anim.css", "link:../resources/css/ccg-overlays.css", "link:../resources/css/ccg-cards.css", "link:../resources/css/games.css", "link:../resources/css/ccg-footer.css", "link:../resources/css/ccg-mobile-lite.css", "img:../resources/images/thumbnails/all/turrican_ii_the_final_fight.jpg"]}`
- `games/ultima-i-the-first-age-of-darkness.html`: `{"path": "games/ultima-i-the-first-age-of-darkness.html", "assets": ["script:../js/ccg-mobile-lite.js", "script:../js/ccg-base.js", "script:../resources/js/ccg-share.js", "script:/js/ccg-schema.js", "link:https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap", "link:../resources/css/ccg-master.css", "link:../resources/css/ccg-mode.css", "link:../resources/css/ccg-effects.css", "link:../resources/css/ccg-anim.css", "link:../resources/css/ccg-overlays.css", "link:../resources/css/ccg-cards.css", "link:../resources/css/games.css", "link:../resources/css/ccg-footer.css", "link:../resources/css/ccg-mobile-lite.css", "img:../resources/images/thumbnails/all/ultima_i_the_first_age_of_darkness.jpg"]}`
- `games/who-dares-wins-ii.html`: `{"path": "games/who-dares-wins-ii.html", "assets": ["script:../js/ccg-mobile-lite.js", "script:../js/ccg-base.js", "script:../resources/js/ccg-share.js", "script:/js/ccg-schema.js", "link:https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap", "link:../resources/css/ccg-master.css", "link:../resources/css/ccg-mode.css", "link:../resources/css/ccg-effects.css", "link:../resources/css/ccg-anim.css", "link:../resources/css/ccg-overlays.css", "link:../resources/css/ccg-cards.css", "link:../resources/css/games.css", "link:../resources/css/ccg-footer.css", "link:../resources/css/ccg-mobile-lite.css", "img:../resources/images/thumbnails/all/who_dares_wins_ii.jpg"]}`

## Safety

- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and `games/games.json` unchanged
- no CSS source file, game record, thumbnail or route is renamed or removed
