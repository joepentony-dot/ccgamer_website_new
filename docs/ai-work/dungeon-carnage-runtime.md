## Dungeon Carnage R56 post-merge qualification — 25 September 2026

- PR #2333 / `codex/dungeon-environment-diagnostics-r56` was fully qualified at exact head `1f549533c0b0737963603ba337d7954d6fb07e6d`: Lost Sizzler Load Safety passed its Node/static job and Chromium shards 1–6; Native Mouse Wheel, Site Safety, Arcade Test Package, SEO Automation, Structured Data, Social Metadata, itch.io Package and Public Code Cache Version also passed.
- #2333 merged as `df282217609375336a802fb348b75446b8ace403`. Generated SEO/video output then advanced `main` to `a78269fd49c2c9ca3021c179b896b716239d8c11`.
- The merged R56 tree contains the review-driven repairs: exact player/cell environmental damage signals, hazard cooldown filtering, lethal-hit-safe evidence, mandatory-route hazard preference, disjoint relaxed hazard-room candidates, authoritative trap-contact signals, and purchase feedback that cannot overwrite a successful transaction with a post-purchase INVENTORY FULL/price blocker.
- Follow-up branch `codex/dungeon-r56-postmerge-qualification-20260925` starts from exact current main `a78269fd49c2c9ca3021c179b896b716239d8c11`. It corrects both public Dungeon Carnage changelogs from stale R54 wording to R56 and adds `v10-42-r56-postmerge-blockers.mjs` to pin the resolved blocker contracts.
- Candidate identity remains `V10.42 r56` / `20260924r56`. Do not change gameplay ownership merely to satisfy diagnostics.
- Follow-up PR #2337 subsequently exposed an intermittent Floor 1 generation gap during exact-head requalification: Chromium shard 1 produced FIRE=2, SPIKE=0, SHOCK=1 because the final trap-family restoration had no fallback when its strict room pool was empty. The authoritative branch now preserves the strict preference but falls back through progressively relaxed non-hazard room pools, pins that fallback chain in `v10-42-r56-postmerge-blockers.mjs`, and advances the public code cache to `2026-09-25-public-code-v19`. Current candidate must complete a fresh full exact-head workflow matrix and fresh Codex review before it is merge-ready; preserve it unmerged until explicit user authorization.

## R54 graphics/UI and pickup semantics — 23 September 2026

The active visual/mechanical follow-up is `codex/dungeon-r54-graphics-ui-current-main-20260923`, created from current main after the R53 gameplay repair and UTA publication work completed. It advances the public candidate to `V10.42 r54` / `20260923r54`.

The first slice removes the root cause of unrelated C64 titles appearing on ordinary pickups: generic world pickups no longer receive `C.c64Loot` titles, and runtime/ground-label owners now use mechanic-led names while true rescued-game collectibles retain their title. Health, ammo, XP and armour feedback exposes the actual mechanic/value; firearm pickups continue through `generateWeapon()` and `equipWeapon()`, which presents the real generated weapon display name.

Bronze-key ownership is also reconciled. The HUD now exposes the Bronze count directly and without ellipsis clipping. A standalone locked chest still consumes one Bronze key, but a chest whose room has already been unlocked through its Bronze door treats that door payment as the room payment and does not consume a second key. The rulebook records this contract.

Presentation work in the same candidate keeps animation renderer-owned: the existing explorer sheet is isolated through the established r48 atlas wrapper and now exposes eight-stage walk and melee presentation sequences; procedural enemy locomotion uses eight discrete phases plus the existing meleeSwingMs/hit-stun state for attack/recoil presentation. Corridor cells inherit the WARP_GALLERY visual identity, pickup glyphs receive a layered icon backing, and supply/secret shops use named, identity-seeded merchant characters with role-specific props instead of the former generic SHOP block. No new per-entity timer owner or second render loop was added.

The established explorer and chest sprite sheets are now release-tokened, preloaded and given high fetch priority so the designed chest art is available before the old fallback path. Exact-head qualification is still required before R54 is considered merge-ready. NPC dialogue/quest-content expansion remains a later phase.

## R53 ATTACK liveness and crowded-impact qualification — 23 September 2026

Active candidate: draft PR #2294 / branch `codex/dungeon-r53-attack-rail-current-main-20260923`, based on current `main` and retaining the merged R53 global FIRE/SPIKE/SHOCK trap-cycle repair.

The candidate keeps attack ownership bounded: a physical desktop Space/Numpad0 press is recognised as complete when it performs real firearm work or advances the established melee swing owner, stale finite combat locks can recover without resetting healthy cadence, and held-fire ownership remains separate from recovery. Crowded projectile impacts retain damage and knockback while redundant burst/ring presentation is suppressed only under effect pressure; ring and floating-text pools are bounded alongside the existing particle cap. Major notices remain inside the reserved lower report rail.

The first exact-head qualification of code head `3530a77d2ea2045cffb7304e22f253a31eb78a21` exposed three blockers that must not be conflated:
- the new >3-minute desktop sword/firearm soak failed on cycle 3 after a sword swing because its test fixture had renamed and teleported a real generated enemy; by the assertion that object had been reconciled back to its generated coordinates while the player remained elsewhere. Commit `8c65b5fbffb48cc08d20b5c31c7bea253aa57889` corrects only the fixture: it now preserves an ordinary generated enemy's canonical ID/location, freezes its movement timers, and places the player in a walkable adjacent cell before each sword tap;
- SEO Automation failed on a YouTube Data API 403 referring to `myRating`, although the repository metadata request sets only `part=snippet,contentDetails`, IDs and the API key. This is not attributed to the Dungeon change without fresh exact-head evidence;
- Native Mouse Wheel passed its static contract and three browser positions but stalled once over the game video at desktop 1440. The same workflow passed on contemporaneous PR #2295, so a fresh exact-head result is required before treating it as a product regression.

No production gameplay behaviour was changed by the soak-fixture correction. #2294 remains draft and must be 0 commits behind `main` with the full exact-head matrix green before any merge; merge still requires explicit user authorisation.

## R53 global cyclic floor-trap reliability — 23 September 2026

Owner testing after R52 reproduced an ordinary SHOCK floor trap visibly labelled ACTIVE while the player remained on its tile without losing HEALTH. Investigation of generation, rendering and damage ownership confirms FIRE, SPIKE and SHOCK all use the same `host.traps` model and the same `SYS.trapActive()` period/phase clock, so the repair is global rather than kind-specific.

The remaining race is a stale contact latch across a missed inactive interval. The canonical rare-events owner, R56/R57 cycle owners and R19 all historically cleared their duplicate-contact state after observing the trap inactive or the player leave the tile. If a long frame/runtime stall spans that complete inactive window, the next frame can correctly render the following cycle as ACTIVE while the previous cycle's contact latch still suppresses the hit.

R53 keeps the established damage pipeline and cadence but associates each accepted R19 floor-trap hit with an explicit cycle identity derived from the trap's period/phase clock. When the next ACTIVE cycle is seen, stale R19, canonical rare-events, R56 and R57 contact state is synchronously rearmed even if no inactive frame was sampled. Same-cycle duplicate suppression remains intact, armour remains unchanged for floor-trap health damage, and a failed canonical damage attempt is not recorded as a successful contact merely because stale invulnerability exists.

Regression coverage now validates real generated FIRE, SPIKE and SHOCK traps individually: the first ACTIVE contact removes exactly one HEALTH, another check during the same cycle does not double-hit, and a deliberately advanced next cycle removes exactly one additional HEALTH without exposing an inactive frame. Dedicated blade/ember/arrow hazard rooms and the rolling boulder use separate damage paths and are outside this stale floor-trap latch.

Candidate release identity is **V10.42 r53 / 20260923r53**. Exact-head full qualification remains mandatory before merge.

## R51 live incident: FIRE anomaly, active spikes, render corruption — 23 September 2026

Current candidate: `codex/dungeon-r51-fire-wall-incident-20260923`, based on refreshed `main` `88df63430f275a37553a821c2511b1296dd13f8e`.

New hands-on evidence changes the previous acceptance state:
- the developer bug report recorded one `ANOMALY_POSSIBLE_FIRE_FAILURE`; subsequent shots in the exported tail were successful, so this is intermittent rather than a current permanent lockout;
- current `main` contains R51 fresh-press/real-shot verification, but the stronger repeated-miss recovery for a persistently reasserted hit-stun remained stranded on stale draft #2260;
- a screenshot shows visibly active spike tiles with no HEALTH loss while occupied and severe whole-canvas smearing/stalling.

Bounded repairs on this candidate:
- R20 now counts repeated verified FIRE misses and, only after the normal owners have failed for a persistence window, clears a still-reasserted hit-stun and retries the deepest established FIRE owner. Normal hit-stun, ammo, projectile-cap, weapon cadence and real-shot semantics remain unchanged.
- R19 now checks already-occupied trap tiles from its existing 80 ms maintenance tick. It rearms inactive contacts first and then routes a newly active occupied trap through the same validated one-HEALTH/no-armour-consumption path, so standing still on a cycling spike cannot bypass damage.
- `renderView()` restores its canvas save/clip/transform state in `finally`. The base frame begins from identity transform, source-over compositing and normal alpha/filter state. This addresses the case where R29 contains a render exception but the failed draw previously poisoned later frames.
- The developer reporter now emits real-shot-only FIRE probes, preserves anomaly entries even if they are older than the 120-line text tail, and includes R20/R19/R29 diagnostics.

No second RAF loop, trap balance redesign, weapon rebalance, world-generation change, save/progression change or navigation change is introduced. Exact-head CI plus a new deployed/manual retest are required before merge.

# Dungeon Carnage runtime

## Scope

The browser game under `arcade/lost-sizzler/`, including retained local runtime extraction, campaign/biome work, UI, gameplay defects, and runtime contracts. Read `arcade/lost-sizzler/PROGRESS.md` for the product backlog, but prefer live `main` when later merges or automation have advanced beyond a recorded checkpoint.

## R52 unused level-up entitlement candidate — 23 September 2026

Draft PR #2282 / branch `codex/dungeon-unused-level-up-entitlement` starts from current `main` `88df63430f275a37553a821c2511b1296dd13f8e`. PR #2271 is merged as `b3a5b8977acf023a602e300778358b62def9859d`; its fullscreen/message-rail/Tutorial-FIRE repair is therefore part of this candidate's baseline rather than an open dependency.

The player-reported edge case is bounded to level-up entitlement/UI ownership. `CCGProgression.gainXP()` already increments `player.pendingLevels` once per earned level and checkpoints clone that field, but the transient `levelQueue` stored only one player reference and had no supported defer/reopen route. That could strand a still-valid entitlement after a dismissed overlay and collapse multiple pending level choices into one visible interaction.

R52 keeps `pendingLevels` authoritative. The Level Up overlay gains **Choose Later**; backdrop click and Escape defer without decrementing the entitlement; the XP panel exposes a counted **LEVEL-UP AVAILABLE** button; reopening reconstructs the queue from the player's stored count; one chosen skill consumes exactly one pending level; floor/world restoration replaces stale queue references with the current preserved player object. A level lost to the existing death penalty consumes an unused entitlement before removing a previously selected skill, preserving the level/skill invariant introduced by deferral.

No new save schema, XP curve, floor cap, weapon/combat balance, world generation, FIRE ownership, navigation or account behaviour is introduced. Candidate identity advances to `V10.42 r52` / `20260923r52`. New static and Chromium contracts cover defer/reopen/spend, multiple pending levels, death-level-loss handling and checkpoint cloning. Exact-head GitHub Actions qualification remains required before the draft can be considered merge-safe; no merge is authorised by this checkpoint.


## R51 desktop/message-rail/Tutorial-FIRE regression candidate — 23 September 2026

Current candidate branch: `codex/dungeon-r51-regression-fixes`, created from refreshed `origin/main` at `f719717824f2caa1cb89dc84a2ad7f2438f042a2` after merged PR #2256. It is deliberately a narrow post-R51 repair: no navigation, owner-preview gate, C64/Amiga selection, retired-mode boundary, world, combat balance or camera-scale redesign.

- The guidance capture owner now requests desktop fullscreen in the original Solo/Tutorial launch click. The core request remains browser-safe and coalesces duplicate requests while retaining the promise rejection/time-limit fallback.
- Routine `showToast` notices are restored to a static, non-interactive compact rail below the desktop canvas. The R29 finalizer now keeps that rail block-owned outside the retained historical Horde presentation, and the late presentation stylesheet cannot promote standard pickup notices back over the dungeon. Major notifications remain separately owned.
- Tutorial mobile FIRE no longer queues a future attack or leaves `Space` held after a direct touch action. R20's mobile fallback respects the same Tutorial-only boundary; its established direct-shot, stale-lock and liveness protections are unchanged for normal combat.
- Added/extended deterministic checks: the static R51 regression contract, Fire recovery contract, and Chromium runtime path cover Solo/Tutorial fullscreen requests, lower-rail pickup geometry/non-blocking behavior, a Tutorial touch FIRE that consumes exactly one ammo and leaves no held input, and a normal follow-up FIRE.

Completed checks: `v10-42-r51-regression-fixes.mjs`, `v10-42-r51-fullscreen-ui-contract.mjs`, `v10-42-r51-fire-press-recovery.mjs`, `v10-41-r29-runtime-repair.mjs`, `v10-22-version-cache.mjs`, `v10-42-r36-release-cache-identity.mjs`, `v10-42-r51-retired-public-ui.mjs`, syntax checks for every edited runtime module, `git diff --check`, the public-code cache guard, and the focused Chromium contract all pass. The focused Chromium run proves the two launch requests, pickup geometry/non-blocking behavior, actual Tutorial touch FIRE single-shot behavior, and normal follow-up FIRE.

`origin/main` was re-fetched after qualification and remains `f719717824f2caa1cb89dc84a2ad7f2438f042a2`. A broader unrelated `v10-9-stability.mjs` Chromium launch failed locally with Playwright `spawn UNKNOWN`; the itch package script also cannot construct a Windows source path (`C:\\C:\\...`) in this shell. Neither is represented as a green check. Re-run those environment-blocked jobs in CI before calling this candidate merge-safe. Do not merge without explicit user authorisation.

## R51 supported-runtime handoff reconciliation — 22 September 2026

PR #2256 exposed a hidden dependency while qualifying the owner-preview build. The R51 public-UI cleanup correctly retired `v10-41-r30-buglog.js` from canonical HTML, but that historically named file also contained the dynamic handoff that loaded supported Solo runtime ownership: the mode controller, Solo diagnostics, post-playtest/R56/R59 recovery, the Solo-facing R60 integrity bridge, and Stage 8/13 encounter owners. With the buglog removed, the first full R51 Chromium matrix showed empty `dungeon-solo` controller markers, missing supported owners, broad startup/soak timeouts and the focused FIRE-lockout contract timing out.

The repair keeps the retired buglog absent and unchanged. `v10-42-bootstrap.js` now loads those supported prerequisites explicitly and fails closed if any prerequisite does not initialise before ordered V10.42 modules run. Browser contracts that still required retired public Split Screen/Weekly Vault or R50 build identity were reconciled to the authorised R51 release boundary: Solo and Tutorial remain public; `split-btn` and `daily-btn` remain hidden inert compatibility anchors. Supported Solo/FIRE, loader, movement, rendering, trap, pause/inventory and endurance checks remain active.

Status: **IMPLEMENTED ON DRAFT PR #2256 / FINAL EXACT-HEAD QUALIFICATION REQUIRED BEFORE MERGE**.

## P0 FIRE lockout remediation — 22 September 2026

A hands-on `V10.42 r50` Solo report captured the current worst game-breaking regression: firing worked and then stopped during the same active Floor 3 run. At failure the player still had 117 ammo, Tier 4 Tri-Pulse I equipped, zero of seven allowed player projectiles active, gameplay mode/run ownership intact, inventory hidden and canvas focus retained. Repeated Space presses continued to queue FIRE buffer state but produced neither ammo consumption nor projectiles.

Current remediation is being applied to draft PR #2256 / `codex/dungeon-r51-owner-preview-current-main`, the already-active R51 integration vehicle. Investigation found two defects in its intended global FIRE recovery:
- the delayed fresh-press verifier returned early when a normal quick tap had already received keyup before the 120 ms verification point;
- both the global and Inventory recovery paths accepted FIRE buffer/cooldown activity as proof that a shot had been handled, matching the exact false-positive state seen in the live report.

The bounded correction keeps Space/Numpad0 ownership and all weapon balance unchanged. It verifies a fresh tap even after keyup, counts only ammo consumption or a live player projectile as completed-shot evidence, uses the authoritative `bullets` collection in the R20 direct-fire check, and prevents R20 from returning success merely because `fireBuffer1` was queued. The focused R51 contract protects those semantics. No navigation, fullscreen, world generation, collision, traps, progression, saves, economy or projectile-lifecycle rules are being redesigned.

Status: **P0 IMPLEMENTED ON ACTIVE R51 CANDIDATE / EXACT-HEAD QUALIFICATION REQUIRED BEFORE MERGE**.

## Active V10.42 R50 combined blocker candidate — 22 September 2026

Branch `codex/dungeon-r50-combined-blockers` consolidates the user-reproduced R50 blockers on top of the already-qualified #2241 fullscreen/input/layout candidate rather than releasing partial fixes.

Implemented repository-side changes:
- reconciled #2233's qualified pickup/audio diagnostics and pickup-level-up SFX staggering;
- removed V10.4 collectible horror's independent AudioContext and recurring oscillator beat owner, replaced its reused Death Stalker sting with the established alert cue, and reduced its effect observer to 250 ms;
- exposed Archive Wraith horror-active transitions to REPORT BUG;
- added simulation-owned Memory Console edge detection so entry reliably starts/replays the sequence without per-frame restart;
- centred the unresolved Memory Pad footprint in the camera, based ordinary mobile zoom on the real browser viewport rather than the sidebar-reduced canvas width, and kept the pads/console readable while the player remains in the puzzle room;
- changed the release loader artwork to `resources/images/hero/c64-dungeon-carnage-home-v2.webp`;
- added the R50 combined static contract and carried forward the #2233 pickup-audio diagnostic contract.

Exact-head qualification is pending. #2241 and #2233 remain unmerged while the combined candidate is qualified.

## Historical r50 fullscreen/input follow-up — PR #2241 — 22 September 2026

PR #2231 is merged as `3f273ec8eb881faac1825a6779863c9367faf0d1`, making `V10.42 r49` / `20260922r49` the current live runtime. Immediate hands-on testing then exposed two desktop fullscreen issues.

First, the visible instruction says **Press F if needed** for fullscreen and the canonical `game-main.js` handler does own `KeyF` for `toggleFullscreen()`. However, three later combat-recovery layers still treated `KeyF` as a P1 attack alias. The r20 capture-phase listener could therefore stop propagation and fire before the canonical fullscreen listener ran. #2241 removes `KeyF` from r20 attack recovery, held-attack liveness and r47 Inventory/FIRE verification. Space and Numpad0 remain attack inputs; stale historical `KeyF` state is still cleared at pause/inventory recovery boundaries.

Second, the supplied fullscreen screenshot shows the active dungeon occupying only the upper portion of the available canvas with a large unused black region below. #2241 changes only renderer camera scale: normal desktop Solo remains 1x, mobile Solo/Tutorial remains 1.6x, split-screen remains 1x, and desktop Solo while browser fullscreen is active uses 1.35x. This also reduces the north-edge camera clamp that left the starting room high in the viewport.

Regression coverage now exercises a focused real F key through document capture listeners and requires that fullscreen receives it without increasing r20 attack intents. Static ownership coverage also prevents late attack layers from reclaiming `KeyF`. The candidate advances build/cache to `V10.42 r50` / `20260922r50`.

No world generation, collision, damage, traps, progression, save, economy, projectile lifecycle or combat-balance owner is changed.

## Current checkpoint — 22 September 2026

## Current checkpoint — 22 September 2026

## Current checkpoint — 21 September 2026

Latest verified Dungeon runtime merge checkpoint is #2222: exact qualified head `d27d714f5d15757e360ce27b49b4d185e379e56d`, merged as `cbbf9a97eb1f83c21eea3a519fd707af28be22bd`. It sits directly on merged #2220 (`f2d5332ceca250861e79185c943b8098c001894a`), the Level 2 floor-simulation/trap-cycle liveness fix. #2222 advances build/cache to `V10.42 r46` / `20260921r46`, adds the final visual-maximisation presentation layer and reduces the separate Level 3 E/N/W/S torch wrong-answer penalty to exactly one spawned monster. Stage 8 itch.io repository preparation remains complete through #2141, with a fresh qualified r46 package artifact recorded below.

Stage 1 remains converged through #2134/#2135, Stage 2 through #2136, and the original seven-item live-defect programme remains repository-complete except for the deferred hands-on Defect 5 acceptance. The #2129 sustained-Solo hands-on acceptance and the startup hands-on acceptance also remain outstanding.

### Floor-performance foundation and final visual maximisation — #2220 / #2222

#2220 is merged as `f2d5332ceca250861e79185c943b8098c001894a` and is the current simulation foundation for the reproduced Level 2 slowdown/trap-cycle liveness regression.

#2222 is merged from exact head `d27d714f5d15757e360ce27b49b4d185e379e56d` as `cbbf9a97eb1f83c21eea3a519fd707af28be22bd`. Its production scope is bounded:

- biome-linked HUD/frame accents and first-visit room identity/landmark presentation consume established R6/R24 metadata;
- active traps receive stronger presentation telegraphing through the established render path;
- no perpetual timer or render loop is introduced; the layer wraps existing render/trap presentation owners;
- severe-performance and reduced-motion fallbacks remain;
- the visual layer claims no simulation, collision, combat, progression, save, inventory or economy ownership;
- an incorrect Level 3 E/N/W/S sequence-torch input now calls the existing ambush owner with exactly one monster instead of the previous escalating 3–5; the separate flashing-floor memory puzzle is unchanged.

Exact-head qualification passed Site Safety, SEO, structured/social metadata, itch.io package, cache/version, dedicated mobile trap/layout, native mouse-wheel and Lost Sizzler Load Safety. On the first shard-1 attempt, the sustained Solo timing/ownership soak passed, the live Solo combat endurance contract passed, and the real five-minute mobile FIRE soak completed 15 individually verified attacks over 305,028 ms. The contract later hit an unchanged Playwright `#resume-btn` locator timeout during the post-soak pause step. One unchanged failed-job retry on the same exact head passed canonical/Node plus all six Chromium shards. No runtime, gameplay assertion or timeout was weakened.

Latest qualified runtime/package artifact: `C64-Dungeon-Carnage-Itch`, artifact ID `10665815712`, 21,121,606 bytes, GitHub Actions SHA-256 `df779a234219af99ebfb56da8393defd11db30aca64e956711f4b65884deac50`, workflow run `35656738189`, exact source head `d27d714f5d15757e360ce27b49b4d185e379e56d`, merged by #2222 as `cbbf9a97eb1f83c21eea3a519fd707af28be22bd`.

### Mobile natural-trap remediation — #2188 / #2192 / #2193 / #2198 / #2201

The user-reproduced mobile defect was that naturally generated floor traps could visibly trigger under real touch movement without removing HEALTH.

- #2188 established real-touch spike/fire/shock regression coverage and the first synchronous R19 repair.
- #2192 added a canonical `triggerTrap()` guarantee after exact-main qualification exposed an active-phase/wrapper race.
- Repeated current-main qualification then exposed one remaining ownership case: the visible global `hurtPlayer` function could temporarily be the plain canonical owner, allowing armour absorption and invulnerability to occur before the retained R19 trap owner repaired the contact.
- #2193 fixes that final race by routing a caller-validated active floor-trap contact through the retained R19 damage owner first. Canonical `hurtPlayer()` remains the fallback, and the post-call guarantee remains a backstop. The route preserves one-HEALTH trap damage, armour, XP boundaries and canonical damage/death handling.
- #2198 is a test-only correction discovered while qualifying startup-smoke work: the natural-contact browser contract could select a generated trap whose `active` flag was false while separately sampling a phase that looked active. #2198 now requires the selected trap itself to be active throughout candidate selection, phase waiting and diagnostics. Exact head `0739e4300b7badf92483572b5c898490893002a3` merged as `301afdfe9e39ea2551486c5857260cc607d8a038`; runtime/gameplay code was unchanged.
- A subsequent real mobile test still reproduced active traps failing to remove HEALTH. #2201 reproduces the remaining failure with a late visible `hurtPlayer` owner that swallows trap-labelled calls, then routes caller-validated active floor contacts through the retained canonical damage/death owner directly. Armour is restored after the contact, duplicate-contact protection remains owned by R19, and the generated real-touch contract proves the late-owner case.

Exact #2193 qualification passed CCG Site Safety, SEO Automation, C64 Dungeon Carnage itch.io Package, Public Code Cache Version, Native Mouse Wheel Scroll Contract, both dedicated Mobile Trap Layout jobs, canonical/Node contracts and all six Lost Sizzler Load Safety Chromium shards. The first shard-4 attempt saw one shock crossing sampled with only 36.5 ms left in its active phase; an unchanged shard-4 retry on exact head `03333f6e89381e018197b990664a1e25205e8f78` passed. No runtime, assertion or timeout was weakened.

Historical pre-r46 qualified runtime/package artifact: `C64-Dungeon-Carnage-Itch`, artifact ID `10619910820`, 21,113,583 bytes, GitHub Actions SHA-256 `d9c38662244d2a3de40c2f5eeddcdd594e863eb222dfc5ac2b5beb650bf0b624`, workflow run `35553635187`, exact source head `dac8819a646dfd9ec0e0669f669903157a280ff6`.

Documentation PR #2191 is closed without merge as superseded because it recorded #2192 as the terminal trap checkpoint before #2193 disproved that assumption.

### Mobile playfield camera — #2203 / #2205

The deployed mobile screenshot showed the active dungeon occupying too little of the available playfield. #2203 introduced a renderer-only camera scale of 1.3x for mobile Solo/Tutorial when the canvas is 900px wide or narrower. Hands-on feedback then showed that 1.3x remained too small, so #2205 increased the same isolated camera to 1.6x. Desktop Solo and local 2P remain at the established 1x scale. The follow-up does not alter world generation, collision, movement, combat, traps, saves, economy or input ownership. Exact #2205 qualification passed all nine triggered workflows, including Lost Sizzler Load Safety canonical/Node coverage and all six Chromium shards.

Outstanding product gates:

1. deployed startup retest on current post-#2222 main: loader must transition directly to the final V10.42 menu with no compact/intermediate flash and no loader → page → loader pulse;
2. sustained Solo movement/firing/combat/pause-resume stability after #2129;
3. three Artefacts/Essences → exactly one Banishment Flask without prior Gold-Flask purchase, with Gold and Score unchanged;
4. deployed mobile trap acceptance: naturally generated active spike/fire/shock contacts must remove exactly one HEALTH while armour remains unchanged;
5. deployed mobile landing acceptance: Continue/Solo/2P/Tutorial/Weekly choices must stack as one full-width column rather than a narrow left column, with readable Solo text;
6. deployed mobile playfield acceptance: Solo/Tutorial should visibly use more of the available gameplay area at the intended 1.6x camera while controls remain usable;
7. deployed r46 acceptance: confirm the biome/room/trap visual polish remains performant and readable, and a wrong Level 3 E/N/W/S torch input spawns exactly one monster.

Exact #2201 qualification passed CCG Site Safety, SEO Automation, Structured Data Validation, Social Metadata Validation, C64 Dungeon Carnage itch.io Package, Public Code Cache Version, Native Mouse Wheel Scroll Contract, the dedicated C64 Dungeon Carnage Mobile Trap Layout Contract, canonical/Node contracts and all six Lost Sizzler Chromium shards. Load Safety shard 6 initially hit the unchanged V10.36 loading-progress timing sample at 92% rather than 100%; an unchanged targeted shard-6 rerun passed. No runtime assertion or timeout was weakened.

**MANUAL ACCEPTANCE REQUIRED — AUTOMATED TESTS DO NOT SUBSTITUTE FOR THESE GATES**

### Current-main startup smoke hardening — PR #2199 — MERGED

PR #2199 rebuilt the superseded startup-transition smoke against current main after #2198 landed. It adds rendered-frame sampling to the existing production smoke and fails if the release loader exposes an intermediate menu before authoritative V10.42 readiness, reappears after first valid reveal, or the four main mode buttons change presentation immediately after reveal.

- exact head: `6888ca6e7eb2d872cd9b460e64604f73682da9bf`
- merge commit: `c0b8eb4a82806d524ce48e97c70888b09b0c327a`
- changed file: `arcade/lost-sizzler/tests/production/v10-41-r47-production-smoke.mjs` only
- C64 Dungeon Carnage itch.io Package, Public Code Cache Version, Native Mouse Wheel Scroll Contract and Lost Sizzler Load Safety passed
- Load Safety canonical/Node and all six Chromium shards passed without retry
- no runtime, gameplay, CSS, assets, package, save, progression or economy behaviour changed

This strengthens automated evidence for the startup/first-visual chain but does not replace the hands-on startup gate.

### Startup / first-visual flicker remediation — PR #2145 — MERGED

Branch: `codex/dungeon-startup-first-visual-current-main`.

Qualified head: `432af71f6d19612a54e274f9114c6b3ef35e7450`.

Merge commit: `4c56d2bccd73350359c8b3246b0d70142894d353`.

The remaining startup flicker was a first-visual ownership defect. The V10.36 release loader and its stylesheet were being created/loaded only after the body existed, allowing the menu to paint before the loader. The retained R55 owner could then apply its final button presentation before the menu was finally revealed.

#2145 makes the loader part of the original HTML before the game shell, loads the existing V10.36 loader stylesheet as render-blocking head CSS, and pre-aligns the visible R55 button text/presentation before reveal. The existing V10.36 runtime adopts the canonical loader instead of inserting a second one. No artificial delay was introduced.

The production delta is limited to `index.html` plus the new blocking startup CSS. Static and Chromium contracts protect the first-visual state. No world generation, combat, progression, saves, shops/economy, Banishment exchange, NPC/merchant logic, local Split Screen, Weekly Vault, input or release/cache ownership changed.

Exact-head qualification passed all eight triggered workflows. Lost Sizzler Load Safety passed canonical/Node coverage, browser discovery and all six Chromium shards on the exact head. Detailed evidence: `docs/ai-work/dungeon-carnage-startup-first-visual-2026-09-18.md`.

Repository status at the #2145 checkpoint: **REPOSITORY-COMPLETE — #2145**. Later hands-on evidence proved that two additional startup reveal races remained; see #2153/#2164 below.

### Startup reveal follow-up — PR #2153 — MERGED

Hands-on testing after #2145 still exposed `loader → older compact menu → final V10.42 menu`. The legacy release gate could become ready before the authoritative V10.42 ordered bootstrap had finished composing the final menu.

#2153 retained the existing loader architecture but delayed reveal until both the legacy gate and authoritative V10.42 ordered-bootstrap/body readiness agreed.

- exact qualified head: `8a2fc01022612a13d0c4f52f276a4d7d62deee4e`
- merge commit: `ba75374ea45871e24885a0d2cdbd57bb61f1ae95`
- no gameplay ownership or arbitrary startup delay added
- strengthened Chromium coverage held the five-depth module and proved the intermediate menu stayed covered

Repository status: **REPOSITORY-COMPLETE — #2153**.

### Module-startup loader flicker — PR #2164 — MERGED

A later supplied video still captured `loader → main page → loader → main page` for one/few frames during module startup. The retained `v10-41-release-overlay-safety.js` CSS still hid the loader on a transient legacy `data-release-ready=true` pulse before V10.42 ordered startup was actually complete.

#2164 removed that obsolete visibility owner so V10.36 remains the normal startup-loader authority. Its browser regression injects the same transient legacy-ready pulse while V10.42 is deliberately unfinished and requires the loader to remain visible.

- exact qualified head: `43b916c3b974628446c2c9eeb55e66f47b8b14e9`
- merge commit: `38c79b61271be59791fe5f46dbc796b243f317dc`
- all triggered workflows passed, including canonical/Node and all six Chromium shards

Repository status: **REPOSITORY-COMPLETE — #2164 / DEPLOYED MANUAL RETEST REMAINS**.

### Early active-state loader authority — PR #2180 — MERGED

Exact qualified head: `c51522ab2b9b97046f23ed492d68a94b8fc3233f`.

Merge commit: `bf4cfa4b68f1bc14bf89e81e71fa35fa585b2fb3`.

Deterministic browser qualification reproduced a remaining startup race after the earlier #2153/#2164 fixes: premature `data-run-active="true"` or `data-tutorial-active="true"` could still cause the retained release-overlay safety CSS to hide the canonical loader before authoritative V10.42 bootstrap/release readiness.

#2180 requires both V10.42 bootstrap readiness and release readiness before those active-state selectors may retire a stale non-error loader. Static and Chromium contracts prove run/tutorial state alone no longer owns loader visibility. No gameplay, movement, firing, combat, saves, progression, economy, Banishment, package logic, menu layout or arbitrary delay changed.

Repository status: **REPOSITORY-COMPLETE — #2180 / DEPLOYED MANUAL RETEST REMAINS**.

### Production smoke release identity — PR #2181 — MERGED

Exact qualified head: `275773ccdab4e6ca20b4bae77bff2847fac5b66c`.

Merge commit: `69ba137423b0f435af9b5a6577b77c64668015e1`.

#2181 changes only the production-smoke expected build/cache constants to `V10.42 r34` / `20260918r34`. It contains no runtime, gameplay, loader, package or release-file changes. The post-merge live smoke then exposed a separate stale-browser badge-ownership defect rather than a release-generation mismatch.

### Stale-build update badge authority — PR #2182 — MERGED

Exact qualified head: `dfce128672fd90c8edf7900b3bac3a14095e58fe`.

Merge commit/current `main`: `4319ff84ea8bca41559347915d0ab5d2c1a0e873`.

The live stale-browser path displayed the current Update Available panel, but the legacy V10.41 brand observer could overwrite the badge with `BUILD V10.41` before the V10.42 bootstrap object existed. #2182 adds a single guard: when `window.CCGLostSizzlerVersion.state.outdated === true`, the legacy observer stops writing release labels and the current version checker remains authoritative.

The production delta is one added guard in `v10-41-landing-notification-polish.js`. Exact-head qualification passed the itch.io package workflow, Public Code Cache Version, Native Mouse Wheel Scroll Contract and Lost Sizzler Load Safety, including canonical/Node, discovery and all six Chromium shards.

Latest qualified runtime/package artifact: `C64-Dungeon-Carnage-Itch`, artifact ID `10566350206`, 21,111,022 bytes, GitHub Actions SHA-256 `147782cb38cab392817b1bd4670f670ca0bcc2d51264839378d50bf229237be6`, workflow run `35390021405`.

Repository status: **REPOSITORY-COMPLETE — #2182 / PRODUCTION SMOKE PASSED / DEPLOYED MANUAL ACCEPTANCE REMAINS**.

Post-merge live verification:

- current deployed/main checkpoint: `66c2aa8441fc67961e1b3fa116da6537ea41002b`
- Lost Sizzler Production Smoke run `35397906108`: **passed**
- live runtime identity: `V10.42 r34 / 20260918r34`
- deployed `version.json`: matched public release identity
- stale-browser Update Available path: passed
- feedback endpoint CORS/validation without telemetry creation: passed
- Weekly Vault read/backend projection: passed
- Deploy GitHub Pages (Omega Stable): passed
- Live Public Navigation Verification: passed
- push-triggered Lost Sizzler Load Safety: passed

These automated/live checks do not substitute for the three hands-on product gates.

### Ordered-bootstrap stale badge authority — PR #2185 — MERGED

Exact qualified head: `ee8bef501b26271d1e1f38ad33c6c275b3290aba`.

Merge/current main: `073ee3df35cd3982ceb04676619792d69a28e0e3`.

After #2182, production smoke later proved one remaining competing writer: `v10-42-bootstrap.js` repeatedly restamped the visible subtitle/build badge even after the version checker had established a stale-browser Update Available state. #2185 keeps bootstrap ownership of authoritative build/cache metadata but skips visible subtitle/build-badge restamps while `CCGLostSizzlerVersion.state.outdated === true`.

The production delta is one runtime guard plus static and Chromium regression coverage. Exact-head PR qualification passed. After merge, Lost Sizzler Production Smoke run `35414519454`, GitHub Pages deployment, live public navigation, CCG Site Safety, Native Mouse Wheel and the itch.io package workflow all passed. Push Load Safety run `35414519441` initially failed only in the unchanged deterministic browser-stability support contract on Chromium shard 3; the unchanged shard retry passed on attempt 2.

Latest qualified runtime/package artifact: `C64-Dungeon-Carnage-Itch`, artifact ID `10575312850`, 21,111,070 bytes, GitHub Actions SHA-256 `6425e7f4cdd296843911c78e81a1545c661123bab726c4b2cdd9449d7334d73c`, workflow run `35414519473`, source/main `073ee3df35cd3982ceb04676619792d69a28e0e3`.

Repository status: **REPOSITORY-COMPLETE — #2185 / DEPLOYED AUTOMATED VERIFICATION GREEN / HANDS-ON PRODUCT ACCEPTANCE REMAINS**.

### Stage 4 elemental portal foundation — PR #2137 — MERGED

Qualified head: `030af6e9f8c2da98fb618c64ae276b1159adda3f`.

Merge commit/current main: `d3225318ff5cb87664bce96020c790099f53e06a`.

#2137 maps Water Floor 1→2, Fire 2→3, Earth 3→4 and Air 4→5 while preserving `run.floor`, `floorComplete()` and `descendFloor()` as the only campaign-depth owner. Portal discovery/unlock/traversal metadata remains inside the existing run/checkpoint object; legacy checkpoints infer already-earned unlocks without advancing floor state. Deterministic portal route seeds are now the stable handoff for later topology/zone work.

The final qualification also resolved two startup/UI ownership issues encountered while proving the candidate:

- Tutorial guidance no longer continuously fights the Stage 2 menu-order owner; it restores a missing/detached Tutorial button but leaves an existing Stage 2-managed button in place.
- V10.42 retains a narrow capture owner for Solo/Tutorial through the ready-state transition and hands buffered starts directly to the established Tutorial/Solo launch owner. Continue, Weekly and Split Screen retain their established ready-state handlers. This closes the deterministic immediate-start race without weakening the browser contract.

Exact-head qualification passed Native Mouse Wheel, Public Code Cache, Social Metadata, Mobile Trap Layout, Structured Data, SEO, CCG Site Safety and Lost Sizzler Load Safety. Load Safety passed canonical/Node, discovery and all six Chromium shards. Shard 5 initially hit the historical `v10-35-layout.mjs` startup wait; one unchanged targeted retry passed.

### Stage 5 larger procedural topology — HISTORICAL PRE-MERGE SNAPSHOT

Branch: `codex/dungeon-stage5-procedural-topology-current-main`.

Base: merged `main` `d3225318ff5cb87664bce96020c790099f53e06a`.

Ownership reconciliation before code changes:

- `world.js` is the authoritative topology generator (BSP partitioning, room carving, tree connections, optional bonus rooms and connectivity graph).
- R6 biome environment, R7 room objectives and R24 biome room grammar consume the generated world. R24 explicitly owns semantic metadata only and must not mutate topology, collision, progression, saves or networking.
- Stage 5 therefore extends `world.js` deterministically rather than adding a competing procedural overlay.
- The requested outcome is route variety, alternate paths, landmarks, purposeful dead ends, exploration decisions and floor-aware structure without simply increasing map dimensions.
- Required invariants include deterministic seeds, guaranteed start→exit reachability, optional content remaining non-blocking, unchanged authoritative floor/portal progression, checkpoint compatibility and supported Solo/Tutorial/Split behaviour.

### Stage 5 procedural topology — PR #2138 — MERGED

Qualified head: `819c820b1a908a0e5b20f69a2775b5b056b9ef74`.

Merge commit/current main: `94ae72bfbbc2bc9ee4ae58a01dc00e6bf37d4fa9`.

#2138 extended the authoritative `world.js` BSP generator with deterministic floor-aware alternate routes/loops, crossroads, purposeful dead ends and landmarks. It preserved the 128×84 dimensions, secret-space reservation, deterministic seed behaviour, existing gameplay RNG stream and guaranteed start→exit connectivity. R6/R7/R24 remain downstream consumers. Exact qualification passed all eight top-level workflows and all six Chromium shards without a retry.

### Stage 6 deeper zone-specific gameplay — HISTORICAL PRE-MERGE SNAPSHOT

Branch: `codex/dungeon-stage6-zone-gameplay-current-main`.

Base: merged `main` `94ae72bfbbc2bc9ee4ae58a01dc00e6bf37d4fa9`.

The first bounded slice adds `v10-42-stage6-zone-gameplay.js` after the established R14 combat/encounter bridge. It wraps the established `CCGSystems.decorate()` as a post-decoration consumer and uses deterministic floor/topology metadata to:

- vary ordinary enemy composition among existing supported AI kinds;
- give crossroads/alternate-route/dead-end rooms different combat pressure;
- vary real trap kinds and cycle periods by zone;
- vary dedicated-hazard type/cadence through existing hazard primitives;
- vary generator spawn cooldown through the existing generator primitive;
- attach floor-specific guardian/key-guardian pattern metadata and bounded cadence/movement tuning;
- expose encounter directives for downstream presentation/reward work.

Special enemies (followers, guardians/key guardians, stalkers, CCG boss, treasure goblin and Sigil/Warden owners) are excluded from ordinary retyping. The layer does not carve maps, advance floors/portals, own saves, use storage/network APIs or replace AI/combat authority.

The release/cache identity is advanced to `V10.42 r33` / `20260918r33` so cached clients cannot retain an r32 bootstrap that omits the new ordered module. Focused Stage 6 and r33 release-identity contracts are part of the candidate.

### Stage 6 deeper zone-specific gameplay — PR #2139 — MERGED

Qualified head: `d0eaaaa772101fbb4f4cd02f33a9d655e54d85ea`.

Merge commit/current main: `3cb65ffa1ad35a8a0ff5ce854829eba646e78c6b`.

#2139 adds the downstream Stage 6 zone-gameplay director while preserving topology, campaign, save, networking and combat authority. It varies ordinary enemy composition, real trap/hazard cadence, generator pressure, guardian/key-guardian patterns and encounter directives by floor/Stage 5 route role. Named followers, stalkers, guardians, CCG boss, treasure goblin and Sigil/Warden identities remain protected from ordinary retyping. Release identity is `V10.42 r33` / `20260918r33`. Exact-head qualification passed all eight top-level workflows, canonical/Node and all six Chromium shards.

### Stage 7 NPC / merchant integration — HISTORICAL PRE-MERGE SNAPSHOT

Branch: `codex/dungeon-stage7-npc-merchant-current-main`.

Base: merged `main` `3cb65ffa1ad35a8a0ff5ce854829eba646e78c6b`.

Ownership reconciliation before implementation:

- R15 already owns deterministic NPC identities, dialogue, rumours, optional quest specs and non-authoritative service offers.
- `systems.js` already places the real hidden trader and floor-entrance supply desk.
- `game-core.js -> buyShopItem()` already owns pricing, Score deductions, Artefact removal, Banishment Flask grants, inventory additions and per-shop price ladders.
- Stage 7 therefore binds R15 NPC identity/dialogue/service/quest metadata to those existing shops and observes successful transactions only. It must not become economy authority or alter the deferred Defect 5 exchange semantics.
- The ordered chain loads Stage 7 after R15 and before R16. Release/cache identity advances to `V10.42 r34` / `20260918r34`.
- Focused contracts prohibit Stage 7 from mutating Score, shop price ladders, sold state, inventory, progression, saves or networking.

### Stage 7 NPC / merchant integration — PR #2140 — MERGED

Qualified head: `e1141fb03e926efcf833268e03f1341dd6ec8fdb`.

Merge commit/current main: `f4fecd858fab8d43cd9d6732ab56495cfb313116`.

#2140 binds established R15 NPC identities/dialogue/service/optional quest metadata to the already-authoritative entrance and hidden dungeon shops. `buyShopItem()` remains the sole owner of prices, Score deductions, Artefact removal, inventory grants, sold state and price ladders. The deferred three-Artefact Banishment Flask exchange semantics were not rewritten. Release/cache identity is `V10.42 r34` / `20260918r34`. Exact-head qualification passed all eight top-level workflows, canonical/Node and all six Chromium shards.

### Stage 8 itch.io release preparation — PR #2141 — MERGED

Branch: `codex/dungeon-stage8-itch-release-current-main`.

Base: merged Stage 7 main `f4fecd858fab8d43cd9d6732ab56495cfb313116`.

Repository release ownership is deliberately separate from the canonical website runtime:

- the canonical website remains the branded landing/demo and owns CCG account/Weekly Vault services;
- a fresh package builder stages only `index.html`, `version.json`, `css/`, `js/` and `assets/` from current main;
- only the staged copy removes the two website-root Supabase bootstraps and the website Weekly client;
- an itch-only compatibility gate keeps Solo, Tutorial and local 2P Split Screen self-contained and hands Weekly Vault to the canonical CCG website;
- the package contains a SHA-256 file manifest tied to release/build/cache identity and source revision;
- a dedicated Chromium smoke must launch all three local supported modes from the staged package and reject local asset failures/page exceptions;
- a dedicated workflow produces the verified ZIP artifact without credentials or retired custom commerce.

No old PayPal checkout, browser paywall, entitlement/private-download backend, Windows wrapper or stale packaging branch is being merged. Historical package work is source material only.

Qualified head: `e5d4333d4e8dc2912b2ffc9c5abc13f79d4b4a2d`.

Merge commit/current main: `53cba902af9dbf1e118f3f274836120f6c30bb40`.

#2141 produced a verified standalone HTML5 ZIP without changing the canonical website runtime. The dedicated package workflow, Site Safety, cache/SEO/mouse-wheel checks, canonical/Node contracts and all six Chromium shards passed on the exact head. Load Safety shard 2 initially hit only the unchanged `v10-41-stage8-scout-persistence.mjs` startup wait; one unchanged targeted retry passed. The qualified package artifact is `C64-Dungeon-Carnage-Itch` (artifact ID `10533819282`, 21,109,428 bytes, SHA-256 `5bcb8a915490382327f16fba0ba6ea5dcc20e0b1ba9d156dfc5a5d2a438b3c38`).

Repository-side Stage 8 is complete. Public itch.io page creation, upload/publication and the final public URL are external release actions. The two existing Dungeon hands-on acceptance gates remain deferred and are not inferred from package qualification.

### #2129 release/cache ownership remediation

#2129 is **MERGED**. It corrected the current-build split generation without reopening #2118 projectile semantics.

The bounded production delta keeps the canonical page and runtime on one release generation:

- page build identity `V10.42 r30`;
- page cache identity `20260917r30`;
- all directly loaded Dungeon CSS/JS assets use `20260917r30`;
- `version.json` carries the same identity;
- the cache guard sees r30 before gameplay owners execute;
- the r30 bootstrap handoff and ordered module chain stay on the same cache token.

New regression coverage includes `v10-42-r30-release-cache-identity.mjs` plus the real-browser `v10-42-live-solo-combat-endurance.mjs`, which exercises generated enemies, real projectile/damage/death ownership, Space/F/Numpad0 firing, held/release cycles, movement between combat cycles, pause/resume recovery, simulation progress and bounded projectile/visual collections. The first CI attempt exposed only external Supabase/local-fixture CORS noise after the endurance exercise had completed; that fixture was isolated without weakening gameplay assertions, ownership assertions, collection bounds or timeouts.

### Stage 1 retired Spy startup ownership — PR #2131

The earlier 16 September residue note was too broad. It was true that the canonical page did not directly list the retired special-mode files, but the supported r30 startup handoff still dynamically preloaded three retired Spy/Saboteurs owners. PR #2131 corrected that actual ownership boundary rather than relying on filename assumptions.

The retired startup owners removed are:

- `v10-41-r30-spy-exit-control-reset.js`;
- `v10-41-r32-spy-world-owner.js`;
- `v10-41-r32-spy-loader.js`.

Investigation also proved that the historical chain was carrying supported responsibilities. #2131 therefore preserved those responsibilities explicitly:

- `v10-41-post-playtest-stability.js` — supported Solo fire-state recovery;
- `v10-41-r56-playtest-completion.js` — ordinary-dungeon environment/chest/combat recovery ownership;
- `v10-41-r59-live-regression-fixes.js` — pause/Solo stability ownership;
- `v10-41-horde-frame-performance.js` — despite its name, the loader/maintenance bridge for the supported Solo R60 live-play integrity owner; its Horde R60 polling timer is stopped in Solo;
- `v10-41-r60-horde-owner-composition.js` — despite its name, still protects supported Solo R60 maintenance and damage ancestry.

The first #2131 CI candidate exposed exactly this hidden ownership: one Solo soak saw the retired Horde frame-performance global disappear entirely, while selective-owner recovery could no longer see the supported R56/R60 integrity APIs. The tests were not weakened. The candidate was corrected by making supported ownership explicit while keeping the retired Spy startup owners absent.

The historical `v10-41-r32-solo-monitor-diagnostic.mjs` contract was then reconciled with the authorised retirement boundary. It no longer waits for the retired R32 Spy loader. It proves the retired loader/observer/assets remain absent in canonical Solo while R56/R59/R60 supported ownership remains present. Exact qualified #2131 head `21fed121ceb0f72278142ba201f25927c5c6b9b5` passed Public Code Cache Version, Native Mouse Wheel Scroll Contract, SEO Automation, canonical/Node contracts and all six Chromium shards. Chromium shard 5 initially hit the known `v10-35-layout.mjs` startup-wait flake; an unchanged retry passed, with no timeout, assertion or runtime weakening. #2131 merged as `3358cddc66725f75213c74dec7459551d8ff02b7`.

### Stage 1 retired fullscreen dispatch — PR #2134

#2134 is the active bounded follow-up from the #2131 merge.

The supported global `F` handler in `game-main.js` still looked up `CCGLostSizzlerV141R32SpyLoader.handleSpyFullscreenKey()` before falling through to fullscreen even though #2131 now guarantees that retired R32 loader is absent from supported startup. The real supported owner is `game-render.js → toggleFullscreen()`, which already owns the fullscreen button and the browser fullscreen API call.

#2134 therefore changes only the supported shared-input dispatch:

- `F` now calls `toggleFullscreen()` directly;
- the fullscreen button continues calling `toggleFullscreen()` directly;
- no retired Spy/Saboteur owner can intercept supported shared `F` input;
- fullscreen API behavior itself is unchanged;
- movement, firing, pause/resume, saves, combat, Banishment logic and R56/R59/R60 ownership are unchanged.

Focused static coverage prohibits the retired shared Spy dispatch while retaining the supported keyboard/button fullscreen owner. The browser contract fabricates a retired R32 Spy fullscreen handler and proves it cannot intercept `F`, while canonical `dungeon-solo` ownership stays active and both keyboard and button fullscreen paths still reach the supported shell owner.

The first #2134 Load Safety run exposed a stale historical assertion in `v10-41-r59-live-regression-fixes.mjs` that still required `game-main.js` to delegate shared `F` to the retired Spy helper. That assertion has been narrowed to the current supported boundary: direct `F → toggleFullscreen()` plus an explicit prohibition on a shared R32 Spy fullscreen dependency. All unrelated R59 pause-clock, Solo wall-time, diagnostics, autosave and recovery assertions remain unchanged.

Automated review also found that the original browser regression filename `v10-42-retired-spy-fullscreen-hook.mjs` matched the existing `/(?:horde|spy)/i` retired-mode filter in the Load Safety Chromium manifest and therefore would have been silently omitted from all six shards. The contract has been renamed to `v10-42-retired-fullscreen-owner.mjs`; the manifest itself is not weakened or broadened.

## Completed runtime stages

#2102, `codex/dungeon-carnage-extract-local-runtime`, is **MERGED**.

The merged stage:

- moved the retained local gameplay suffix from `game-network.js` into `game-local-runtime.js`;
- loaded `game-local-runtime.js` immediately after `game-network.js` and before `game-play.js`;
- preserved Solo, Tutorial, local 2P Split Screen, Weekly Vault/account, save/progression and established gameplay ownership;
- retained the queued early Solo/Split start repair discovered during qualification.

#2113, `codex/dungeon-carnage-retire-online-prefix-current-main`, is **MERGED**.

The merged stage:

- replaced obsolete packet routing, remote-player simulation and world serializer/receiver logic in `game-network.js` with inert compatibility owners;
- retained only the callback/function names required while RoomNetwork remains the local Solo/Split session shell;
- added/strengthened retirement contracts so the old packet, remote-player and world-sync behaviours cannot silently return;
- updated old multiplayer-era tests whose positive world-sync expectations directly contradicted the intentional retirement boundary;
- left retained combat, pickups, Banishment, inventory and XP ownership in `game-local-runtime.js`.

### #2113 merge qualification evidence

The exact #2113 head was green before merge across its PR-triggered checks:

- Lost Sizzler Load Safety — PASS
- Native Mouse Wheel Scroll Contract — PASS
- Public Code Cache Version — PASS

The first Load Safety attempt had one isolated Chromium shard-5 failure: `v10-35-layout.mjs` timed out during its initial startup wait while every later contract in that shard passed and shards 1, 2, 3, 4 and 6 were green. The unchanged shard-5 job was rerun after the workflow completed and passed. No timeout, assertion or production runtime code was weakened to obtain green.

### #2115 supported local Split Screen full map

#2115, `codex/rebuild-split-full-map-current-main`, is **MERGED**. It restores the full explored-map panel for local Split Screen, retains P1 exploration knowledge as the shared map view, makes `M` ignore held-key repeats, and uses a dedicated `fullmap` non-playing mode so pause-recovery layers cannot mistake the overlay for an orphaned pause. Its exact head passed all current PR checks. The first Chromium shard-3 run failed only in the pre-existing `v10-28-browser-stability-deterministic.mjs` startup wait; the unchanged shard retry passed, with no test weakening or unrelated runtime change.

### #2117 public-beta/watchdog remediation

#2117 is **MERGED**. Exact qualified head `23bd55e28d1367ad84bb82e22af08e16a2bc9b4f` merged as `408a9870d33f9ea2931934c302176743d2589160`. It removed the obsolete public-host closed-beta ownership from `v10-41-load-watchdog.js` while preserving site account/authentication ownership and current game startup.

### #2118 projectile lifecycle remediation

#2118 is **MERGED**. It adds an ordered V10.42 projectile lifecycle owner that retires non-piercing enemy/generator impacts before downstream callbacks and sweeps expired player/enemy projectiles from a `finally` boundary. It preserves fire delay, rapid-fire cadence, projectile allowance, projectile TTL, held-fire ownership and room/run cleanup. Exact-head regression covered sustained fire, repeated impacts and downstream enemy-death faults.

## Retired-mode residue audit — corrected 17 September 2026

The 16 September audit correctly established that `game-network.js` is the intentionally inert local-session compatibility boundary from #2113 and that Horde/Saboteur product modes are retired. It overstated the startup result by saying no retired Horde/Spy module was loaded by the supported runtime. Stage 1 reconciliation proved that r30 still dynamically preloaded three retired Spy startup owners even though they were absent from the canonical page script list.

Historical Horde/Spy source files and acceptance records remain in the repository as evidence. They must not be removed solely because of their names: #2131 proved that two Horde-named compatibility layers still deliver supported Solo R60 ownership. Old `playMode === "online"` conditional guards also remain inside retained local gameplay ownership; removing them requires a separate focused contract and must not be folded into unrelated terminology, topology, NPC, commerce or menu work.

## Retired stale/superseded runtime PRs

| PR | Classification | Current state |
| --- | --- | --- |
| #2062 | **SUPERSEDED** by merged #2098 R24 refresh | Closed without merge |
| #1960 | **SUPERSEDED** by merged/current XP-source boundary | Closed without merge |
| #1959 | **OBSOLETE PRODUCT-MODE WORK** after Spy retirement | Closed without merge |
| #1998 | **SUPERSEDED DOCUMENTATION** by merged #2100 work register | Closed without merge |
| #2055 | **STALE SOURCE MATERIAL** | Closed without merge. Rebuild only still-valid presentation ideas on current `main`. |
| #1983 | **STALE / REPRODUCTION REQUIRED** | Closed without merge. Revisit only if the startup-overlay defect reproduces on the current deployed build. |
| #1978 | **STALE VERIFICATION CHILD** of #1976 | Closed without merge; historical soak evidence remains in Git history. |
| #1980 | **STALE DOCUMENTATION CHILD** of #1978 | Closed without merge; evidence remains in Git history. |
| #1898 | **HISTORICAL PRODUCTION-SMOKE DIAGNOSTIC** | Closed without merge. |
| #1900 | **HISTORICAL TEST FOLLOW-UP** to #1898 | Closed without merge. |
| #2120 | **SUPERSEDED DEFECT 3 MOVEMENT WRAPPER** | Closed without merge; #2119 contains the proven owner fix. |
| #2122 | **DIAGNOSTIC-ONLY DEFECT 4 BRANCH** | Closed without merge; #2123 contains the bounded fix. |

### Other unresolved candidates outside the seven-item defect programme

- #1976 (R30 ownership-audit throttle) may contain a useful optimisation idea, but it must be re-derived against current `main`; its old branch is not the integration vehicle.
- #1860 and #1852 are historical long-running containment/stabilisation branches and are not safe bases for new runtime work. Their broader non-runtime implications must be reconciled separately before any closure or extraction decision.

## Guardrails and exact next action

Preserve Solo, Tutorial, local 2P Split Screen and Weekly Vault/account services. Do not restore retired networked Dungeon Multiplayer, Horde Survivor or Spy/Sizzler Saboteurs behaviour. Do not reopen completed Defects 1, 2, 3, 4, 6 or 7 without new current-build regression evidence. Preserve #2118 projectile lifecycle ownership, #2129 release/cache discipline, the supported R56/R59/R60 startup ownership established by #2131, and the retained R19 trap-damage boundary established through #2193.

Repository coding for the currently reproduced Dungeon defects is complete. The remaining gates are hands-on product acceptance:

- current deployed startup/menu transition after #2193;
- sustained Solo movement/firing/combat/pause-resume stability;
- 3 Artefacts/Essences → 1 Banishment Flask without prior Gold purchase, with Gold and Score unchanged;
- deployed mobile natural spike/fire/shock damage with one HEALTH removed and armour preserved.

Exact next Dungeon action:

1. retest the deployed startup transition on current post-#2193 main;
2. complete sustained Solo acceptance;
3. complete the three-Artefact/Essence Banishment Flask exchange acceptance;
4. complete deployed mobile natural-trap acceptance;
5. after all hands-on gates pass, use the latest qualified itch.io artifact and complete the external itch.io page/upload/launch verification;
6. do not create another Dungeon coding stage unless one of those hands-on checks exposes a reproducible current-build defect.

## Historical live-defect remediation checkpoint — 16 September 2026

At this earlier checkpoint #2117 had closed the obsolete public-beta watchdog/menu-lock defect and the remaining queue was projectile accumulation, floor progression, save/restore, Banishment Flask exchange, firearm differentiation and RPG terminology. Those repository-side items have since advanced as recorded in the current checkpoint above.

### Historical Defect 2 candidate — PR #2118

Branch `codex/dungeon-projectile-lifecycle-current-main` was created from exact live `main` `408a9870d33f9ea2931934c302176743d2589160`. Investigation found one authoritative player-projectile collection, `bullets`, shared by simulation and rendering. The legacy projectile owner marked TTL dead on impacts but deferred physical removal until the end of the complete `stepProjectiles()` pass. The r29 runtime intentionally catches recoverable `update()` faults and continues the loop, so a hit/death callback fault could bypass that deferred sweep. Both projectile rendering and dynamic lighting iterate the retained authoritative entries. Existing R1 stale-projectile repair only marked old bullets dead and still depended on the same sweep.

#2118 added an ordered V10.42 projectile lifecycle owner that retires non-piercing enemy/generator impacts before downstream callbacks and sweeps expired player/enemy projectiles from a `finally` boundary. Focused deterministic coverage included direct enemy hits, 500 repeated impacts, an enemy-death callback fault and 2,400 sustained-fire ticks; the established Chromium held-fire contract remained part of the matrix.

## Session log

- 2026-09-21: Qualified and merged final polish #2222 from exact head `d27d714f5d15757e360ce27b49b4d185e379e56d` as `cbbf9a97eb1f83c21eea3a519fd707af28be22bd`. All triggered workflows passed. Load Safety shard 1 first completed the sustained Solo soak, live combat endurance and five-minute mobile FIRE soak before an unchanged post-soak `#resume-btn` locator timeout; one unchanged failed-job retry passed canonical/Node and all six Chromium shards. No runtime, gameplay assertion or timeout was weakened.

- 2026-09-20: Qualified and merged #2193 from exact head `03333f6e89381e018197b990664a1e25205e8f78` as `992d19d39cd5ad7d5fb12116dda03d80df623e61`, closing the remaining mobile natural-trap detached/global damage-owner race. All required workflows passed; Load Safety shard 4 passed on one unchanged retry after the first attempt sampled a shock crossing only 36.5 ms from the active-phase boundary. Superseded documentation PR #2191 was closed without merge and a fresh post-#2193 reconciliation was started.
- 2026-09-20: Merged bounded post-#2193 reconciliation #2194 from exact head `d92fda632216cd0e109a458e7094b4f94fada29c` as `28f0815f9e849090783cd78792c26fcdc8cc5cb9`. Scope was progress/continuation documentation plus the natural-trap browser probe only. Exact-head package/cache/mouse-wheel/SEO qualification passed; Load Safety passed after one unchanged targeted shard-6 retry for an unrelated V10.36 loading-progress sample of 92% instead of 100%. No runtime, assertion or timeout was weakened.

- 2026-09-16: Reclassified #2062, #1960, #1959 and #1998 as superseded/obsolete; they were closed without merge.
- 2026-09-16: Qualified #2102 head `dcb35f3e...`, including a successful unchanged rerun of one transient Site Safety/WebDriver timeout; merged #2102 and completed retained local-runtime extraction.
- 2026-09-16: Closed stale runtime/verification integration candidates #1978, #1980, #2055, #1983, #1898 and #1900 without merge while preserving their history/source material.
- 2026-09-16: Updated #2113's canonical tests to retire obsolete positive world-sync expectations rather than restoring retired online behaviour.
- 2026-09-16: Qualified #2113 head `2fa216c6...`; one transient `v10-35-layout` shard timeout passed on an unchanged targeted retry.
- 2026-09-16: Merged #2113 as `c3549e6d45b7748f1efcf5c4f4ba134200325a5f`. Obsolete packet/world-sync runtime retirement is complete.
- 2026-09-16: Closed stale #1902 and rebuilt its still-valid local Split Screen map behaviour as #2115 on current `main`. The exact head `30c58717...` passed the complete matrix after an unchanged retry of an unrelated `v10-28-browser-stability-deterministic.mjs` startup timeout; #2115 merged as `95bd8431fd6b8313bf5873a79bd4bc93404d8de9`.
- 2026-09-16: Completed the bounded current-main retired-mode residue audit at `e9adbd16...`; Stage 1 later corrected its too-broad conclusion about dynamically preloaded Spy owners.
- 2026-09-16: Qualified #2117 exact head `23bd55e2...` and merged the public-beta/watchdog remediation as `408a9870d33f9ea2931934c302176743d2589160`.
- 2026-09-16: Qualified and merged #2118, closing the retained-projectile/progressive-slowdown repository defect.
- 2026-09-17: Qualified and merged #2119, correcting the optional Warden completion guard while preserving the genuine floor-transition owner chain; redundant #2120 closed without merge.
- 2026-09-17: Qualified and merged #2123, repairing Floor 1 Save & Return / Continue ownership and failed-write safety; diagnostic #2122 closed without merge.
- 2026-09-17: Reconfirmed #2090 owns both physical-Artefact and current Essence Banishment Flask exchange paths on current main; repository-side Defect 5 work is complete, with deployed/manual acceptance still outstanding.
- 2026-09-17: Qualified and merged #2125, exposing meaningful Owned Firearms differences through the existing selector without changing weapon mechanics.
- 2026-09-17: Qualified and merged #2126 at exact head `f70f816910fab8d07aaf946f140b593c9220f1ef`; all retained workflows and all six Chromium shards passed.
- 2026-09-17: Reconciled `docs/AI-CONTINUATION-STATE.md` and `arcade/lost-sizzler/PROGRESS.md` after Defect 7. The remaining next action at that checkpoint was Defect 5 deployed/manual acceptance.
- 2026-09-17: Reproduced a later current-build Solo freeze/stopped-firing regression, proved split release/cache ownership rather than a return of #2118, qualified #2129 exact head `585cda263e2f0c9a626fef61d19bae9635d2087f`, and merged it as `218025ce2beac3765d65ca9b838e8afd58a5eedf`.
- 2026-09-17: User explicitly deferred both remaining hands-on acceptance gates. Independent Stage 1 work began on #2131; the first candidate exposed hidden R56/R60 supported ownership previously reached through retired special-mode startup ancestry, and the candidate was corrected without restoring the retired Spy startup owners or weakening tests.
- 2026-09-17: Reconciled the stale R32 Solo-monitor contract, qualified #2131 exact head `21fed121ceb0f72278142ba201f25927c5c6b9b5` across all required workflows and all six Chromium shards, used one unchanged shard-5 retry for the historical `v10-35-layout.mjs` startup flake, and merged #2131 as `3358cddc66725f75213c74dec7459551d8ff02b7`.
- 2026-09-17: Began #2134 from the #2131 merge to remove the dead shared Spy fullscreen pre-dispatch. Initial CI exposed the stale R59 fullscreen assertion; review also proved the first browser-contract filename was filtered from Chromium by the retained-mode manifest. Both findings were corrected without restoring retired behavior or weakening supported R59 ownership.

- 2026-09-18: Stage 5 #2138 qualified at `819c820b1a908a0e5b20f69a2775b5b056b9ef74` and merged as `94ae72bfbbc2bc9ee4ae58a01dc00e6bf37d4fa9` with all eight workflows and all six Chromium shards green. Stage 6 began from that exact merge with the bounded r33 zone-gameplay owner.
- 2026-09-18: Startup/first-visual PR #2145 qualified on exact head `432af71f6d19612a54e274f9114c6b3ef35e7450` with all eight triggered workflows green, including all six Chromium shards, and merged as `4c56d2bccd73350359c8b3246b0d70142894d353`. The flicker remediation is repository-complete; both manual product gates remain deferred.
