# Dungeon Carnage startup menu flicker — 17 September 2026

## Scope

New current-main visual/startup defect reported after completion of the seven-item live-defect programme: the large landing/menu buttons briefly paint using the earlier generic button/menu presentation, then change to the intended landing hierarchy during startup.

Base: `a61f73efa29d77b7008dce10fa9de21e637171c5`

Branch: `codex/dungeon-startup-menu-flicker-current-main`

## Reproduction / ownership

The canonical page loads blocking stylesheets in the document head, including `game.css`, `v10-6-gameplay.css`, `v10-41-r28.css` and `v10-41-r29.css`. The later script `v10-41-landing-notification-polish.js` runs from the bottom of the document.

That script's `ensureStyle()` function creates a new `<style>` element at runtime and appends the final landing-page hierarchy rules to `document.head`. Those rules change the menu panel spacing, feature-strip hierarchy, menu form geometry, game-mode grid, button ordering/sizing/shadows/opacity and responsive layout. Because the rules do not exist in blocking CSS, the browser is allowed to paint the earlier generic button/menu state before the script executes and appends the intended styles.

This is a first-paint style sequencing defect, not the retired public-beta watchdog defect.

## Bounded correction

`css/v10-41-r29.css` now contains the same visible landing/menu hierarchy required for initial presentation. It is already a blocking stylesheet in the canonical head, so the first rendered frame receives the intended menu geometry and hierarchy before any body script executes.

The existing runtime polish script is intentionally retained. It may append the same declarations later for compatibility, but those declarations no longer introduce a visible state transition because the user-facing landing state already exists at first paint.

No gameplay state, menu action wiring, save data, supported mode ownership, retired-mode ownership, loader/watchdog logic or game JSON is changed.

## Regression coverage

`tests/v10-42-startup-menu-first-paint.mjs` verifies that:

- `v10-41-r29.css` remains a blocking head stylesheet;
- the blocking stylesheet loads before `v10-41-landing-notification-polish.js`;
- the first-paint menu/grid/button contracts are present in blocking CSS;
- the runtime polish layer still agrees with the blocking declarations for the critical menu hierarchy.

## Qualification

Pending exact-head GitHub Actions on the PR candidate.
