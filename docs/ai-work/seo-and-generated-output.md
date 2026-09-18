# SEO and generated output

## Scope

Automated SEO/video metadata and generated pages, game/archive output, sitemaps, video library output, and generation validation. Generated artifacts must be changed through their intended generator/workflow unless a documented exception applies.

## Single-game presentation / SEO checkpoint — 2026-09-18

- Live `main` at branch creation: `20ce570a25fcf9ae658539c1f73494f237266d92` (`Add Road Rash via CCG Content Publisher`).
- PR **#2146**, branch `codex/single-game-premium-layout-seo`, completed qualification and merged as `50a527599b9521e07ec2c593703fcf7fc26858fb`.
- Shared owners changed: `resources/css/game-pages.css`, `js/load-single-game.js`, `games/game.html`, `scripts/prepare-seo-game-routes.js`, `scripts/generate-slug-pages.js`, plus `tests/single-game-premium-layout.test.mjs`.
- The shared layout now uses one compact desktop content frame, tighter hero/section spacing, a generated available-section jump navigator, smaller gallery/related presentation, and a mobile identity-first hero. The existing mobile scroll/overflow stability ownership in `games.css` was not changed.
- Canonical route generation now reserves actual thumbnail dimensions when available, avoiding the previous hard-coded `320x180` hero ratio on portrait artwork.
- Generated search/social titles now include release year where present and normalize the platform label to `C64` or `Amiga`.
- The shared template preconnects the Google Fonts origins.
- Static source-contract validation passed for the changed JavaScript, generator, template, layout and regression-test patterns before the PR was opened.
- Production observation: `/games/road-rash/` returned HTTP 404 during this session because the canonical generated route had not yet been published after the new source entry. A meaningful live Lighthouse score for that exact route must wait until the publishing route exists; do not hand-edit the generated page to bypass the workflow.

### Next action

1. Treat #2146 as merged and repository-complete for shared individual-game presentation/SEO ownership.
2. Keep generated game pages workflow-owned; regenerate them through Reliable Games Publishing rather than editing canonical outputs by hand.
3. Real Lighthouse/PageSpeed measurements remain a live-site observation task where required; do not invent scores from source-level inspection.

## Site-wide public layout follow-up — 2026-09-18

- PR **#2167** superseded the earlier #2158/#2165 layout candidates and merged as `9cdc9aa8415ae83201704d139feedc97bf215ccd`.
- Exact qualified head: `790885738ca67938f26ce683cf3c319de55feda2`.
- The public density pass covers the main archive, category, editorial/video and information page families through scoped `data-ccg-page` selectors in `resources/css/ccg-master.css`; genre/developer detail pages participate only in the shared frame/rhythm rules while retaining their dedicated hero ownership.
- Home, single-game, quiz, admin, community-auth and arcade/game runtimes remain outside the generic rules.
- The candidate retained `2026-09-18-public-code-v7` and reconciled Easter Egg viewport/WARP/E6 catalogue tests against the live catalogue without weakening protected-file or ±2px scroll-preservation assertions.
- The final viewport harness records Chromium's physically reachable mobile bottom before applying the unchanged ±2px modal open/close preservation requirement.
- Exact-head qualification passed CCG Site Safety, SEO, PWA, navigation, Easter Egg E3/viewport/WARP/E6 and all six Lost Sizzler Chromium shards.
- Regression contract: `tests/sitewide-public-density.test.mjs`.
- Older PR #2156 is closed as superseded.

## Site-wide page quality / discovery follow-up — 2026-09-18

- Stale PR #2151 was re-derived onto current main rather than merged from its 80-commit-behind ancestry.
- Fresh PR **#2170** on `codex/sitewide-page-quality-current-main` merged as `a3c06e47857223cf9d155899b3204e6bc881b2d3` from exact qualified head `3d4c6440ce2dd561f09edc5c6f0489ec6fef7634`.
- Scope is limited to About, Contact, Emulation, Install App, Quiz, Community Hub and Find Me a Game plus `tests/sitewide-page-quality.test.mjs`.
- Missing robots/social-preview metadata, appropriate WebPage/AboutPage/ContactPage/CollectionPage schema, breadcrumbs and selected Google Fonts preconnects were added without changing layouts.
- Install App retains its existing HowTo schema.
- The protected Home dual-hero preload behavior was deliberately retained; the stale experimental single-mode preload assumption from #2151 was not carried forward.
- Exact-head qualification passed Site Safety, Structured Data Validation, Social Metadata Validation, SEO Automation, Quiz/Retro Collections, PWA, navigation, year/platform and mouse-wheel contracts.
- #2151 is closed without merge as superseded.
- Generated SEO/video automation subsequently advanced main through #2169/`b770680575ea2289db8db64cefced9ac80ca867a` before #2170 was rebuilt and merged.

## Verified checkpoint — 2026-09-16

This workstream has two current generated-output scopes that must not be conflated:

- **Game/archive publication output:** merged #2109, **Publish generated game archive output**, from Reliable Games Publishing run `35076710872` remains the authoritative game/archive publication result.
- **SEO/video-page generated output:** merged #2111, commit `f748968c7ccdf139b29ab1eaa92868712fbf2095`, **Auto-update generated SEO and video pages**, is the newest merged SEO/video-page automation result observed during the post-#2104 reconciliation.

Continuation/governance merge #2104 later advanced `main` to `8a2e72f4425973e3ce6756ae6c8365378dc63b34` without changing generated-output ownership. Always re-check live `main` before acting because later automation may advance these checkpoints.

### Retired stale generated-output PRs

| PR | Classification | Current state |
| --- | --- | --- |
| #2107 | **SUPERSEDED GAME/ARCHIVE GENERATED OUTPUT** by newer merged #2109 | Closed without merge |
| #1759 | **STALE SEO GENERATED OUTPUT** from August | Closed without merge |
| #1752 | **STALE SEO GENERATED OUTPUT** from August | Closed without merge |

The older #2101 SEO/video generation result was valid when produced but is no longer the latest SEO/video-page checkpoint. Current generated-output decisions must start from the relevant current source-of-truth and current workflows, not any retired automation branch.

## Guardrails and next action

Before modifying generated output, identify its producing workflow/script and run the relevant validation. Preserve canonical generated files as a set; do not reopen or cherry-pick individual artifacts from retired automation PRs merely because their commits remain in Git history.

There is no current generated-output integration candidate requiring manual action. Future generated changes should be produced by the current authoritative automation from current source data.

## Session log

- 2026-09-16: Initial checkpoint classified #1752/#1759 as stale relative to then-current #2101 output.
- 2026-09-16: Live re-audit found newer merged #2109 and classified #2107 as superseded; #2107/#1759/#1752 were closed without merge.
- 2026-09-16: Post-#2104 reconciliation identified merged #2111 as the newer SEO/video-page automation result while preserving #2109 as the separate authoritative game/archive publication result.
