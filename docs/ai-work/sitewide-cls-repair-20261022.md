# Site-wide CLS repair — 22 October 2026

Implementation branch: `fix/sitewide-cls-performance-20261022`, targeting `main`. Draft PR: https://github.com/joepentony-dot/ccgamer_website_new/pull/2885 .
Started from fetched main `7c34a8f292f0e1991930dfc7eabb0ca81c799513` and fast-forwarded to `121cfb6d629fbe812d3b39bfc808ca2bf88f2181` before committing. The latter brings the independent emulator-link PRs forward without overwriting their files. All 14 initially open PR file inventories were inspected; shared cache/checkpoint changes need fresh-main reconciliation before release.

## Confirmed causes and repair

- Final responsive CSS arrived after paint and was moved repeatedly at initialization, 120 ms, 600 ms, load, resize and orientation changes. The existing Pages normalizer now emits the existing final stack as ordered active styles, removes owned preload/noscript duplicates, and is idempotent. The legacy runtime only fills missing styles once. Existing canonical game HTML is never regenerated or edited in source.
- Home and game mode-status strips, game breadcrumbs and Home Archive Pulse arrived above visible content. Their actual existing markup is now present initially, with all content/links retained. The existing Archive Pulse randomizer prepares the next visit's catalogue picks asynchronously and applies them during parsing on that visit; the first visit retains real fallback cards. No content is hidden to pass CLS.
- Runtime formatting CSS has moved verbatim into its existing authoritative stylesheet. The duplicate contradictory desktop grid definitions in the responsive polish owner have been consolidated while retaining settled declarations.
- The desktop fixed starfield inherited changing document height. Its negative-percentage ghost layer moved across the viewport as asynchronous sections appeared. The decorative fixed container now explicitly owns viewport height; the existing artwork, opacity motion and mobile rules remain.
- Navigation fitting skips unchanged inputs and retains unchanged More menu nodes. Header height uses ResizeObserver border-box measurements when available, retaining a deferred geometry fallback. Floating navigation no longer measures the whole document merely because an unscrolled window resizes. Shared code cache advances monotonically from v179 to v180.

- Saved Amiga mode was applied to the root in the head but reached the body after paint. A small parser-time bootstrap now applies the already-selected root mode to the body on Home and staged game pages before their content paints.
- Independent PR review caught a height-only resize omission in the fit cache. An open More popover now repositions while retaining its link nodes. The global fallback no longer overwrites the adaptive menu.
- Existing exact-home guards now recognize only the reviewed first-paint additions: exact stylesheet order, exact mode bootstrap/status markup and a hashed real Archive Pulse component. Mutation regressions still reject unrelated content and executable changes. Stylesheet normalizer idempotence now survives later inert SEO enrichment.
- Earlier final CSS exposes an existing secret-modal scroll ownership conflict. The scroll-authority bootstrap and stylesheet now exclude this intentional lock, retain existing inline overflow axes, avoid duplicating a stable scrollbar gutter and reset the visible command list immediately. Wrapper horizontal clipping uses `clip`, preventing a nominally visible vertical overflow from becoming a second scrolling surface.

## Evidence collected so far

Chromium 154.0.8037.57, Node 24.19.0, actual source HTML/CSS/JavaScript and disposable staging. CDP tracing includes screenshot events; layout-shift observers retain source nodes and rectangles; resource timings and header/main geometry are recorded. Local HTTP is throttled at 40 ms / 1.5 MB/s for observer runs. These are local laboratory diagnostics, not live PSI or real-user improvements.

Initial source baseline reproduced severe shifts across all eight requested widths. Home 390px lifetime shift sum was 1.2398; Ace of Aces 960px was 4.1177. These lifetime sums are diagnostic and must not be substituted for Lighthouse's largest-session-window CLS. Preliminary repaired traces reached Home 390px ~0.0035 and desktop ~0.0046; full cold/warm C64/Amiga qualification remains in progress. The new browser gate uses the proper CLS session window and stops above 0.10.

- Exact original seven-block Pages staging passed: 666 canonical games, 563 C64 / 103 Amiga, 451 source and staged C64 buttons, zero SEO/media release blockers; both owning media checks passed. Existing editorial warnings were preserved, not corrected or suppressed. A third complete run also passed after the saved-mode and SEO-idempotence corrections. A final JavaScript-only lock correction still requires current-head staging/CI.
- Existing Header First-Frame Stability passed. Existing responsive browser audit passed all 52 checks (13 pages × four widths), zero overflow/overlap/navigation errors. Site Safety passed with zero errors/warnings. Mode engine audio/state runtime passed.
- Relevant broad Node suite: 207/209 passed. The two failures in the untriggered historical `single-game-compact-layout.test.mjs` also reproduce on a pristine current-main worktree: retired CCG Picks markup and a hard-coded September cache v23. No assertions have been weakened and no retired affiliate feature has been restored.
- Source/staged parity Python regressions: 16 passed. Game performance contract: all 666 passed. PWA install/visible audits passed in their existing CI mode; the unchanged reload browser test passed stale-code rejection and recovery from a stalled network (~7.05 s).
- Network policy blocks Google Fonts, GoatCounter and production auth/API hosts in this executor. Record this limitation alongside local results. Live fonts, signed-in production behavior and post-deployment field metrics are not qualified by these local runs.

## Release gates

The first pushed head exposed five genuine CI regressions (mode/home guard compatibility, SEO idempotence, saved-mode first paint and secret-modal positioning); each is being corrected within this PR. Keep the PR draft until the complete current-head cold/warm matrix, Lighthouse before/after, relevant browser/source/SEO/publishing/PWA checks and independent review have passed. A 768px warm-cache failure was caught and corrected during development; earlier partial passing runs do not qualify the final head. The existing measured Music audit also requires diagnosis/qualification before readiness.

Never merge on old-head checks or deploy from this branch. Refresh main, reconcile cache/checkpoint conflicts without force, require current-head relevant CI and independent review, and only then request merge. After an approved merge, the existing Omega Stable Pages workflow alone stages and publishes the repair; verify deployed SHA and live Home/game behavior separately. The protected intro stack and games/games.json remain byte-identical to main.

## Continuation checkpoint — 24 October 2026

- Branch remains `fix/sitewide-cls-performance-20261022`; latest main `4a239c3cc` was merged normally at `d49a8438a`, and the repair commit is `95f0764ac`. Existing GitHub PR #2885 was reopened on this same branch; no replacement PR exists.
- Preserved main's visitor metrics runtime and merged #2886/#2889 counter fixes, retained the no-inline-credential path, and advanced the service-worker code cache from main v184 / checked continuation v200 to v201.
- Implemented additive repairs for mobile secret-menu scroll restoration, cloned-header mobile drawer binding/double-click prevention, and Browse Games first-wheel latency (idle enhancement, scoped decorative pause, no hero blur). Existing assertions were retained; new source guards cover the repairs.
- Checks run: JavaScript syntax checks; `node --test` focused CLS, navigation, archive, GoatCounter, Fourthwall, games-library, header, music, publishing-normalizer and Lighthouse-protocol suites — 84 passed; `git diff --check` passed. Full browser shards, Lighthouse and GitHub Actions remain required; no merge or deployment claim.
- After the checkpoint commit is pushed, let Actions qualify the exact head and obtain independent review before any merge decision; current early results are green for audit, first-paint, cache version, refresh, itch.io package and one validation job, with the remainder pending.
