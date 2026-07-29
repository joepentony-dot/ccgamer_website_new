# Phase 8A LCP and Layout-Shift Diagnostic

## Verdict

**PASS WITH FINDINGS**

This read-only diagnostic inspected current `main` commit `1fc1311072c41528f12ee0a380b7be6e432f58a8`. It measured mobile LCP elements, resource timing and layout-shift sources on four core routes and five deterministic single-game pages, then correlated those observations with Lighthouse performance diagnostics.

- Routes tested: **9**
- Browser diagnostic failures: **0**
- Lighthouse failures: **0**
- Findings recorded: **13**
- Ranked correction candidates: **11**

Canonical game URLs use the site's existing redirect shell. To inspect the rendered shared game template without contaminating LCP attribution with that redirect, the five game diagnostics tested the final `/games/game.html?id=...` destination directly.

Lab measurements are diagnostic evidence, not field Core Web Vitals. Search Console or CrUX remains the source for production-user experience.

## Route attribution

| Route | Family | Observed LCP | Lighthouse LCP | LCP element | Dominant LCP phase | Observed CLS | Lighthouse CLS |
|---|---|---:|---:|---|---|---:|---:|
| Home | home | 2.77s | 8.69s | div.home-hero__bg.home-hero__bg--c64 | render delay 1.19s | 0.065 | 0.119 |
| Games | archive | 1.48s | 3.32s | h1.games-hero__title | render delay 0.26s | 0.045 | 0.202 |
| Genres | archive | 2.79s | 8.29s | h1.ccg-hero-title | render delay 0.24s | 0.245 | 0.385 |
| Quiz | utility | 1.47s | 3.47s | p.ccg-section-subtitle | render delay 0.22s | 0.045 | 0.158 |
| Game: Zeewolf | game | n/a | 14.82s | n/a | n/a | 0.051 | 0.085 |
| Game: Donkey Kong | game | 4.93s | 14.86s | h1#gameHeroTitle | n/a | 0.047 | 0.051 |
| Game: Schizofrenia | game | 4.91s | 14.75s | h1#gameHeroTitle | n/a | 0.046 | 0.082 |
| Game: Kingpin | game | 4.92s | 6.80s | span.ccg-brand__neon-cheeky | render delay 0.36s | 0.050 | 0.084 |
| Game: The Settlers | game | 4.92s | 15.19s | h1#gameHeroTitle | n/a | 0.053 | 0.058 |

## Single-game comparison

| Game route | LCP selector | Tag | Loading | Fetch priority | Dominant phase | LCP | CLS |
|---|---|---|---|---|---|---:|---:|
| Game: Zeewolf | [none] | [none] | n/a | n/a | n/a | 14.82s | 0.085 |
| Game: Donkey Kong | h1#gameHeroTitle | h1 | n/a | n/a | n/a | 14.86s | 0.051 |
| Game: Schizofrenia | h1#gameHeroTitle | h1 | n/a | n/a | n/a | 14.75s | 0.082 |
| Game: Kingpin | span.ccg-brand__neon-cheeky | span | n/a | n/a | render delay 0.36s | 6.80s | 0.084 |
| Game: The Settlers | h1#gameHeroTitle | h1 | n/a | n/a | n/a | 15.19s | 0.058 |

The same LCP selector `h1#gameHeroTitle` appeared on **3 of 5** tested game pages. This supports treating it as shared-template behaviour rather than a Zeewolf-only result.

## Highest layout-shift sources

| Route | Source | Selector | Score/value | Cause |
|---|---|---|---:|---|
| Genres | browser | `main#ccg-main-content` | 0.245 | n/a |
| Genres | browser | `::after` | 0.200 | n/a |
| Genres | browser | `div.ccg-header-actions` | 0.200 | n/a |
| Genres | browser | `div.ccg-mode-hint` | 0.200 | n/a |
| Genres | browser | `button.ccg-nav-toggle.ccg-nav-contract-hardened.ccg-btn.ccg-btn--ghost` | 0.200 | n/a |
| Genres | Lighthouse | `main#ccg-main-content > section.ccg-section > div.ccg-hero > div.ccg-hero-image` | 0.194 | n/a |
| Games | Lighthouse | `body#top > div.ccg-page > main#ccg-main-content` | 0.157 | n/a |
| Games | browser | `a` | 0.134 | n/a |
| Genres | browser | `a` | 0.134 | n/a |
| Quiz | browser | `a` | 0.134 | n/a |
| Genres | Lighthouse | `body#top > div.ccg-page > main#ccg-main-content` | 0.128 | n/a |
| Quiz | Lighthouse | `body#top > div.ccg-page > main#ccg-main-content` | 0.127 | n/a |
| Home | Lighthouse | `body#top > div.ccg-page > main#ccg-main-content` | 0.073 | n/a |
| Home | browser | `main#ccg-main-content` | 0.065 | n/a |
| Home | browser | `div.ccg-header-socials` | 0.065 | n/a |
| Game: The Settlers | Lighthouse | `div.game-shell > section.game-hero > div.game-hero__inner > div.game-hero__content` | 0.058 | n/a |
| Game: Zeewolf | Lighthouse | `div.game-shell > section.game-hero > div.game-hero__inner > div.game-hero__content` | 0.053 | n/a |
| Game: The Settlers | browser | `div.game-hero__content` | 0.053 | n/a |
| Game: Kingpin | Lighthouse | `div.game-shell > section.game-hero > div.game-hero__inner > div.game-hero__content` | 0.052 | n/a |
| Game: Zeewolf | browser | `div.game-hero__content` | 0.051 | n/a |
| Game: Donkey Kong | Lighthouse | `div.game-shell > section.game-hero > div.game-hero__inner > div.game-hero__content` | 0.051 | n/a |
| Game: Schizofrenia | Lighthouse | `div.game-shell > section.game-hero > div.game-hero__inner > div.game-hero__content` | 0.051 | n/a |
| Game: Kingpin | browser | `div.game-hero__content` | 0.050 | n/a |
| Game: Kingpin | browser | `a.ccg-composer-button.ccg-publisher-credit-link` | 0.050 | n/a |
| Game: Donkey Kong | browser | `div.game-hero__content` | 0.047 | n/a |

## Ranked correction candidates

### 1. Make the LCP resource discoverable in the initial document

Lighthouse reported that the LCP request was not discoverable in the initial HTML.

Affected routes: Home.

Evidence:
- `div.home-hero__bg.home-hero__bg--c64`
- `start 1604ms: https://www.cheekycommodoregamer.co.uk/resources/images/hero/ccg-hero-c64.png`

### 2. Reduce LCP element render delay

Lighthouse attributed more than one second of LCP to rendering after the resource or text was available.

Affected routes: Home.

Evidence:
- `render delay 1.19s: div.home-hero__bg.home-hero__bg--c64`

### 3. Stabilise div.game-shell > section.game-hero > div.game-hero__inner > div.game-hero__content

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Game: Zeewolf, Game: Donkey Kong, Game: Schizofrenia, Game: Kingpin, Game: The Settlers.

Evidence:
- `score 0.053`
- `score 0.051`
- `score 0.052`
- `score 0.058`

### 4. Stabilise body#top > div.ccg-page > main#ccg-main-content

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Home, Games, Genres, Quiz.

Evidence:
- `score 0.073`
- `score 0.157`
- `score 0.128`
- `score 0.127`

### 5. Stabilise main#ccg-main-content > section.ccg-section > div.ccg-hero > div.ccg-hero-image

Lighthouse attributed more than 0.05 layout-shift score to this element.

Affected routes: Genres.

Evidence:
- `score 0.194`

### 6. Review explicit priority for the measured LCP image

Lighthouse reported that the LCP resource was not priority hinted.

Affected routes: Home.

Evidence:
- `div.home-hero__bg.home-hero__bg--c64`

### 7. Stabilise main#ccg-main-content

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home, Genres.

Evidence:
- `2 occurrence(s), source value 0.065`
- `2 occurrence(s), source value 0.245`

### 8. Stabilise button.ccg-nav-toggle.ccg-nav-contract-hardened.ccg-btn.ccg-btn--ghost

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `1 occurrence(s), source value 0.200`

### 9. Stabilise div.ccg-header-actions

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `1 occurrence(s), source value 0.200`

### 10. Stabilise div.ccg-header-socials

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Home.

Evidence:
- `2 occurrence(s), source value 0.065`

### 11. Stabilise div.ccg-mode-hint

The element appeared in a high-value browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `1 occurrence(s), source value 0.200`

## Recommended next bounded PR

Start with **Make the LCP resource discoverable in the initial document** on only the affected page family. Re-run the same Phase 8A routes and require lower LCP or CLS without changing the Omega presentation, routes or game data.

## Findings

- Home mobile LCP was 8.69s in at least one diagnostic run.
- Home mobile CLS was 0.119 in at least one diagnostic run.
- Games mobile LCP was 3.32s in at least one diagnostic run.
- Games mobile CLS was 0.202 in at least one diagnostic run.
- Genres mobile LCP was 8.29s in at least one diagnostic run.
- Genres mobile CLS was 0.385 in at least one diagnostic run.
- Quiz mobile LCP was 3.47s in at least one diagnostic run.
- Quiz mobile CLS was 0.158 in at least one diagnostic run.
- Game: Zeewolf mobile LCP was 14.82s in at least one diagnostic run.
- Game: Donkey Kong mobile LCP was 14.86s in at least one diagnostic run.
- Game: Schizofrenia mobile LCP was 14.75s in at least one diagnostic run.
- Game: Kingpin mobile LCP was 6.80s in at least one diagnostic run.
- Game: The Settlers mobile LCP was 15.19s in at least one diagnostic run.

## Diagnostic failures

- None

## Safety

- No public HTML, CSS, JavaScript, image, game record, route or sitemap was changed.
- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and `games/games.json` were hash-protected.
- Screenshots, full Lighthouse reports and raw browser timing remain workflow artifacts rather than public-site files.
- Any correction must use a separate bounded PR with explicit approval.
