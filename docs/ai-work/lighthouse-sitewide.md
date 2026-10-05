# Site-wide Lighthouse programme

## Site-wide remediation + permanent protocol — 5 October 2026

- User supplied 12 Lighthouse JSON reports covering Home, Games, Collections, Summer Games, Retro Events and Music in desktop/mobile modes. The evidence shows the site is not at its performance ceiling: repeated large CLS, mobile LCP delays, heavy third-party/video work, image-delivery waste and short static cache lifetimes remain.
- Active performance vehicle: draft PR **#2512** / `codex/sitewide-performance-pass-1`. The first guarded batch removes the scripted-mobile expanded-nav first frame and schedules consented Google Analytics away from first paint while preserving the settled Omega design and typography. The dedicated first-paint qualification is green; all normal repository checks still govern merge.
- A flaky Native Mouse Wheel attempt reached and passed Home, Games, single-game, Genres, Publishers, Collections, discovery, Music and Videos before timing out waiting for the unchanged Zzap archive ready boundary. It is being retried unchanged; no wheel assertion or timeout was weakened.
- The owner explicitly requires future website work and newly published games to obey a permanent Lighthouse non-regression rule. `docs/LIGHTHOUSE-PERFORMANCE-PROTOCOL.md` is now the repository contract, and `AGENTS.md` requires it before public-site changes.
- New-game publishing is being hardened in the same performance workstream: newly published thumbnails must be WebP, the browser optimiser targets 350 KB with a 500 KB hard limit, 3D boxes retain WebP with a 500 KB hard limit, the changed-thumbnail repository budget is tightened to the same ceiling, and the authoritative rebuild/Reliable Games Publishing chain runs `validate-game-performance-contract.mjs`.
- New source-level CI `CCG Lighthouse Performance Protocol` is a hard guard for known regression classes. The complete site-wide Lighthouse matrix remains the broad live-site diagnostic sweep; numeric release thresholds will be tightened from fresh post-remediation evidence rather than manufactured by degrading the site.
- Visual contract remains absolute: do not remove the Omega presentation, Orbitron/Roboto identity, effects, modes, artwork or useful functionality simply to increase a lab score.


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

The complete site-wide Lighthouse matrix is intentionally the broad diagnostic sweep rather than a blanket score gate for every unrelated pull request. Syntax, URL inventory breadth and execution failures remain tooling defects.

Known regression classes are now enforced separately by the permanent `CCG Lighthouse Performance Protocol` source/publishing guard. Public-site development must pass that contract even when the full multi-page matrix is not run pre-merge. The complete public-site sweep runs automatically after relevant shared changes reach `main`, and remains available by manual dispatch plus the weekly schedule. It is split into deterministic mobile and desktop shards with bounded parallelism.

## Safety

- No Intro loader files are touched.
- No game database mutation is performed.
- Lighthouse evidence is read-only against the public website.
- Optimisation changes remain isolated PRs with normal repository qualification.
- The existing Home mobile/desktop reports are a baseline, not a ceiling or a substitute for page-specific measurements.
