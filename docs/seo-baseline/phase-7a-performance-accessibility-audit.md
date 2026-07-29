# Phase 7A Performance and Accessibility Audit

**Audit type:** repository-wide static analysis plus representative live browser checks
**Audited commit:** `4163b51e62d5b94a21ecb9b47dc6d7eb418fb823`
**Standard target:** WCAG 2.2 Level AA
**Performance reference:** Core Web Vitals good thresholds are LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the 75th percentile. Lighthouse is lab data and does not supply field INP.

## Verdict

**Corrections are recommended, but the audit does not indicate a need to redesign the website.**

The site already contains focus styling, reduced-motion handling, semantic landmarks on major pages and responsive infrastructure. The main opportunities are asset delivery, repeated CSS and JavaScript cost, intrinsic media sizing, keyboard bypass and navigation details, and page-family consistency.

- HTML files scanned: **2647**
- Public HTML files scanned: **2620**
- Indexable public HTML files: **1573**
- Client-side redirect shells: **1383**
- Repository assets scanned: **1666**
- Median Lighthouse performance score: **60**
- Median Lighthouse accessibility score: **100**
- Live axe violations across representative routes: **0**

## Method and limits

1. Every repository HTML file was parsed for structural accessibility and delivery-risk signals.
2. CSS, JavaScript and media assets were measured by file count and byte size.
3. Representative live routes were checked with axe-core against WCAG 2 A/AA and WCAG 2.2 AA tags.
4. Representative routes received Lighthouse mobile lab audits; home and games also received desktop runs.
5. Lab scores can vary between runs and are not real-user Core Web Vitals. Search Console or CrUX field data is required before claiming a page passes or fails Core Web Vitals in production.
6. Automated accessibility tools cannot determine full WCAG conformance; keyboard, screen-reader, zoom and cognitive-usability review remain necessary.

## Existing strengths

- Focus-visible rules are present in **28** CSS files.
- Reduced-motion handling appears in **16** CSS files.
- Document language is missing on **1** scanned public pages.
- The audit found **654** public pages without a viewport meta tag.
- Phase 7A made no public-site changes; every finding remains a proposal for later isolated correction phases.

## Priority findings

1. Client-side redirect shells: **1383** pages perform a browser redirect before the shared game page renders.
2. Images without both width and height: **29493** occurrences/pages in the static scan.
3. Head scripts without defer or async: **2319** occurrences/pages in the static scan.
4. Duplicate stylesheet references: **5** occurrences/pages in the static scan.
5. Form controls without a detectable label: **8** occurrences/pages in the static scan.
6. Iframes without a title: **1** occurrences/pages in the static scan.
7. Indexable content pages without a skip link: **921** occurrences/pages in the static scan.
8. Repository assets above 500 KB: **16** shown in evidence; the stored list is capped at 100.

## Lighthouse lab results

| Route | Mode | Performance | Accessibility | LCP | CLS | TBT | Transfer size |
|---|---|---:|---:|---:|---:|---:|---:|
| Home | mobile | 58 | 100 | 9.1 s | 0 | 190 ms | Total size was 3,221 KiB |
| Games | mobile | 60 | 100 | 7.6 s | 0 | 190 ms | Total size was 768 KiB |
| Game: Zeewolf | mobile | 58 | 100 | 16.2 s | 0 | 0 ms | Total size was 11,120 KiB |
| Genres | mobile | 58 | 100 | 14.0 s | 0 | 130 ms | Total size was 2,867 KiB |
| Quiz | mobile | 75 | 100 | 4.9 s | 0 | 40 ms | Total size was 295 KiB |
| Home | desktop | 86 | 100 | 1.3 s | 0.212 | 10 ms | Total size was 1,306 KiB |
| Games | desktop | 75 | 100 | 1.5 s | 0.306 | 150 ms | Total size was 769 KiB |

## Live axe results

| Route | Violations | Affected nodes | Serious/critical nodes | Leading rule IDs |
|---|---:|---:|---:|---|
| Entry | 0 | 0 | 0 | none |
| Home | 0 | 0 | 0 | none |
| Games | 0 | 0 | 0 | none |
| Game: Zeewolf | 0 | 0 | 0 | none |
| Genres | 0 | 0 | 0 | none |
| Publishers | 0 | 0 | 0 | none |
| Music | 0 | 0 | 0 | none |
| Quiz | 0 | 0 | 0 | none |

## Static accessibility totals

- Missing document language: **1**
- Missing main landmark: **633**
- Missing H1: **2**
- Missing skip link: **921**
- Images missing an alt attribute: **1**
- Form controls missing a detectable label: **8**
- Buttons missing a detectable accessible name: **0**
- Links missing a detectable accessible name: **0**
- Iframes missing a title: **1**
- Positive tabindex values: **0**
- Duplicate IDs: **3**

## Static performance-risk totals

- Images missing intrinsic width or height: **29493**
- Iframes not marked for lazy loading: **23**
- Head scripts without defer or async: **2319**
- Duplicate stylesheet references: **5**
- Pages with at least 10 stylesheets: **962**
- Pages with at least 12 scripts: **556**
- CSS files above 100 KB: **1**
- JavaScript files above 150 KB: **0**
- CSS outline-suppression declarations: **44**

## Largest repository assets identified

| Asset | Size |
|---|---:|
| `resources/audio/easter-eggs/party.mp4` | 21.34 MB |
| `resources/images/icons/download.PNG` | 5.58 MB |
| `resources/audio/easter-eggs/heman.mp4` | 4.81 MB |
| `resources/audio/easter-eggs/press-play.mp4` | 3.97 MB |
| `resources/audio/easter-eggs/boing.mp4` | 2.37 MB |
| `resources/images/affiliate/a500-mini.png` | 1.53 MB |
| `resources/images/affiliate/c64-maxi.png` | 1.34 MB |
| `resources/audio/easter-eggs/matrix.mp4` | 1.31 MB |
| `resources/images/affiliate/joystick-clear.png` | 1.22 MB |
| `resources/audio/easter-eggs/vhs.mp4` | 0.84 MB |
| `resources/images/affiliate/gamepad-white.png` | 0.79 MB |
| `resources/images/email/ccg-email-banner.png` | 0.75 MB |
| `resources/images/genres/miscellaneous.png` | 0.63 MB |
| `resources/images/affiliate/gamepad-black.png` | 0.52 MB |
| `resources/audio/easter-eggs/zx-clive.jpg` | 0.50 MB |

## Recommended correction sequence

### Phase 7B — Accessibility foundations

Add or standardise skip navigation, accessible names, labels, iframe titles, keyboard treatment for custom controls and focus behaviour. Make no visual redesign.

### Phase 7C — Media dimensions and loading

Add intrinsic image dimensions where source dimensions are known, review hero and logo loading priority, lazy-load below-the-fold embeds and provide stable aspect-ratio containers.

### Phase 7D — CSS and JavaScript delivery

Remove duplicate stylesheet references, consolidate only where file ownership is established, defer non-critical scripts and reduce page-family asset lists without changing the Omega presentation.

### Phase 7E — Large-asset optimisation

Optimise only verified oversized images and media, retaining source quality and established thumbnail framing. Do not replace authentic artwork with generated substitutes.

### Phase 7F — Route performance review

Measure the cost of canonical game redirect shells and evaluate a static-content or server-routing alternative only if lab and field evidence justify the architectural change.

## Safety and scope

- No public HTML, CSS, JavaScript, game data, thumbnail, route, sitemap or existing workflow was changed.
- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and `games/games.json` remain protected.
- Detailed machine-readable evidence accompanies this report.
- No correction should be merged until its own isolated validation phase passes.
