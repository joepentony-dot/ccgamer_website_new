# Phase 8A LCP and Layout-Shift Diagnostic

## Verdict

**PASS WITH FINDINGS**

This read-only diagnostic inspected current `main` commit `d0d4130136a94dad884d93de4255217c72345d6c`. It measured mobile LCP elements, resource timing and layout-shift sources on four core routes and five deterministic single-game pages, then correlated those observations with Lighthouse performance diagnostics.

- Routes tested: **10**
- Browser diagnostic failures: **0**
- Lighthouse failures: **0**
- Findings recorded: **19**
- Ranked correction candidates: **27**

Canonical game URLs use the site's existing redirect shell. To inspect the rendered shared game template without contaminating LCP attribution with that redirect, the five game diagnostics tested the final `/games/game.html?id=...` destination directly.

Lab measurements are diagnostic evidence, not field Core Web Vitals. Search Console or CrUX remains the source for production-user experience.

## Route attribution

| Route | Family | Observed LCP | Lighthouse LCP | LCP element | Dominant LCP phase | Observed CLS | Lighthouse CLS |
|---|---|---:|---:|---|---|---:|---:|
| Home | home | 3.75s | 15.46s | div.home-hero__bg.home-hero__bg--c64 | render delay 1.31s | 1.198 | 1.238 |
| Games | archive | 1.84s | 7.05s | h1.games-hero__title | render delay 2.33s | 0.297 | 0.000 |
| Genres | archive | 2.22s | 6.23s | h1.ccg-hero-title | render delay 0.37s | 1.125 | 0.509 |
| Quiz | utility | 1.78s | 4.50s | p.ccg-section-subtitle | render delay 0.32s | 0.453 | 0.217 |
| Retro Special: 50 Essential Amiga Games | retro-video | 1.51s | 4.06s | h1.retro-video-page__title | render delay 0.34s | 0.944 | 0.743 |
| Game: Zeewolf | game | 9.03s | 18.26s | div#gameHeroBG | n/a | 0.027 | 0.112 |
| Game: Blackwyche | game | 8.62s | 17.87s | div#gameHeroBG | n/a | 0.018 | 0.249 |
| Game: Schizofrenia | game | 7.07s | 18.43s | div#gameHeroBG | n/a | 0.064 | 0.172 |
| Game: Kingpin | game | 7.31s | 17.75s | div#gameHeroBG | n/a | 0.013 | 0.000 |
| Game: The Settlers | game | 7.07s | 19.39s | div#gameHeroBG | n/a | 0.010 | 0.122 |

## Single-game comparison

| Game route | LCP selector | Tag | Loading | Fetch priority | Dominant phase | LCP | CLS |
|---|---|---|---|---|---|---:|---:|
| Game: Zeewolf | div#gameHeroBG | div | n/a | n/a | n/a | 18.26s | 0.112 |
| Game: Blackwyche | div#gameHeroBG | div | n/a | n/a | n/a | 17.87s | 0.249 |
| Game: Schizofrenia | div#gameHeroBG | div | n/a | n/a | n/a | 18.43s | 0.172 |
| Game: Kingpin | div#gameHeroBG | div | n/a | n/a | n/a | 17.75s | 0.013 |
| Game: The Settlers | div#gameHeroBG | div | n/a | n/a | n/a | 19.39s | 0.122 |

The same LCP selector `div#gameHeroBG` appeared on **5 of 5** tested game pages. This supports treating it as shared-template behaviour rather than a Zeewolf-only result.

## Highest layout-shift sources

| Route | Source | Selector | Score/value | Cause |
|---|---|---|---:|---|
| Genres | browser | `main#ccg-main-content` | 0.985 | n/a |
| Genres | browser | `::after` | 0.894 | n/a |
| Home | browser | `main#ccg-main-content` | 0.890 | n/a |
| Retro Special: 50 Essential Amiga Games | browser | `main#ccg-main-content` | 0.864 | n/a |
| Genres | browser | `aside#ccgModeIdentityBar` | 0.853 | n/a |
| Home | browser | `aside#ccgModeIdentityBar` | 0.833 | n/a |
| Home | browser | `div.ccg-header-socials` | 0.819 | n/a |
| Retro Special: 50 Essential Amiga Games | browser | `aside#ccgModeIdentityBar` | 0.817 | n/a |
| Retro Special: 50 Essential Amiga Games | browser | `div.ccg-header-actions` | 0.781 | n/a |
| Genres | browser | `div.ccg-header-actions` | 0.773 | n/a |
| Genres | browser | `div.ccg-hero.ccg-hero--genres` | 0.645 | n/a |
| Home | browser | `::after` | 0.637 | n/a |
| Retro Special: 50 Essential Amiga Games | browser | `a` | 0.466 | n/a |
| Genres | browser | `a` | 0.458 | n/a |
| Home | Lighthouse | `body#top > div.ccg-page > main#ccg-main-content` | 0.433 | n/a |
| Home | Lighthouse | `body#top > div.ccg-page > main#ccg-main-content` | 0.421 | n/a |
| Home | browser | `header.ccg-header` | 0.410 | n/a |
| Retro Special: 50 Essential Amiga Games | browser | `header.ccg-header` | 0.396 | n/a |
| Home | browser | `div.ccg-header-actions` | 0.388 | n/a |
| Home | browser | `a.ccg-btn.home-hero__beta-cta` | 0.388 | n/a |
| Retro Special: 50 Essential Amiga Games | browser | `header.retro-video-page__hero` | 0.386 | n/a |
| Retro Special: 50 Essential Amiga Games | browser | `::after` | 0.386 | n/a |
| Retro Special: 50 Essential Amiga Games | Lighthouse | `body#top > div.ccg-page > main#ccg-main-content` | 0.353 | n/a |
| Home | browser | `section.home-hero.home-hero--streamlined.ccg-amiga-window` | 0.305 | n/a |
| Home | Lighthouse | `body#top > div.ccg-page > main#ccg-main-content > section.home-hero` | 0.244 | n/a |

## Ranked correction candidates

### 1. Make the LCP resource discoverable in the initial document

The observed LCP resource began more than one second after navigation start.

Affected routes: Game: Zeewolf, Game: Blackwyche, Game: Schizofrenia, Game: Kingpin, Game: The Settlers.

Evidence:
- `start 8551ms: https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/zeewolf.jpg`
- `start 8220ms: https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/blackwyche.jpg`
- `start 6628ms: https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/schizofrenia_new.png`
- `start 6857ms: https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/kingpin_arcade_sports_bowling.png`
- `start 6680ms: https://www.cheekycommodoregamer.co.uk/resources/images/thumbnails/all/the_settlers_new.png`

### 2. Reduce LCP element render delay

Lighthouse attributed more than one second of LCP to rendering after the resource or text was available.

Affected routes: Home, Games.

Evidence:
- `render delay 1.31s: div.home-hero__bg.home-hero__bg--c64`
- `render delay 2.33s: h1.games-hero__title`

### 3. Stabilise body#top > div.ccg-page > main#ccg-main-content

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Home, Genres, Quiz, Retro Special: 50 Essential Amiga Games.

Evidence:
- `score 0.433`
- `score 0.421`
- `score 0.091`
- `score 0.057`
- `score 0.125`
- `score 0.056`
- `score 0.353`

### 4. Stabilise body#top > div.ccg-page > main#ccg-main-content > section.home-hero

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Home.

Evidence:
- `score 0.244`

### 5. Stabilise div.ccg-page > main#ccg-main-content > section.ccg-section > div.ccg-hero

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Genres.

Evidence:
- `score 0.085`

### 6. Stabilise div.game-shell > section.game-hero > div.game-hero__inner > div.game-hero__media

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Game: Schizofrenia.

Evidence:
- `score 0.067`

### 7. Stabilise main#ccg-main-content > div.game-shell > section.game-hero > div#gameHeroBG

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Game: Blackwyche.

Evidence:
- `score 0.177`

### 8. Stabilise main#ccg-main-content > section.ccg-section > div.ccg-hero > div.ccg-hero-image

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Genres.

Evidence:
- `score 0.145`

### 9. Stabilise aside#ccgModeIdentityBar

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home, Games, Genres, Quiz, Retro Special: 50 Essential Amiga Games.

Evidence:
- `5 occurrence(s), source value 0.833`
- `4 occurrence(s), source value 0.149`
- `4 occurrence(s), source value 0.853`
- `4 occurrence(s), source value 0.191`
- `3 occurrence(s), source value 0.817`

### 10. Stabilise main#ccg-main-content

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home, Games, Genres, Quiz, Retro Special: 50 Essential Amiga Games.

Evidence:
- `7 occurrence(s), source value 0.890`
- `5 occurrence(s), source value 0.196`
- `6 occurrence(s), source value 0.985`
- `5 occurrence(s), source value 0.238`
- `4 occurrence(s), source value 0.864`

### 11. Stabilise header.ccg-header

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home, Games, Quiz, Retro Special: 50 Essential Amiga Games.

Evidence:
- `3 occurrence(s), source value 0.410`
- `3 occurrence(s), source value 0.114`
- `3 occurrence(s), source value 0.156`
- `1 occurrence(s), source value 0.396`

### 12. Stabilise div.ccg-header-actions

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home, Genres, Retro Special: 50 Essential Amiga Games.

Evidence:
- `1 occurrence(s), source value 0.388`
- `2 occurrence(s), source value 0.773`
- `2 occurrence(s), source value 0.781`

### 13. Stabilise nav.ccg-engagement-breadcrumbs

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres, Quiz.

Evidence:
- `1 occurrence(s), source value 0.089`
- `2 occurrence(s), source value 0.075`

### 14. Stabilise a.ccg-btn.home-hero__beta-cta

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home.

Evidence:
- `1 occurrence(s), source value 0.388`

### 15. Stabilise article#quiz-intro-panel

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Quiz.

Evidence:
- `2 occurrence(s), source value 0.064`

### 16. Stabilise article.retro-video-page

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Retro Special: 50 Essential Amiga Games.

Evidence:
- `2 occurrence(s), source value 0.078`

### 17. Stabilise div.ccg-header-socials

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home.

Evidence:
- `3 occurrence(s), source value 0.819`

### 18. Stabilise div.ccg-hero.ccg-hero--genres

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `4 occurrence(s), source value 0.645`

### 19. Stabilise div.ccg-home-search-command

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Quiz.

Evidence:
- `2 occurrence(s), source value 0.075`

### 20. Stabilise div.ccg-omega-divider

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `1 occurrence(s), source value 0.121`

### 21. Stabilise div.game-hero__media

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Game: Schizofrenia.

Evidence:
- `3 occurrence(s), source value 0.064`

### 22. Stabilise header.retro-video-page__hero

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Retro Special: 50 Essential Amiga Games.

Evidence:
- `1 occurrence(s), source value 0.386`

### 23. Stabilise section.ccg-section.ccg-genres-hero

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `2 occurrence(s), source value 0.138`

### 24. Stabilise section.ccg-section.ccg-hero.ccg-hero--quiz

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Quiz.

Evidence:
- `4 occurrence(s), source value 0.148`

### 25. Stabilise section.games-hero

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Games.

Evidence:
- `1 occurrence(s), source value 0.057`

### 26. Stabilise section.home-hero.home-hero--streamlined.ccg-amiga-window

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home.

Evidence:
- `4 occurrence(s), source value 0.305`

### 27. Stabilise section.retro-video-page__watch.retro-video-page__watch--guide

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Retro Special: 50 Essential Amiga Games.

Evidence:
- `1 occurrence(s), source value 0.058`

## Recommended next bounded PR

Start with **Make the LCP resource discoverable in the initial document** on only the affected page family. Re-run the same Phase 8A routes and require lower LCP or CLS without changing the Omega presentation, routes or game data.

## Findings

- Home mobile LCP was 15.46s in at least one diagnostic run.
- Home mobile CLS was 1.238 in at least one diagnostic run.
- Games mobile LCP was 7.05s in at least one diagnostic run.
- Games mobile CLS was 0.297 in at least one diagnostic run.
- Genres mobile LCP was 6.23s in at least one diagnostic run.
- Genres mobile CLS was 1.125 in at least one diagnostic run.
- Quiz mobile LCP was 4.50s in at least one diagnostic run.
- Quiz mobile CLS was 0.453 in at least one diagnostic run.
- Retro Special: 50 Essential Amiga Games mobile LCP was 4.06s in at least one diagnostic run.
- Retro Special: 50 Essential Amiga Games mobile CLS was 0.944 in at least one diagnostic run.
- Game: Zeewolf mobile LCP was 18.26s in at least one diagnostic run.
- Game: Zeewolf mobile CLS was 0.112 in at least one diagnostic run.
- Game: Blackwyche mobile LCP was 17.87s in at least one diagnostic run.
- Game: Blackwyche mobile CLS was 0.249 in at least one diagnostic run.
- Game: Schizofrenia mobile LCP was 18.43s in at least one diagnostic run.
- Game: Schizofrenia mobile CLS was 0.172 in at least one diagnostic run.
- Game: Kingpin mobile LCP was 17.75s in at least one diagnostic run.
- Game: The Settlers mobile LCP was 19.39s in at least one diagnostic run.
- Game: The Settlers mobile CLS was 0.122 in at least one diagnostic run.

## Diagnostic failures

- None

## Safety

- No public HTML, CSS, JavaScript, image, game record, route or sitemap was changed.
- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and `games/games.json` were hash-protected.
- Screenshots, full Lighthouse reports and raw browser timing remain workflow artifacts rather than public-site files.
- Any correction must use a separate bounded PR with explicit approval.
