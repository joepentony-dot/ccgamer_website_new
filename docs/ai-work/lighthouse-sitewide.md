# Site-wide Lighthouse programme

## Authority

The user-supplied Lighthouse reports from **25 September 2026** for the public Home page remain the first measured baseline for this programme. They are evidence for the initial Home CLS/render-blocking/image-delivery work, but they must not be treated as representative of every other page.

## Required coverage

1. Build the URL inventory from the repository's public child sitemaps.
2. De-duplicate identical canonical URLs that appear in more than one sitemap.
3. Give every resulting public URL its own Lighthouse run in **mobile and desktop** modes.
4. Keep raw Lighthouse JSON for every run so page-specific diagnostics are preserved.
5. Aggregate results by page family and rank the worst pages for:
   - performance score;
   - LCP;
   - CLS;
   - TBT;
   - total transferred bytes.
6. Use the aggregate report as the remediation queue. Fix shared template/runtime causes before repeating identical fixes page-by-page.
7. Re-run the affected pages after each repair and periodically repeat the complete sweep so regressions on less-frequently visited pages are not missed.

## Execution model

The workflow is intentionally diagnostic. Weak Lighthouse scores do not fail unrelated development. Syntax, URL inventory breadth and execution failures are still treated as tooling defects.

Pull requests that change the sweep tooling qualify the scripts and safety contracts without running the expensive full matrix. The complete public-site sweep runs automatically when the Lighthouse tooling is merged to `main`, and thereafter remains available by manual dispatch plus the weekly schedule. It is split into deterministic mobile and desktop shards with bounded parallelism.

## Safety

- No Intro loader files are touched.
- No game database mutation is performed.
- Lighthouse evidence is read-only against the public website.
- Optimisation changes remain isolated PRs with normal repository qualification.
- The existing Home mobile/desktop reports are a baseline, not a ceiling or a substitute for page-specific measurements.

## Full public-site baseline — 26 September 2026

Authoritative GitHub Actions run: `36247886947` at main `9fd3f08e9145aee78f9d86384f1c70ab2d87ad97`.

- Unique public canonical routes: **1,053**
- Lighthouse runs: **2,106** (**1,053 mobile + 1,053 desktop**)
- Audit errors: **0**
- Desktop median performance: **68**
- Desktop P75 LCP: **1,757 ms**
- Desktop P75 CLS: **1.939**
- Desktop P75 TBT: **144 ms**
- Mobile median performance: **51**
- Mobile P75 LCP: **6,756 ms**
- Mobile P75 CLS: **0.785**
- Mobile P75 TBT: **535 ms**

The largest shared problem family is the individual-game archive: 663 routes, mobile median performance **44**, mobile P75 LCP **7,290 ms**, mobile P75 CLS **0.813**, mobile P75 TBT **624 ms**. Genre and collection families are the next major archive targets. Video-library first-paint hydration, generated thumbnail sizing, Home thumbnail delivery, single-game first-paint CSS, global header measurement and non-Home search reservation are being handled as isolated evidence-backed corrections.

The aggregate artifact is `ccg-sitewide-lighthouse-aggregate` from run `36247886947`. Use the raw per-page evidence when choosing the next correction; do not infer that one page-family repair fixes all routes.

### Current remediation order

1. Individual-game render-blocking, hydration and CLS owners.
2. Genre / collection first-paint hydration and image/card stability.
3. Shared header first-frame search/layout stability and forced reflow.
4. Publisher/year/platform archive family CLS and mobile LCP.
5. Retro/video/media outliers.
6. Repeat the complete matrix after the shared-family fixes land, then rank residual outliers again.
