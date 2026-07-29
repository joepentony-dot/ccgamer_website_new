# Phase 8A LCP and Layout-Shift Diagnostic

## Verdict

**PASS WITH FINDINGS**

This read-only diagnostic inspected current `main` commit `1fc1311072c41528f12ee0a380b7be6e432f58a8`. It measured mobile LCP elements, resource timing and layout-shift sources on four core routes and five deterministic single-game pages, then correlated those observations with Lighthouse performance diagnostics.

- Routes tested: **9**
- Browser diagnostic failures: **0**
- Lighthouse failures: **0**
- Findings recorded: **11**
- Ranked correction candidates: **3**

Lab measurements are diagnostic evidence, not field Core Web Vitals. Search Console or CrUX remains the source for production-user experience.

## Route attribution

| Route | Family | Observed LCP | Lighthouse LCP | LCP element | Resource start | Resource transfer | Observed CLS | Lighthouse CLS |
|---|---|---:|---:|---|---:|---:|---:|---:|
| Home | home | 3.10s | 16.11s | div.home-hero__bg.home-hero__bg--c64 | 1.94s | 25.2 KiB | 0.046 | 0.000 |
| Games | archive | 1.48s | 6.80s | h1.games-hero__title | n/a | n/a | 0.045 | 0.045 |
| Genres | archive | 2.75s | 13.67s | h1.ccg-hero-title | n/a | n/a | 0.245 | 0.055 |
| Quiz | utility | 1.45s | 2.86s | p.ccg-section-subtitle | n/a | n/a | 0.045 | 0.158 |
| Game: Zeewolf | game | n/a | 14.46s | n/a | n/a | n/a | 0.051 | 0.048 |
| Game: Donkey Kong | game | n/a | 14.08s | n/a | n/a | n/a | 0.047 | 0.077 |
| Game: Schizofrenia | game | n/a | 15.04s | n/a | n/a | n/a | 0.046 | 0.077 |
| Game: Kingpin | game | n/a | 14.21s | n/a | n/a | n/a | 0.050 | 0.000 |
| Game: The Settlers | game | n/a | 15.20s | n/a | n/a | n/a | 0.053 | 0.053 |

## Single-game comparison

| Game route | LCP selector | Tag | Resource host | Loading | Fetch priority | LCP | CLS |
|---|---|---|---|---|---|---:|---:|
| Game: Zeewolf | [none] | [none] | same document | n/a | n/a | 14.46s | 0.051 |
| Game: Donkey Kong | [none] | [none] | same document | n/a | n/a | 14.08s | 0.077 |
| Game: Schizofrenia | [none] | [none] | same document | n/a | n/a | 15.04s | 0.077 |
| Game: Kingpin | [none] | [none] | same document | n/a | n/a | 14.21s | 0.050 |
| Game: The Settlers | [none] | [none] | same document | n/a | n/a | 15.20s | 0.053 |

The same LCP selector `[none]` appeared on **5 of 5** tested game pages. This supports treating it as shared-template behaviour rather than a Zeewolf-only result.

## Highest layout-shift sources

| Route | Selector | Accumulated source value | Occurrences |
|---|---|---:|---:|
| Genres | `main#ccg-main-content` | 0.245 | 2 |
| Genres | `::after` | 0.200 | 1 |
| Genres | `div.ccg-header-actions` | 0.200 | 1 |
| Genres | `div.ccg-mode-hint` | 0.200 | 1 |
| Genres | `button.ccg-nav-toggle.ccg-nav-contract-hardened.ccg-btn.ccg-btn--ghost` | 0.200 | 1 |
| Games | `a` | 0.134 | 3 |
| Genres | `a` | 0.134 | 3 |
| Quiz | `a` | 0.134 | 3 |
| Game: The Settlers | `div.game-hero__content` | 0.053 | 1 |
| Game: Zeewolf | `div.game-hero__content` | 0.051 | 1 |
| Game: Kingpin | `div.game-hero__content` | 0.050 | 1 |
| Game: Kingpin | `a.ccg-composer-button.ccg-publisher-credit-link` | 0.050 | 1 |
| Game: Donkey Kong | `div.game-hero__content` | 0.047 | 1 |
| Game: Donkey Kong | `a.ccg-composer-button.ccg-publisher-credit-link` | 0.047 | 1 |
| Game: Schizofrenia | `div.game-hero__content` | 0.046 | 1 |
| Game: Schizofrenia | `a.ccg-composer-button.ccg-publisher-credit-link` | 0.046 | 1 |
| Home | `main#ccg-main-content` | 0.046 | 1 |
| Home | `div.ccg-header-socials` | 0.046 | 1 |
| Home | `div.ccg-header-neon-strip` | 0.046 | 1 |
| Games | `main#ccg-main-content` | 0.045 | 1 |

## Ranked correction candidates

### 1. Reduce delayed discovery of the LCP resource

The LCP resource began more than one second after navigation start.

Affected routes: Home.

Evidence:
- `start 1940ms: https://www.cheekycommodoregamer.co.uk/resources/images/hero/ccg-hero-c64.png`

### 2. Stabilise a

The element appeared in the highest browser-observed layout-shift source group.

Affected routes: Quiz.

Evidence:
- `3 occurrence(s), accumulated source value 0.134`

### 3. Stabilise main#ccg-main-content

The element appeared in the highest browser-observed layout-shift source group.

Affected routes: Genres.

Evidence:
- `2 occurrence(s), accumulated source value 0.245`

## Recommended next bounded PR

Start with **Reduce delayed discovery of the LCP resource** on only the affected page family. Re-run the same Phase 8A routes and require lower LCP or CLS without changing the Omega presentation, routes or game data.

## Findings

- Home mobile LCP was 16.11s in at least one diagnostic run.
- Games mobile LCP was 6.80s in at least one diagnostic run.
- Genres mobile LCP was 13.67s in at least one diagnostic run.
- Genres mobile CLS was 0.245 in at least one diagnostic run.
- Quiz mobile LCP was 2.86s in at least one diagnostic run.
- Quiz mobile CLS was 0.158 in at least one diagnostic run.
- Game: Zeewolf mobile LCP was 14.46s in at least one diagnostic run.
- Game: Donkey Kong mobile LCP was 14.08s in at least one diagnostic run.
- Game: Schizofrenia mobile LCP was 15.04s in at least one diagnostic run.
- Game: Kingpin mobile LCP was 14.21s in at least one diagnostic run.
- Game: The Settlers mobile LCP was 15.20s in at least one diagnostic run.

## Diagnostic failures

- None

## Safety

- No public HTML, CSS, JavaScript, image, game record, route or sitemap was changed.
- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and `games/games.json` were hash-protected.
- Screenshots, full Lighthouse reports and raw browser timing remain workflow artifacts rather than public-site files.
- Any correction must use a separate bounded PR with explicit approval.
