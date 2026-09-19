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

Repository status at this checkpoint: **REPOSITORY-COMPLETE — #2145**.

This did not ultimately close the user-visible startup issue. Later hands-on testing reproduced two additional reveal races, which were fixed in #2153 and #2164 below. Automated success on #2145 is therefore historical evidence, not final deployed acceptance.

## Deferred manual acceptance

The two existing manual gates remain:

1. sustained Solo movement/firing/combat/pause-resume stability after #2129;
2. obtain three Artefacts/Essences and perform the Banishment Flask exchange without buying a Gold Flask first, receiving exactly one Flask while Gold and Score remain unchanged except where established behaviour explicitly requires otherwise.

For both:

**MANUAL ACCEPTANCE DEFERRED — USER CURRENTLY UNAVAILABLE TO TEST**

Repository-side itch.io preparation remains complete. Public itch.io page creation, upload, publication and final URL remain external unless later live evidence proves otherwise.


## Hands-on follow-up — PR #2153

After #2145 merged, deployed hands-on testing still showed:

`loader → older compact menu → final V10.42 five-depth/RPG menu`

Root cause: V10.36 could hide the canonical loader when the legacy release gate became ready while the authoritative V10.42 ordered bootstrap was still composing the final menu.

PR #2153 kept the existing loader architecture and required both legacy readiness and authoritative V10.42 ordered-bootstrap/body readiness before reveal.

- exact qualified head: `8a2fc01022612a13d0c4f52f276a4d7d62deee4e`
- merge commit: `ba75374ea45871e24885a0d2cdbd57bb61f1ae95`
- no arbitrary delay added
- no gameplay/economy/save/progression ownership changed
- strengthened Chromium coverage deliberately held the five-depth module and proved the intermediate menu remained covered

Repository status: **REPOSITORY-COMPLETE — #2153**.

## Hands-on follow-up — PR #2164

A later supplied video still captured a one-/few-frame sequence while modules were loading:

`loader → main page → loader → main page`

Root cause: `v10-41-release-overlay-safety.js` still treated the transient legacy `body[data-release-ready="true"]` pulse as authority to CSS-hide the loader. V10.42 then restored the flag to false while its ordered bootstrap was still active, making the loader disappear and reappear.

PR #2164 removed that obsolete visibility authority and left V10.36 as the normal startup-loader owner.

- exact qualified head: `43b916c3b974628446c2c9eeb55e66f47b8b14e9`
- merge commit: `38c79b61271be59791fe5f46dbc796b243f317dc`
- static protection prevents the legacy release-ready selector from returning
- Chromium coverage injects the transient legacy-ready pulse while V10.42 is unfinished and requires the loader to remain visible
- all triggered workflows passed, including Lost Sizzler Load Safety and all six Chromium shards

Repository status: **REPOSITORY-COMPLETE — #2164 / DEPLOYED MANUAL RETEST REMAINS**.

#2164 was later superseded as the final startup checkpoint by #2180 and #2182.

## Later deterministic startup follow-up — PR #2180

Exact-head qualification reproduced one remaining ownership bypass: premature `data-run-active="true"` or `data-tutorial-active="true"` could hide the canonical loader while V10.42 authoritative readiness was still false.

#2180 requires both `data-v142-bootstrap-ready="true"` and `data-release-ready="true"` before those active-state selectors can retire a stale non-error loader.

- exact qualified head: `c51522ab2b9b97046f23ed492d68a94b8fc3233f`
- merge commit: `bf4cfa4b68f1bc14bf89e81e71fa35fa585b2fb3`
- static and Chromium coverage protects premature run/tutorial pulses
- no gameplay, progression, economy, save, package or arbitrary-delay ownership changed

Repository status: **REPOSITORY-COMPLETE — #2180 / DEPLOYED MANUAL RETEST REMAINS**.

## Production smoke alignment — PR #2181

#2181 updates only the production-smoke expected release identity to `V10.42 r34` / `20260918r34`.

- exact qualified head: `275773ccdab4e6ca20b4bae77bff2847fac5b66c`
- merge commit: `69ba137423b0f435af9b5a6577b77c64668015e1`
- no runtime/gameplay/loader/package files changed

The post-merge smoke reached the correct release generation but exposed a separate stale-browser badge ownership defect.

## Stale-build badge ownership — PR #2182

The current Update Available panel could be accompanied by a legacy `BUILD V10.41` badge because `v10-41-landing-notification-polish.js` could write release labels before the V10.42 bootstrap object existed.

#2182 adds one guard so the legacy observer stops writing release labels whenever `CCGLostSizzlerVersion.state.outdated === true`.

- exact qualified head: `dfce128672fd90c8edf7900b3bac3a14095e58fe`
- merge/current `main`: `4319ff84ea8bca41559347915d0ab5d2c1a0e873`
- all six Chromium shards plus canonical/Node/discovery passed on the exact head
- latest qualified package artifact: `10566350206`, SHA-256 `147782cb38cab392817b1bd4670f670ca0bcc2d51264839378d50bf229237be6`

Repository status: **REPOSITORY-COMPLETE — #2182**. The push-triggered production smoke later passed on deployed/current `main` `66c2aa8441fc67961e1b3fa116da6537ea41002b` in run `35397906108`, verifying `V10.42 r34 / 20260918r34`, matching `version.json`, the stale-browser Update Available path, feedback validation and Weekly Vault backend response. GitHub Pages deployment, live public navigation and push Load Safety also passed.

The required hands-on startup acceptance is now: on the deployed current build, loading must transition directly to the final V10.42 menu with no compact/intermediate menu flash and no loader → page → loader pulse. The stale-browser version path must leave the current Update Available label authoritative rather than reverting the badge to V10.41.


## Final stale-browser writer follow-up — PR #2185

After the #2182/#2184 production-smoke cycle, the live stale-browser path still exposed one later writer: the authoritative V10.42 ordered bootstrap repeatedly restamped the visible subtitle/build badge after the version checker had already established `UPDATE AVAILABLE` ownership.

#2185 keeps authoritative build/cache metadata restamping intact, but does not overwrite the visible subtitle/build badge while `CCGLostSizzlerVersion.state.outdated === true`.

- exact qualified head: `ee8bef501b26271d1e1f38ad33c6c275b3290aba`
- merge/current main: `073ee3df35cd3982ceb04676619792d69a28e0e3`
- production-smoke run `35414519454`: passed
- push Load Safety run `35414519441`: first attempt failed only in unchanged `v10-28-browser-stability-deterministic.mjs` on shard 3; unchanged shard retry passed on attempt 2
- latest qualified package: artifact `10575312850`, SHA-256 `6425e7f4cdd296843911c78e81a1545c661123bab726c4b2cdd9449d7334d73c`

Repository status: **REPOSITORY-COMPLETE — #2185**. Automated deployment verification is green. The remaining startup gate is still hands-on: current deployed main must show a direct loader → final V10.42 menu transition with no compact/intermediate flash and no loader → page → loader pulse.
