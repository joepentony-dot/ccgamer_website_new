# Mobile CLS / retro watch-page stability — 22 September 2026

## Trigger

Google Search Console reports a mobile Core Web Vitals group with **43 affected URLs**, group CLS **0.27**, first detected **21 September 2026**. The representative URL is:

`/retro-specials/50-essential-amiga-games/`

This is field data and must not be treated as equivalent to one Lighthouse run, but the URL grouping points at shared retro watch-page/header behaviour rather than a one-page content defect.

## Reconciled baseline

- Original implementation base: `main` at `d0d4130136a94dad884d93de4255217c72345d6c`.
- Current-main reconciliation: #2235 is now based on `7a64fbef9e2d0d84f0326d6f36a95fa3e9f97f23` after merged #2236. The only overlapping paths were `docs/AI-CONTINUATION-STATE.md` and `service-worker.js`; the service-worker content/cache version was already identical, and the continuation index was merged so the mouse-wheel checkpoint remains intact.
- The first reconciled exact-head run exposed one stale navigation test inherited from `main`: it still required `/games/ccg-games/` to link directly to Commodore Quest even though merged #2232 intentionally puts the originals into maintenance and removes that link. The regression now asserts the current maintenance hub contract (Trivia + Hangman links, no direct Quest link) without changing any production routing or weakening CLS coverage.
- The same reconciled run showed that current `main` had already consumed public-code cache namespace `2026-09-22-public-code-v2`. Because #2235 changes cacheable shared CSS, its branch now advances `CODE_CACHE_VERSION` to `2026-09-22-public-code-v3`; this is a cache namespace change only.
- Read-only diagnostic PR: **#2234** / `codex/mobile-cls-retro-diagnostic`. Its completed evidence run on current main measured the representative retro route at browser CLS **0.944** and Lighthouse CLS **0.743** under the deterministic 390×844 throttled profile. This is lab evidence rather than Search Console field CLS, but it reproduced a severe shared layout shift.
- Existing Phase 8A evidence already identified the shared header/main handoff as a material mobile CLS source on other public routes, including `.ccg-header-actions`, `.ccg-header-socials`, the mobile nav toggle and `main#ccg-main-content`.
- The retro player itself already reserves a 16:9 box in `retro-video-pages.css`; it is not being changed as part of this fix.

## Root-cause path addressed

Three shared first-paint races are bounded here:

1. A cold session can paint `.ccg-auth-slot` empty while authentication is restored, then insert Join/Login or Profile/Logout later. The mobile slot had no reserved block height.
2. The mode identity strip (`aside#ccgModeIdentityBar`) was created only after DOMContentLoaded. #2234 ranked it among the strongest representative-route shift sources (browser source value 0.817), alongside `main#ccg-main-content` (0.864), `.ccg-header-actions` (0.781) and `header.ccg-header` (0.396). The retro template now emits that strip statically and loads its CSS before first paint; the existing mode-identity runtime reuses and updates it instead of creating a second bar.\n3. Retro watch pages did not directly load the final responsive safety/polish/layout styles. `ccg-responsive-safety.js` added/reordered those styles after DOMContentLoaded, allowing a late responsive-geometry handoff.

## Implementation branch

Branch: `codex/retro-mobile-cls-stability`

The bounded candidate:

- reserves the mobile/tablet auth row at the same height as its resolved controls;
- emits the mode identity strip statically and directly loads `ccg-mode-identity.css` before first paint;\n- directly loads `ccg-responsive-safety.css`, `ccg-responsive-page-polish.css` and `ccg-sitewide-layout-optimization.css` from the authoritative retro-video template before first paint;
- preserves the same runtime cascade order used by `ccg-responsive-safety.js`;
- adds a 390×844 browser regression that compares pending, guest and member auth geometry on the Search Console representative retro page;
- regenerates retro pages inside the navigation validation job before that browser audit, so the test exercises the authoritative template output rather than a hand-edited generated page;
- bumps the public code-cache version because shared public CSS changed.

No game data, intro-loader files, Dungeon runtime, routes or video content are changed.

## Qualification / merge gate

Before merge:

1. Read-only #2234 should finish and record the representative route's current layout-shift sources.
2. The reconciled implementation PR #2235 exact head must pass Navigation Discovery Scroll Validation, Public Code Cache Version, SEO Automation, Site Safety and every other triggered required check.
3. The 390×844 retro browser regression must show no material header/main-top change when auth moves from unresolved to guest or member state.
4. SEO Automation must regenerate the retro family successfully from the authoritative template.
5. Merge still requires explicit user authorization.

## Deployment / Search Console

After an authorized merge, SEO Automation owns materialisation of regenerated retro outputs on `main`. Confirm that generated-output follow-up has landed before using **Validate Fix** in Search Console. Field CLS will then age out over Google's rolling real-user measurement window rather than disappearing immediately.
