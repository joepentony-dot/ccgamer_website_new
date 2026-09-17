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
- Latest engineering candidate before checkpoint-only documentation commits: `a677127d97501f183fab503f44b36a2315a2048a`.

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

The first exact-head matrix exposed a test-ownership defect rather than a gameplay defect: the regression populated `#inventory-panel` through `renderInventoryPanel()` while the real overlay remained hidden, then Playwright correctly refused to click the hidden EQUIP control. Commit `a677127d97501f183fab503f44b36a2315a2048a` corrected only the regression so it opens the real inventory through the supported live `TAB` command, waits for the actual panel/control to be visible, and then performs the genuine EQUIP click. No forced click, direct handler invocation, assertion removal or timeout inflation was used.

## Qualification evidence

- Initial #2125 exact-head canonical/Node and discovery jobs passed.
- Initial Chromium shard 4 failed only because the new regression attempted to click its correct EQUIP element while the inventory overlay was still hidden.
- Chromium shard 3 separately failed the pre-existing deterministic browser-stability contract during early Solo/Tutorial startup; all other shard-3 contracts passed. The Defect 6 production layer is confined to inventory rendering/decorating and does not own menu/start transitions, so gameplay was not changed to address this unrelated startup instability.
- On engineering head `a677127d97501f183fab503f44b36a2315a2048a`, canonical/Node and contract discovery passed again and Chromium shard 4 passed with the corrected real `TAB -> visible inventory -> EQUIP` route. Chromium shard 5 also passed while the remaining shards were still running when this checkpoint was written.
- A final exact-head qualification is required after these checkpoint-only documentation commits. Merge only if required checks are green, the PR remains mergeable/review-clean, and no new candidate-attributable failure appears.

## Scope boundary

No weapon damage, cadence, projectile, rarity, generation, acquisition, inventory ownership, save schema, Gold economy, retired modes, protected intro-loader files, `games/games.json`, Supabase, Cloudflare or commerce configuration is changed.

## Next action

Qualify the final documentation-inclusive #2125 head through canonical/Node and sharded Chromium checks plus retained repository workflows. Fix only candidate-attributable failures. If the exact candidate is green, mergeable and review-clean, mark ready and merge under the standing autonomous authorization. After merge, reconcile `main` and continue to Defect 7 terminology reconciliation while retaining Defect 5 as a separate live/manual acceptance item.
