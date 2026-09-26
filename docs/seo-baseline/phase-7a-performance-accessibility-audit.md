# Phase 7A Performance and Accessibility Audit

**Audit type:** repository-wide static analysis plus representative live browser checks
**Audited commit:** `2cc8f06a7ff6a94a14fbd8cbd5e4e85a2a56f177`
**Standard target:** WCAG 2.2 Level AA
**Performance reference:** Core Web Vitals good thresholds are LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the 75th percentile. Lighthouse is lab data and does not supply field INP.

## Verdict

**Corrections are recommended, but the audit does not indicate a need to redesign the website.**

The site already contains focus styling, reduced-motion handling, semantic landmarks on major pages and responsive infrastructure. The main opportunities are asset delivery, repeated CSS and JavaScript cost, intrinsic media sizing, keyboard bypass and navigation details, and page-family consistency.

- HTML files scanned: **2771**
- Public HTML files scanned: **2731**
- Indexable public HTML files: **1703**
- Client-side redirect shells: **1440**
- Repository assets scanned: **2134**
- Median Lighthouse performance score: **67**
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

- Focus-visible rules are present in **78** CSS files.
- Reduced-motion handling appears in **61** CSS files.
- Document language is missing on **0** scanned public pages.
- The audit found **0** public pages without a viewport meta tag.
- Phase 7A made no public-site changes; every finding remains a proposal for later isolated correction phases.

## Priority findings

1. Client-side redirect shells: **1440** pages perform a browser redirect before the shared game page renders.
2. Images without both width and height: **29101** occurrences/pages in the static scan.
3. Head scripts without defer or async: **646** occurrences/pages in the static scan.
4. Indexable content pages without a skip link: **1038** occurrences/pages in the static scan.
5. Repository assets above 500 KB: **39** shown in evidence; the stored list is capped at 100.

## Lighthouse lab results

| Route | Mode | Performance | Accessibility | LCP | CLS | TBT | Transfer size |
|---|---|---:|---:|---:|---:|---:|---:|
| Home | mobile | 43 | 100 | 16.8 s | 0.37 | 390 ms | Total size was 3,665 KiB |
| Games | mobile | 74 | 100 | 3.6 s | 0.068 | 440 ms | Total size was 855 KiB |
| Game: Zeewolf | mobile | 60 | 100 | 5.7 s | 0.1 | 490 ms | Total size was 2,723 KiB |
| Genres | mobile | 50 | 100 | 7.6 s | 0.559 | 120 ms | Total size was 2,486 KiB |
| Quiz | mobile | 68 | 100 | 3.6 s | 0.392 | 20 ms | Total size was 674 KiB |
| Home | desktop | 70 | 100 | 1.6 s | 0.868 | 60 ms | Total size was 2,345 KiB |
| Games | desktop | 67 | 100 | 1.6 s | 2.507 | 140 ms | Total size was 855 KiB |

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

- Missing document language: **0**
- Missing main landmark: **637**
- Missing H1: **3**
- Missing skip link: **1038**
- Images missing an alt attribute: **0**
- Form controls missing a detectable label: **0**
- Buttons missing a detectable accessible name: **4**
- Links missing a detectable accessible name: **0**
- Iframes missing a title: **0**
- Positive tabindex values: **0**
- Duplicate IDs: **1**

## Static performance-risk totals

- Images missing intrinsic width or height: **29101**
- Iframes not marked for lazy loading: **43**
- Head scripts without defer or async: **646**
- Duplicate stylesheet references: **0**
- Pages with at least 10 stylesheets: **1659**
- Pages with at least 12 scripts: **1496**
- CSS files above 100 KB: **1**
- JavaScript files above 150 KB: **0**
- CSS outline-suppression declarations: **104**

## Largest repository assets identified

| Asset | Size |
|---|---:|
| `resources/audio/easter-eggs/party.mp4` | 21.34 MB |
| `resources/manuals/The_Music_System_User.pdf` | 10.98 MB |
| `resources/audio/easter-eggs/heman.mp4` | 4.81 MB |
| `arcade/lost-sizzler/assets/audio/music/horde-survival-wave-10.ogg` | 4.14 MB |
| `resources/audio/easter-eggs/press-play.mp4` | 3.97 MB |
| `resources/manuals/The_Image_System.pdf` | 3.94 MB |
| `arcade/lost-sizzler/assets/audio/music/sizzler-saboteurs-theme.ogg` | 3.02 MB |
| `arcade/lost-sizzler/assets/audio/music/horde-survival-waves-5-9.ogg` | 2.97 MB |
| `arcade/lost-sizzler/assets/audio/music/horde-survival-waves-1-4.ogg` | 2.81 MB |
| `resources/audio/easter-eggs/boing.mp4` | 2.37 MB |
| `resources/images/publishers/konami.png` | 2.00 MB |
| `resources/audio/easter-eggs/matrix.mp4` | 1.31 MB |
| `arcade/quest/assets/production/player/cheeky-main-sheet.png` | 1.15 MB |
| `resources/audio/easter-eggs/vhs.mp4` | 0.84 MB |
| `resources/audio/easter-eggs/zx_1.gif` | 0.81 MB |

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
