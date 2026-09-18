# Dungeon Carnage startup first-visual remediation — 18 September 2026

## Scope

This record closes the repository-side startup/first-visual flicker work for C64 Dungeon Carnage.

Runtime PR: #2145 — `Stabilize Dungeon Carnage first visual load state`

Qualified exact head: `432af71f6d19612a54e274f9114c6b3ef35e7450`

Merge commit: `4c56d2bccd73350359c8b3246b0d70142894d353`

Branch: `codex/dungeon-startup-first-visual-current-main`

## Proven root cause

The earlier #2127 correction put the landing hierarchy into blocking CSS, but the release loader itself still did not own first paint.

`version-check.js` loaded the V10.36 bootstrap after the body existed. That bootstrap then loaded the release-loader CSS and created `#ccg-release-loading` dynamically. The browser could therefore expose:

`menu → dynamically appearing loader → settled/recoloured menu`

The retained R55 compatibility owner also applied final button text presentation later in startup, making the briefly visible pre-loader menu capable of changing presentation before reveal.

This was a startup ownership problem, not a reason to add a delay.

## Merged correction

#2145 keeps the correction bounded to:

- `arcade/lost-sizzler/index.html`;
- `arcade/lost-sizzler/css/v10-42-startup-first-visual.css`;
- `arcade/lost-sizzler/tests/v10-42-startup-first-visual-state.mjs`;
- `arcade/lost-sizzler/tests/browser/v10-42-startup-first-visual-state.mjs`.

The release loader now exists in the original HTML before the game shell, its existing V10.36 stylesheet is render-blocking in the document head, and the visible R55 button presentation is present before the loader reveals the menu. The existing V10.36 runtime adopts the canonical loader instead of inserting a second one.

No artificial startup delay was added. No world generation, combat, progression, save, shop/economy, Banishment, NPC, Split Screen, Weekly Vault, input or release/cache ownership changed.

## Qualification

The exact head `432af71f6d19612a54e274f9114c6b3ef35e7450` completed every triggered workflow successfully:

- Lost Sizzler Load Safety;
- CCG Site Safety;
- Public Code Cache Version;
- Native Mouse Wheel Scroll Contract;
- C64 Dungeon Carnage itch.io Package;
- SEO Automation;
- Structured Data Validation;
- Social Metadata Validation.

Lost Sizzler Load Safety passed the canonical/Node suite, browser discovery and all six Chromium shards on the exact head.

During candidate development, the new first-visual browser probe exposed two defects in the probe itself: an unresolved navigation-promise arrangement and sampling before the render-blocking stylesheets had finished applying. Both were corrected without changing runtime semantics, weakening assertions or increasing existing runtime timeouts.

A historical `v10-35-layout.mjs` 15-second startup timeout appeared on an earlier candidate while the new probe was still being corrected. It had passed on adjacent candidates and was not used to justify any runtime or timeout weakening. The final exact head passed the complete matrix.

## Status

Repository status: **REPOSITORY-COMPLETE — #2145**.

This closes the startup/first-visual flicker remediation in source and automated qualification. It does not silently satisfy either outstanding hands-on Dungeon product gate.

## Deferred manual acceptance

The two existing manual gates remain:

1. sustained Solo movement/firing/combat/pause-resume stability after #2129;
2. obtain three Artefacts/Essences and perform the Banishment Flask exchange without buying a Gold Flask first, receiving exactly one Flask while Gold and Score remain unchanged except where established behaviour explicitly requires otherwise.

For both:

**MANUAL ACCEPTANCE DEFERRED — USER CURRENTLY UNAVAILABLE TO TEST**

Repository-side itch.io preparation remains complete. Public itch.io page creation, upload, publication and final URL remain external unless later live evidence proves otherwise.


## Hands-on acceptance follow-up — PR #2153

The first deployed hands-on acceptance after #2145 found one remaining visual race. The user observed the compact/intermediate menu first and the richer five-depth/RPG menu shortly afterward. Basic Solo movement worked once the game loaded, but the startup presentation gate failed.

The additional root cause was release ownership rather than initial paint ownership: V10.36 hid the canonical loader when the legacy release gate became ready, while the authoritative V10.42 ordered bootstrap could still be loading modules that compose the final menu.

PR #2153 keeps the existing loader architecture and adds no arbitrary delay. For V10.42 builds, loader removal now requires the legacy gate plus `CCGLostSizzlerV142Bootstrap.ready`, `body[data-release-ready=true]` and `body[data-v142-bootstrap-ready=true]`. A V10.42 bootstrap failure is routed through the existing loader error state.

The strengthened Chromium regression pauses `v10-42-five-depth-campaign.js`, proves that legacy readiness alone leaves the loader covering the intermediate menu, then releases the module and verifies the final `5 PROCEDURAL DEPTHS`, `RPG CHARACTER BUILD` and `THREE GLOBAL KEYS` presentation before the loader is hidden.

Exact qualified head: `8a2fc01022612a13d0c4f52f276a4d7d62deee4e`.

Merge commit: `ba75374ea45871e24885a0d2cdbd57bb61f1ae95`.

Qualification passed Public Code Cache Version, Native Mouse Wheel Scroll Contract, the Dungeon itch.io package workflow, canonical/Node contracts and all six Chromium shards. Shard 5 initially hit only the historical `v10-35-layout.mjs` 15-second startup timeout; an unchanged failed-job retry passed. No runtime assertion or timeout was weakened.

Current qualified release artifact: `C64-Dungeon-Carnage-Itch`, artifact ID `10544143256`, Actions SHA-256 `8001fc1034a03051ecec70de5c0966a07429b55abd8ae7f43382eecb80576036`.

Product status: **STARTUP RETEST REQUIRED**. The sustained Solo gate is not yet passed, and the Banishment Flask gate has not yet begun.
