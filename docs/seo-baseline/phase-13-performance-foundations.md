# Phase 13 — Performance Foundations

## Purpose

This phase strengthens runtime performance across the existing CCG site without redesigning pages, changing game records or altering the protected intro-loader stack.

The existing archive already uses progressive game-card rendering, lazy thumbnail loading and deferred scripts on many routes. Phase 13 adds one shared layer for pages that load `resources/js/ccg-performance.js` so the same media and rendering rules apply consistently across home, archive, publisher, developer, quiz and information pages.

## Improvements

### Media loading policy

- Header images are corrected to eager loading when older templates mark them as lazy.
- Images in a hero or explicitly marked priority area are loaded eagerly with high fetch priority.
- Other images default to lazy loading and low fetch priority when the page has not already specified a policy.
- Images default to asynchronous decoding.
- Non-priority iframes default to lazy loading.
- Videos default to metadata-only preloading.
- A mutation observer applies the same rules to dynamically inserted media.

### Rendering containment

The shared stylesheet applies `content-visibility: auto` and `contain-intrinsic-size` to later page chapters, archive accordion sections and explicitly deferred regions. This allows the browser to avoid rendering distant content until it approaches the viewport while reserving space to reduce layout movement.

Print output explicitly disables containment so all content remains printable.

### Decorative workload control

- Decorative background animations pause when the document is hidden.
- Decorative background animations pause after desktop inactivity.
- Reduced-motion and data-saving preferences disable the main decorative background animations.
- The previous global `requestAnimationFrame` override has been removed. Shared browser APIs are no longer replaced.

### Measurement hook

A lightweight `PerformanceObserver` records:

- cumulative layout shift;
- latest largest-contentful-paint timing;
- long-task count.

The values remain in the current browser session and are exposed through `window.CCG_PERFORMANCE_METRICS`. A `ccg:performance-snapshot` event is dispatched when the page is left. No personal information is collected and no new analytics request is sent.

## Scope and safety

Changed files are restricted to:

- `resources/js/ccg-performance.js`
- `resources/css/ccg-performance-foundations.css`
- `scripts/audit-performance-foundations.js`
- `.github/workflows/ccg-performance-foundations.yml`
- this document

The phase audit rejects changes to:

- `index.html`
- `home.html`
- `resources/css/intro.css`
- `js/index-intro.js`
- `games/games.json`

## Validation

The dedicated workflow checks JavaScript syntax, verifies required performance policies, confirms representative routes already load the shared performance script and rejects out-of-scope changes.

## Follow-on work

This phase establishes browser-side foundations. Later performance work can use the recorded metrics and existing Lighthouse workflow to target individual assets, generated page templates and responsive image variants without broad or risky replacements.
