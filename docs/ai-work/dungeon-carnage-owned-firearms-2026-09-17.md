# Dungeon Carnage Defect 6 — Owned Firearms differentiation

Date: 17 September 2026

## Reconciled base

- Live `main` after Defect 4 and the immediately following generated SEO refresh: `32b42045558a37b0052372319dd23bb3a2ae004b`.
- Defect 4 is repository-complete through #2123; diagnostic-only #2122 was closed without merge.
- Defect 5 has no remaining repository-side correction on this base. The merged #2090 owner `v10-42-artefact-shop-stability.js` supports both legacy physical Artefacts and current `banishmentEssence`, preserves Gold/Score, and its current-main browser contract passed in the exact-head #2123 qualification matrix. It remains a deployed hands-on acceptance item.

## Active branch / PR

- Branch: `codex/dungeon-owned-firearms-current-main`
- Base: `32b42045558a37b0052372319dd23bb3a2ae004b`
- Draft PR: #2125
- Defect: Owned Firearms do not communicate meaningful weapon differences.

## Proven root cause

The progression foundation already preserves multiple firearm identities and switching. Weapon identity includes `rating`, `power`, `delay`, `shots`, `pierce`, `element` and mods, and generated weapons can also differ in ammunition cost. However, the existing inventory Owned Firearms selector renders only:

`EQUIP / EQUIPPED · <weapon name>`

This hides the gameplay characteristics needed to understand why one owned firearm differs from another. The ownership/acquisition/switching mechanics themselves do not need replacement.

## Bounded correction

- Added `arcade/lost-sizzler/js/v10-42-owned-firearm-clarity.js`.
- The layer decorates the existing Owned Firearms controls with the firearm data already owned by the runtime: rating, power, fire delay, shot count, ammo cost, pierce, element and mods.
- It preserves the existing button, index and click owner rather than creating a second weapon-selection system.
- It also provides the same summary through the native button title/accessible label.
- Added the layer to the authoritative V10.42 ordered bootstrap without changing unrelated game mechanics.

## Regression

Added `arcade/lost-sizzler/tests/browser/v10-42-owned-firearm-clarity.mjs`.

The browser contract uses a genuine Solo run and the actual inventory renderer, injects two intentionally different owned firearms, and proves:

- both retained firearms are rendered;
- the active firearm remains visibly identified;
- rating/power/delay/shots/ammo/pierce/element/mod differences are visible;
- distinct firearms produce distinct comparison summaries;
- the real existing EQUIP control still switches `activeWeaponIndex` and `p1.weapon`;
- the newly equipped row updates to EQUIPPED;
- no page errors or same-origin script failures occur.

## Scope boundary

No weapon damage, cadence, projectile, rarity, generation, acquisition, inventory ownership, save schema, Gold economy, retired modes, protected intro-loader files, `games/games.json`, Supabase, Cloudflare or commerce configuration is changed.

## Next action

Qualify the exact #2125 head through canonical/Node and sharded Chromium checks plus retained repository workflows. Fix only candidate-attributable failures. If the exact candidate is green, mergeable and review-clean, mark ready and merge under the standing autonomous authorization. After merge, reconcile `main` and continue to Defect 7 terminology reconciliation while retaining Defect 5 as a separate live/manual acceptance item.
