# Site-wide Lighthouse programme

## Music composer wheel/Lighthouse follow-through — 28 September 2026

- User reported sluggish up/down mouse-wheel response on the deployed `/music/paul-norman/` composer page.
- The full site-wide Lighthouse inventory already discovers `/music/` routes from `sitemap-pages.xml`; Paul Norman is present there and is therefore included in the mobile/desktop Lighthouse sweep. No score is inferred from that coverage alone.
- The native physical-wheel representative matrix did not include a music route. The shared music pages also relied on the broad `ccg-master.css` scroll safety but lacked a music-specific active-scroll performance state for composer-card hover/playing effects.
- Draft PR #2407 / `fix/music-wheel-performance-20260928` starts from main `3d01e4a2db7cb65a77815704608561dd08ad2838`. It keeps native document scrolling, adds a bounded passive music scroll-performance pause, suspends music-card motion only while scrolling, and adds both `/music/` and `/music/paul-norman/` to the real Chromium wheel matrix.
- Public code cache advances from v42 to v43 because shared public CSS/JS changes. Exact-head repository qualification and deployed hands-on confirmation remain required before calling the issue closed.


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
