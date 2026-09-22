# Mobile CLS / retro watch-page stability — 22 September 2026

## Trigger

Google Search Console reports a mobile Core Web Vitals group with **43 affected URLs**, group CLS **0.27**, first detected **21 September 2026**. The representative URL is:

`/retro-specials/50-essential-amiga-games/`

This is field data and must not be treated as equivalent to one Lighthouse run, but the URL grouping points at shared retro watch-page/header behaviour rather than a one-page content defect.

## Reconciled baseline

- Implementation base: current `main` at `d0d4130136a94dad884d93de4255217c72345d6c`.
- Read-only diagnostic PR: **#2234** / `codex/mobile-cls-retro-diagnostic`. It adds the Search Console representative route to the existing Phase 8A mobile LCP/CLS harness and changes no public presentation code.
- Existing Phase 8A evidence already identified the shared header/main handoff as a material mobile CLS source on other public routes, including `.ccg-header-actions`, `.ccg-header-socials`, the mobile nav toggle and `main#ccg-main-content`.
- The retro player itself already reserves a 16:9 box in `retro-video-pages.css`; it is not being changed as part of this fix.

## Root-cause path addressed

Two shared first-paint races are bounded here:

1. A cold session can paint `.ccg-auth-slot` empty while authentication is restored, then insert Join/Login or Profile/Logout later. The mobile slot had no reserved block height.
2. Retro watch pages did not directly load the final responsive safety/polish/layout styles. `ccg-responsive-safety.js` added/reordered those styles after DOMContentLoaded, allowing a late responsive-geometry handoff.

## Implementation branch

Branch: `codex/retro-mobile-cls-stability`

The bounded candidate:

- reserves the mobile/tablet auth row at the same height as its resolved controls;
- directly loads `ccg-responsive-safety.css`, `ccg-responsive-page-polish.css` and `ccg-sitewide-layout-optimization.css` from the authoritative retro-video template before first paint;
- preserves the same runtime cascade order used by `ccg-responsive-safety.js`;
- adds a 390×844 browser regression that compares pending, guest and member auth geometry on the Search Console representative retro page;
- regenerates retro pages inside the navigation validation job before that browser audit, so the test exercises the authoritative template output rather than a hand-edited generated page;
- bumps the public code-cache version because shared public CSS changed.

No game data, intro-loader files, Dungeon runtime, routes or video content are changed.

## Qualification / merge gate

Before merge:

1. Read-only #2234 should finish and record the representative route's current layout-shift sources.
2. The implementation PR exact head must pass Navigation Discovery Scroll Validation, Public Code Cache Version, SEO Automation, Site Safety and every other triggered required check.
3. The 390×844 retro browser regression must show no material header/main-top change when auth moves from unresolved to guest or member state.
4. SEO Automation must regenerate the retro family successfully from the authoritative template.
5. Merge still requires explicit user authorization.

## Deployment / Search Console

After an authorized merge, SEO Automation owns materialisation of regenerated retro outputs on `main`. Confirm that generated-output follow-up has landed before using **Validate Fix** in Search Console. Field CLS will then age out over Google's rolling real-user measurement window rather than disappearing immediately.
