# Dungeon Carnage startup menu flicker — 17 September 2026

## Scope

New current-main visual/startup defect reported after completion of the seven-item live-defect programme: the large landing/menu buttons briefly paint using the earlier generic button/menu presentation, then change to the intended landing hierarchy during startup.

Base: `a61f73efa29d77b7008dce10fa9de21e637171c5`

Branch: `codex/dungeon-startup-menu-flicker-current-main`

PR: #2127

Merged main: `9e60618169f24900e6b8cd38d17a87d01079ca6f`

## Reproduction / ownership

The canonical page loads blocking stylesheets in the document head, including `game.css`, `v10-6-gameplay.css`, `v10-41-r28.css` and `v10-41-r29.css`. The later script `v10-41-landing-notification-polish.js` runs from the bottom of the document.

That script's `ensureStyle()` function creates a new `<style>` element at runtime and appends the final landing-page hierarchy rules to `document.head`. Those rules change the menu panel spacing, feature-strip hierarchy, menu form geometry, game-mode grid, button ordering/sizing/shadows/opacity and responsive layout. Because the rules did not exist in blocking CSS, the browser was allowed to paint the earlier generic button/menu state before the script executed and appended the intended styles.

This was a first-paint style sequencing defect, not the retired public-beta watchdog defect.

## Bounded correction

`css/v10-41-r29.css` now contains the same visible landing/menu hierarchy required for initial presentation. It is already a blocking stylesheet in the canonical head, so the first rendered frame receives the intended menu geometry and hierarchy before any body script executes.

The existing runtime polish script is intentionally retained. It may append the same declarations later for compatibility, but those declarations no longer introduce a visible state transition because the user-facing landing state already exists at first paint.

No gameplay state, menu action wiring, save data, supported mode ownership, retired-mode ownership, loader/watchdog logic or game JSON was changed.

## Regression coverage

`tests/v10-42-startup-menu-first-paint.mjs` verifies that:

- `v10-41-r29.css` remains a blocking head stylesheet;
- the blocking stylesheet loads before `v10-41-landing-notification-polish.js`;
- the first-paint menu/grid/button contracts are present in blocking CSS;
- the runtime polish layer still agrees with the blocking declarations for the critical menu hierarchy.

## Qualification and merge

Exact candidate head `b4cc2211a46ed0568c4da4c3c0f678706f45d9c4` passed:

- Public Code Cache Version;
- Native Mouse Wheel Scroll Contract;
- SEO Automation;
- CCG Site Safety;
- Lost Sizzler Load Safety, including Canonical structure and Node contracts, Chromium manifest discovery and all six Chromium shards.

PR #2127 then merged to `main` as `9e60618169f24900e6b8cd38d17a87d01079ca6f`.

## Next gate

The next authorised product task remains the existing Defect 5 deployed/manual acceptance gate. Repository-side implementation and automated coverage are already complete; do not reopen that code without new deployed evidence. The required human check is the three-Artefact/Essence Banishment Flask exchange without first buying the Gold Flask, confirming exactly one Flask is received and Gold/Score are unchanged.
