# Phase 8A LCP and Layout-Shift Diagnostic

## Verdict

**PASS WITH FINDINGS**

This read-only diagnostic inspected current `main` commit `ca0829e213d63372e954dce5f04311234e08910a`. It measured mobile LCP elements, resource timing and layout-shift sources on four core routes and five deterministic single-game pages, then correlated those observations with Lighthouse performance diagnostics.

- Routes tested: **10**
- Browser diagnostic failures: **0**
- Lighthouse failures: **0**
- Findings recorded: **20**
- Ranked correction candidates: **36**

Canonical game URLs use the site's existing redirect shell. To inspect the rendered shared game template without contaminating LCP attribution with that redirect, the five game diagnostics tested the final `/games/game.html?id=...` destination directly.

Lab measurements are diagnostic evidence, not field Core Web Vitals. Search Console or CrUX remains the source for production-user experience.

## Route attribution

| Route | Family | Observed LCP | Lighthouse LCP | LCP element | Dominant LCP phase | Observed CLS | Lighthouse CLS |
|---|---|---:|---:|---|---|---:|---:|
| Home | home | 5.29s | 15.94s | div.home-hero__bg.home-hero__bg--c64 | render delay 0.96s | 1.383 | 0.514 |
| Games | archive | 1.77s | 6.46s | h1.games-hero__title | render delay 0.37s | 1.006 | 0.232 |
| Genres | archive | 2.16s | 7.23s | h1.ccg-hero-title | render delay 0.23s | 1.144 | 0.521 |
| Quiz | utility | 1.72s | 3.91s | p.ccg-section-subtitle | render delay 0.27s | 1.032 | 0.393 |
| Retro Special: 50 Essential Amiga Games | retro-video | 1.58s | 3.46s | h1.retro-video-page__title | render delay 0.27s | 0.251 | 0.472 |
| Game: Zeewolf | game | 7.13s | 4.89s | div#gameHeroBG | render delay 0.25s | 0.474 | 0.740 |
| Game: Blackwyche | game | 7.20s | 7.96s | div#gameHeroBG | render delay 0.32s | 0.476 | 0.335 |
| Game: Schizofrenia | game | 7.06s | 8.11s | div#gameHeroBG | render delay 0.32s | 0.500 | 0.897 |
| Game: Kingpin | game | 7.30s | 6.76s | div#gameHeroBG | render delay 0.29s | 0.477 | 0.502 |
| Game: The Settlers | game | 7.07s | 4.88s | div#gameHeroBG | render delay 0.25s | 0.387 | 1.215 |

## Single-game comparison

| Game route | LCP selector | Tag | Loading | Fetch priority | Dominant phase | LCP | CLS |
|---|---|---|---|---|---|---:|---:|
| Game: Zeewolf | div#gameHeroBG | div | n/a | n/a | render delay 0.25s | 7.13s | 0.740 |
| Game: Blackwyche | div#gameHeroBG | div | n/a | n/a | render delay 0.32s | 7.96s | 0.476 |
| Game: Schizofrenia | div#gameHeroBG | div | n/a | n/a | render delay 0.32s | 8.11s | 0.897 |
| Game: Kingpin | div#gameHeroBG | div | n/a | n/a | render delay 0.29s | 7.30s | 0.502 |
| Game: The Settlers | div#gameHeroBG | div | n/a | n/a | render delay 0.25s | 7.07s | 1.215 |

The same LCP selector `div#gameHeroBG` appeared on **5 of 5** tested game pages. This supports treating it as shared-template behaviour rather than a Zeewolf-only result.

## Highest layout-shift sources

| Route | Source | Selector | Score/value | Cause |
|---|---|---|---:|---|
| Home | browser | `::after` | 1.165 | n/a |
| Games | browser | `main#ccg-main-content` | 0.938 | n/a |
| Genres | browser | `main#ccg-main-content` | 0.917 | n/a |
| Quiz | browser | `main#ccg-main-content` | 0.906 | n/a |
| Home | browser | `main#ccg-main-content` | 0.873 | n/a |
| Genres | browser | `aside#ccgModeIdentityBar` | 0.853 | n/a |
| Genres | browser | `::after` | 0.841 | n/a |
| Games | browser | `aside#ccgModeIdentityBar` | 0.835 | n/a |
| Quiz | browser | `aside#ccgModeIdentityBar` | 0.817 | n/a |
| Home | browser | `aside#ccgModeIdentityBar` | 0.816 | n/a |
| Home | browser | `div.ccg-header-socials` | 0.809 | n/a |
| Quiz | browser | `div.ccg-header-actions` | 0.781 | n/a |
| Home | browser | `div.ccg-header-actions` | 0.773 | n/a |
| Games | browser | `div.ccg-header-actions` | 0.773 | n/a |
| Games | browser | `::after` | 0.773 | n/a |
| Genres | browser | `div.ccg-header-actions` | 0.773 | n/a |
| Genres | browser | `div.ccg-hero.ccg-hero--genres` | 0.610 | n/a |
| Games | browser | `section.games-hero.ccg-amiga-window` | 0.518 | n/a |
| Game: Blackwyche | browser | `section.ccg-consent-banner` | 0.474 | n/a |
| Game: Zeewolf | browser | `section.ccg-consent-banner` | 0.472 | n/a |
| Game: Kingpin | browser | `section.ccg-consent-banner` | 0.472 | n/a |
| Quiz | browser | `a` | 0.466 | n/a |
| Home | browser | `section.home-hero.home-hero--streamlined.ccg-amiga-window` | 0.464 | n/a |
| Genres | browser | `a` | 0.458 | n/a |
| Games | browser | `a` | 0.458 | n/a |

## Ranked correction candidates

### 1. Make the LCP resource discoverable in the initial document

The observed LCP resource began more than one second after navigation start.

Affected routes: Game: Zeewolf, Game: Blackwyche, Game: Schizofrenia, Game: Kingpin, Game: The Settlers.

Evidence:
- `start 6796ms: https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/zeewolf.jpg`
- `start 6906ms: https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/blackwyche.jpg`
- `start 6772ms: https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/schizofrenia_new.png`
- `start 6820ms: https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/kingpin_arcade_sports_bowling.png`
- `start 6720ms: https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/the_settlers_new.png`

### 2. Stabilise body#top > div.ccg-page > main#ccg-main-content

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Home, Games, Genres, Quiz, Retro Special: 50 Essential Amiga Games, Game: Schizofrenia, Game: The Settlers.

Evidence:
- `score 0.267`
- `score 0.123`
- `score 0.073`
- `score 0.058`
- `score 0.119`
- `score 0.061`
- `score 0.056`
- `score 0.353`
- `score 0.293`
- `score 0.155`

### 3. Stabilise body#top > section.ccg-consent-banner

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Game: Zeewolf, Game: Blackwyche, Game: Schizofrenia, Game: Kingpin, Game: The Settlers.

Evidence:
- `score 0.441`
- `score 0.125`
- `score 0.086`
- `score 0.247`
- `score 0.054`
- `score 0.282`
- `score 0.146`
- `score 0.067`

### 4. Stabilise main#ccg-main-content > div.game-shell > section.game-hero > div#gameHeroBG

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Game: Schizofrenia, Game: The Settlers.

Evidence:
- `score 0.092`
- `score 0.177`

### 5. Stabilise body#top > div.ccg-page > main#ccg-main-content > section.home-hero

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Home.

Evidence:
- `score 0.069`
- `score 0.053`

### 6. Stabilise div.ccg-page > main#ccg-main-content > article.retro-video-page > header.retro-video-page__hero

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Retro Special: 50 Essential Amiga Games.

Evidence:
- `score 0.083`

### 7. Stabilise div.ccg-page > main#ccg-main-content > section.ccg-section > div.ccg-hero

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Genres.

Evidence:
- `score 0.090`
- `score 0.084`
- `score 0.069`

### 8. Stabilise main#ccg-main-content

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home, Games, Genres, Quiz, Retro Special: 50 Essential Amiga Games.

Evidence:
- `6 occurrence(s), source value 0.873`
- `6 occurrence(s), source value 0.938`
- `6 occurrence(s), source value 0.917`
- `4 occurrence(s), source value 0.906`
- `6 occurrence(s), source value 0.212`

### 9. Stabilise section.ccg-consent-banner

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Game: Zeewolf, Game: Blackwyche, Game: Schizofrenia, Game: Kingpin, Game: The Settlers.

Evidence:
- `12 occurrence(s), source value 0.472`
- `14 occurrence(s), source value 0.474`
- `11 occurrence(s), source value 0.447`
- `10 occurrence(s), source value 0.385`

### 10. Stabilise aside#ccgModeIdentityBar

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home, Games, Genres, Quiz.

Evidence:
- `4 occurrence(s), source value 0.816`
- `4 occurrence(s), source value 0.835`
- `4 occurrence(s), source value 0.853`
- `3 occurrence(s), source value 0.817`

### 11. Stabilise div.ccg-header-actions

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home, Games, Genres, Quiz.

Evidence:
- `2 occurrence(s), source value 0.773`
- `2 occurrence(s), source value 0.781`

### 12. Stabilise div.ccg-home-search-command

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home, Quiz.

Evidence:
- `1 occurrence(s), source value 0.150`
- `2 occurrence(s), source value 0.425`

### 13. Stabilise a.ccg-btn.home-hero__beta-cta

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home.

Evidence:
- `1 occurrence(s), source value 0.150`

### 14. Stabilise article#quiz-intro-panel

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Quiz.

Evidence:
- `2 occurrence(s), source value 0.065`

### 15. Stabilise article.retro-video-page

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Retro Special: 50 Essential Amiga Games.

Evidence:
- `2 occurrence(s), source value 0.080`

### 16. Stabilise div.ccg-header-neon-strip

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Retro Special: 50 Essential Amiga Games.

Evidence:
- `2 occurrence(s), source value 0.110`

### 17. Stabilise div.ccg-header-socials

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home.

Evidence:
- `3 occurrence(s), source value 0.809`

### 18. Stabilise div.ccg-hero.ccg-hero--genres

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `5 occurrence(s), source value 0.610`

### 19. Stabilise div.ccg-omega-divider

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `1 occurrence(s), source value 0.067`

### 20. Stabilise div.game-hero__media

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Game: Schizofrenia.

Evidence:
- `1 occurrence(s), source value 0.053`

### 21. Stabilise div.home-hero__frame

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home.

Evidence:
- `1 occurrence(s), source value 0.150`

### 22. Stabilise div.quiz-hero-buttons

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Quiz.

Evidence:
- `1 occurrence(s), source value 0.050`

### 23. Stabilise div.quiz-hero-controls

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Quiz.

Evidence:
- `2 occurrence(s), source value 0.065`

### 24. Stabilise header.ccg-header

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Quiz.

Evidence:
- `1 occurrence(s), source value 0.396`

### 25. Stabilise iframe#game-video-embed

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Game: Schizofrenia.

Evidence:
- `1 occurrence(s), source value 0.053`

### 26. Stabilise nav.ccg-engagement-breadcrumbs

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `1 occurrence(s), source value 0.089`

### 27. Stabilise nav.ccg-game-section-nav

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Game: Schizofrenia.

Evidence:
- `1 occurrence(s), source value 0.053`

### 28. Stabilise section#game-video-section

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Game: Schizofrenia.

Evidence:
- `1 occurrence(s), source value 0.053`

### 29. Stabilise section.ccg-section.ccg-chapter

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `1 occurrence(s), source value 0.067`

### 30. Stabilise section.ccg-section.ccg-genres-hero

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `3 occurrence(s), source value 0.157`

### 31. Stabilise section.ccg-section.ccg-genres-intro

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `1 occurrence(s), source value 0.067`

### 32. Stabilise section.ccg-section.ccg-hero.ccg-hero--quiz

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Quiz.

Evidence:
- `2 occurrence(s), source value 0.057`

### 33. Stabilise section.games-hero.ccg-amiga-window

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Games.

Evidence:
- `3 occurrence(s), source value 0.518`

### 34. Stabilise section.home-hero.home-hero--streamlined.ccg-amiga-window

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home.

Evidence:
- `5 occurrence(s), source value 0.464`

### 35. Stabilise section.home-section.home-section--highlights.home-section--streamlined.ccg-chapter.ccg-amiga-window

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home.

Evidence:
- `1 occurrence(s), source value 0.242`

### 36. Stabilise section.retro-video-page__watch.retro-video-page__watch--guide

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Retro Special: 50 Essential Amiga Games.

Evidence:
- `1 occurrence(s), source value 0.060`

## Recommended next bounded PR

Start with **Make the LCP resource discoverable in the initial document** on only the affected page family. Re-run the same Phase 8A routes and require lower LCP or CLS without changing the Omega presentation, routes or game data.

## Findings

- Home mobile LCP was 15.94s in at least one diagnostic run.
- Home mobile CLS was 1.383 in at least one diagnostic run.
- Games mobile LCP was 6.46s in at least one diagnostic run.
- Games mobile CLS was 1.006 in at least one diagnostic run.
- Genres mobile LCP was 7.23s in at least one diagnostic run.
- Genres mobile CLS was 1.144 in at least one diagnostic run.
- Quiz mobile LCP was 3.91s in at least one diagnostic run.
- Quiz mobile CLS was 1.032 in at least one diagnostic run.
- Retro Special: 50 Essential Amiga Games mobile LCP was 3.46s in at least one diagnostic run.
- Retro Special: 50 Essential Amiga Games mobile CLS was 0.472 in at least one diagnostic run.
- Game: Zeewolf mobile LCP was 7.13s in at least one diagnostic run.
- Game: Zeewolf mobile CLS was 0.740 in at least one diagnostic run.
- Game: Blackwyche mobile LCP was 7.96s in at least one diagnostic run.
- Game: Blackwyche mobile CLS was 0.476 in at least one diagnostic run.
- Game: Schizofrenia mobile LCP was 8.11s in at least one diagnostic run.
- Game: Schizofrenia mobile CLS was 0.897 in at least one diagnostic run.
- Game: Kingpin mobile LCP was 7.30s in at least one diagnostic run.
- Game: Kingpin mobile CLS was 0.502 in at least one diagnostic run.
- Game: The Settlers mobile LCP was 7.07s in at least one diagnostic run.
- Game: The Settlers mobile CLS was 1.215 in at least one diagnostic run.

## Diagnostic failures

- None

## Safety

- No public HTML, CSS, JavaScript, image, game record, route or sitemap was changed.
- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and `games/games.json` were hash-protected.
- Screenshots, full Lighthouse reports and raw browser timing remain workflow artifacts rather than public-site files.
- Any correction must use a separate bounded PR with explicit approval.
