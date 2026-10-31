## 31 October 2026 — genre banner image priority (BRANCH ONLY)

- Completed site-wide Lighthouse 41160741115: 1306 routes x 2, 0 errors; mobile median 71, P75 LCP 6612 ms. Genre mobile median 47, P75 LCP 8933 ms, P75 CLS 0.402. Raw role-playing genre attributed ~0.048 CLS to its above-fold banner; dominant genre CLS is caused by webfont swaps and is NOT fixed here.
- Sole new active performance workstream `fix/category-hero-lcp-priority-20261031` changes only first-viewport genre image loading hints via the authoritative category generator, 15 corresponding HTML pages and Category Omega tests. Negative controls: all 15 lacked explicit eager/high hints; candidate changes exactly one banner tag per page and is idempotent. No card loading, artwork, URLs, intro or styling changed. Require exact-head CI and real mobile/desktop performance/CLS acceptance before merge; do not infer a score gain.
- Generated publishing #2963 remains parked on its non-waived Codex receipt release gate, Amazon #2957 on account confirmation and Dungeon #2958 on high-risk/Windows acceptance. **OWNER WAIVER — WINDOWS MANUAL ACCEPTANCE NOT PERFORMED.** Commercial Windows release HOLD.

# Site-wide Lighthouse programme

## 31 October 2026 — canonical game-video poster duplicate transfer (BRANCH ONLY)

- Fresh 30 October mobile Lighthouse shard `13016661277` from site-wide run `41134029080` showed the canonical Doriath game page loading YouTube `maxresdefault.jpg` (~375 KB transfer) for a 368px facade, while the shared `js/load-single-game.js` runtime then rewrites the same image to `hqdefault.jpg`. The SEO generator reused full-resolution VideoObject metadata as the small facade `src`; this is an evidenced duplicate-request and image-delivery defect, not proof of an overall mobile LCP improvement.
- Existing Amazon #2957 remains account-acceptance BLOCKED; Dungeon #2958 remains high-risk/Windows PARKED. The one ACTIVE website implementation is draft **PR #2962**, `fix/sitewide-game-video-facade-poster-20261031`, based on main `4730c38813e98cbfd68f12580344632765479f1c`. It changes only `scripts/generate-video-seo.js` and `tests/game-video-facade-performance.test.mjs` plus this checkpoint: both existing and newly created visible facades use the runtime's 480px `hqdefault.jpg`, while VideoObject and video sitemap preserve original metadata thumbnails. Six source-executed preflight checks passed; exact-head Actions/Chromium and a regenerated-site/mobile Lighthouse comparison are **NOT YET QUALIFIED**.
- Next: check exact latest-head CI and existing native protections, reconcile main if needed, guarded squash merge only when eligible; regenerate canonical game pages through the owning publisher (not hand edits), then verify public poster requests, video/SEO retention and repeat representative mobile/desktop Lighthouse. Do not mark LIVE or claim score improvement without those receipts.


## Video facade reconciliation onto public cache v128 — 14 October 2026

- Existing draft PR **#2719** remains the sole performance integration vehicle. Current main at reconciliation: `aea758ccdc3c789ac6de6410c34aa5b0ee57a99f` with cache `2026-10-14-public-code-v128`, including merged game SEO #2717 and all recent C64 emulator changes. Since old PR base `762342ee887205e912828eef17b3852605e5505e`, the only overlapping path is `service-worker.js`; all other 12 intended performance files remain source-exclusive to this PR.
- The reconciled candidate is built from the exact current main tree and 13 intended PR source files, with the shared service-worker cache advanced monotonically to `2026-10-14-public-code-v129`. No public release logic, protected intro, game JSON, emulator or unrelated generated page is reverted.
- The earlier 30/30 green CI, resolved review threads and review feedback apply to the PRIOR PR head and do not qualify this new merge head. Repeat all triggered exact-head CI and Codex review. The draft remains unmerged until the poster-to-player interaction and offsite action are visually verified at representative desktop/mobile widths, wheel/keyboard/pointer interaction remains usable, and measured Lighthouse comparison has no unacceptable regression. Owner merge approval is still required.

## Deferred video facade — current-main reconciliation, 13 October 2026

- Current performance candidate: **draft PR #2719**. The original exact head `7a678b35df4c93b0d0712d7f9fda8496f03686ce` passed **21/21 GitHub Actions workflows** (including dedicated Lighthouse protocol, first paint, native physical-wheel Chromium, Site Safety, SEO and publishing); independent Codex review on that exact head completed with **no major findings**.
- Subsequently, `main` advanced to `762342ee887205e912828eef17b3852605e5505e` and public cache namespace **v125**. A new bounded 13-file source-equivalent candidate was reconstructed on that `main` (the only overlap since old base was `service-worker.js`); it preserves all previously reviewed video/player/SEO/CSS/test changes, and only updates the public cache version to **v126**, without overwriting the new emulator, SEO and website files.
- The previously reported P1 legacy iframe generator closer issue and hidden-iframe CSS-specificity issue remain guarded by focused regression tests. New-head automated qualification and fresh independent review must be checked; the original green verdict does **not** automatically extend to the rebased commit.
- GitHub reports a Cloudflare **branch preview** for the previous exact head; network/browser access to live preview from this review environment was unavailable. Desktop/mobile visible playback, offsite video action and non-YouTube override manual acceptance remain **unverified**. The source-level protocol is **not** a real before/after Lighthouse speed measurement. No performance uplift is claimed, and no source or generated output has yet been merged/deployed from this performance PR.
- Release gating: do not merge without current-head green CI, independent code review, browser-visible playback acceptance, comparison to then-current main and owner approval. On a qualified mainline merge, ensure authoritative publishing/SEO generators upgrade existing static canonical game pages; then run measured desktop/mobile representative and site-wide Lighthouse audits.


## Performance pass 2 — refreshed on current main, 6 October 2026

- Pass 1 merged through PR #2512.
- The original Pass 2 branch/PR #2517 became stale after substantial mainline Dungeon and website activity and is not the merge vehicle.
- Fresh branch `codex/sitewide-performance-pass-2-video-facade-v2` is rebuilt from the current main. It preserves the current Omega single-game presentation while replacing the initial YouTube iframe payload with a poster/play facade. The YouTube player is created only after an explicit click.
- Canonical video generation now writes `data-video-src` instead of an eager iframe `src`, retains video structured data/sitemap ownership, and upgrades older iframe-only canonical markup idempotently.
- External non-YouTube video overrides retain their explicit iframe source and suppress the YouTube facade.
- The native mouse-wheel qualification deliberately clicks the facade before checking the existing post-play iframe wheel shield, so deferred loading does not weaken the scrolling contract.
- This pass targets the multi-megabyte initial YouTube transfer identified in the supplied Lighthouse reports; it does not remove the video section, direct YouTube link, artwork, typography or Omega effects.

## Site-wide remediation + permanent protocol — 5 October 2026

- User supplied 12 Lighthouse JSON reports covering Home, Games, Collections, Summer Games, Retro Events and Music in desktop/mobile modes. The evidence shows the site is not at its performance ceiling: repeated large CLS, mobile LCP delays, heavy third-party/video work, image-delivery waste and short static cache lifetimes remain.
- Active performance vehicle: draft PR **#2512** / `codex/sitewide-performance-pass-1`. The first guarded batch removes the scripted-mobile expanded-nav first frame and schedules consented Google Analytics away from first paint while preserving the settled Omega design and typography. The dedicated first-paint qualification is green; all normal repository checks still govern merge.
- A flaky Native Mouse Wheel attempt reached and passed Home, Games, single-game, Genres, Publishers, Collections, discovery, Music and Videos before timing out waiting for the unchanged Zzap archive ready boundary. It is being retried unchanged; no wheel assertion or timeout was weakened.
- The owner explicitly requires future website work and newly published games to obey a permanent Lighthouse non-regression rule. `docs/LIGHTHOUSE-PERFORMANCE-PROTOCOL.md` is now the repository contract, and `AGENTS.md` requires it before public-site changes.
- New-game publishing is being hardened in the same performance workstream: newly published thumbnails must be WebP, the browser optimiser targets 350 KB with a 500 KB hard limit, 3D boxes retain WebP with a 500 KB hard limit, the changed-thumbnail repository budget is tightened to the same ceiling, and the authoritative rebuild/Reliable Games Publishing chain runs `validate-game-performance-contract.mjs`.
- New source-level CI `CCG Lighthouse Performance Protocol` is a hard guard for known regression classes. The complete site-wide Lighthouse matrix remains the broad live-site diagnostic sweep; numeric release thresholds will be tightened from fresh post-remediation evidence rather than manufactured by degrading the site.
- Visual contract remains absolute: do not remove the Omega presentation, Orbitron/Roboto identity, effects, modes, artwork or useful functionality simply to increase a lab score.
- Current shared game-video generation still materialises the established lazy iframe `src`; Pass 1 no longer falsely blocks the whole catalogue for that pre-existing behaviour. A click/deferred video facade remains a subsequent shared optimisation so one generator/runtime repair can improve existing and future game pages together.


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
