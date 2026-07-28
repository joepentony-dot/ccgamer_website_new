# Phase 1B Indexing and Sitemap Corrections

This phase resolves the reviewed missing-canonical and sitemap-omission findings without touching the homepage loader stack.

## Results

| Check | Before | After |
|---|---:|---:|
| Canonical collision groups | **1** | **1** |
| Indexable pages missing canonicals | **9** | **0** |
| Indexable pages missing from sitemaps | **26** | **0** |

## Decisions applied

- **12** utility, private, administrative or client-only shells remain accessible but now use `noindex,follow`.
- **11** proven legacy game routes now redirect directly to existing canonical game pages.
- **3** genuine public pages were normalised and added to the sitemap.
- Query strings and URL fragments are retained by every legacy-game redirect.
- Internal links to the eleven legacy game routes were replaced with canonical routes.

## Public pages added to the sitemap

- `community/index.html` — canonical `/community/`
- `music/composers/index.html` — canonical `/music/composers/`
- `quiz/pack-6.html` — canonical `/quiz/pack-6.html`

## Legacy game aliases

- `/games/b-c-2-grog-s-revenge/` → `/games/bc2-grogs-revenge/`
- `/games/b-c-bill/` → `/games/bc-bill/`
- `/games/b-c-s-quest-for-tires/` → `/games/bcs-quest-for-tires/`
- `/games/bc2-grog-s-revenge/` → `/games/bc2-grogs-revenge/`
- `/games/bully-s-sporting-darts/` → `/games/bullys-sporting-darts/`
- `/games/dragon-s-lair-2-escape-from-singe-s-castle/` → `/games/dragons-lair-2-escape-from-singes-castle/`
- `/games/gary-lineker-s-superstar-soccer/` → `/games/gary-linekers-superstar-soccer/`
- `/games/h-e-r-o/` → `/games/hero/`
- `/games/ivan-ironman-stewart-s-super-off-road/` → `/games/ivan-ironman-stewarts-super-off-road/`
- `/games/jimmy-white-s-whirlwind-snooker/` → `/games/jimmy-whites-whirlwind-snooker/`
- `/games/m-u-l-e/` → `/games/mule/`

## Explicit exclusions

- `index.html`, `home.html`, `complete-index.html`, `resources/css/intro.css` and `js/index-intro.js` were not changed.
- `games/games.json` was not changed.
- The one remaining homepage canonical collision remains deferred.
- No public feature was deleted; noindexed utilities remain reachable and functional.

## Rollback

Revert the Phase 1B squash merge commit.
