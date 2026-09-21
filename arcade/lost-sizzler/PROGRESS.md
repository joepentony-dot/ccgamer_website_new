# C64 Dungeon Carnage — Current Work Register

> Legacy repository path: `arcade/lost-sizzler/`. The customer-facing game name is **C64 Dungeon Carnage**. Historical internal identifiers may still use `Lost Sizzler` where compatibility requires them.

## Audit checkpoint

- Audited: **21 September 2026**.
- Latest verified Dungeon runtime merge checkpoint is #2205: exact qualified head `dac8819a646dfd9ec0e0669f669903157a280ff6`, merged as `eb25ee72f9c8f2d409e3b8ea7be9ec69240c8f89`. It preserves #2201's mobile trap/menu repairs and raises the mobile-only Solo/Tutorial camera from 1.3x to 1.6x after deployed evidence showed the first zoom was still too small; desktop and local 2P remain 1x. Build/cache are `V10.42 r38` / `20260921r38`.
- #2190 is merged as `fab013b320ebdb1d9f2cb873ad26a3588f565655`, making Tutorial mandatory for first-time Solo players with an explicit skip while keeping the mobile D-pad unobstructed.
- The seven-item repository-side live-defect remediation programme remains complete through #2117, #2118, #2119, #2123, #2090, #2125 and #2126; the later freeze/stopped-firing regression remains repository-fixed through #2129.
- The user-reproduced mobile naturally-generated trap defect is **REPOSITORY-COMPLETE THROUGH #2201 / DEPLOYED RETEST REQUIRED**. #2188 established real-touch natural fire/spike/shock coverage, #2192/#2193 repaired earlier ownership races and #2198 corrected the active-trap probe. A later live mobile reproduction proved a late visible `hurtPlayer` owner could still swallow trap-labelled damage. #2201 now routes caller-validated active floor contacts through the retained canonical damage/death owner while preserving armour and duplicate-contact protection. Active floor traps are required to remove exactly one HEALTH while armour remains unchanged.
- Exact #2193 qualification passed CCG Site Safety, SEO Automation, C64 Dungeon Carnage itch.io Package, Public Code Cache Version, Native Mouse Wheel Scroll Contract, the dedicated Mobile Trap Layout static/live jobs, canonical/Node contracts and all six Load Safety Chromium shards. The first shard-4 attempt saw one shock contact sampled with only 36.5 ms left in its active phase; an unchanged shard-4 retry on the same exact head passed. No runtime, assertion or timeout was weakened for the retry.
- The current qualified runtime publication candidate is `C64-Dungeon-Carnage-Itch`, artifact ID `10619910820`, 21,113,583 bytes, GitHub Actions SHA-256 `d9c38662244d2a3de40c2f5eeddcdd594e863eb222dfc5ac2b5beb650bf0b624`, workflow run `35553635187`, exact source head `dac8819a646dfd9ec0e0669f669903157a280ff6`, merged by #2205 as `eb25ee72f9c8f2d409e3b8ea7be9ec69240c8f89`.
- Post-runtime reconciliation #2194 merged from exact head `d92fda632216cd0e109a458e7094b4f94fada29c` as `28f0815f9e849090783cd78792c26fcdc8cc5cb9`. It changed only this register, continuation documentation and the natural mobile-trap browser probe. Package/cache/mouse-wheel/SEO qualification passed; Load Safety passed after one unchanged targeted shard-6 retry for an unrelated V10.36 loading-progress sample. The qualified runtime publication candidate above therefore remains the #2193 artifact.
- Startup/first-visual remediation remains repository-complete through #2185. The previously recorded deployed production-smoke result remains evidence for that startup chain but does not substitute for a hands-on retest on current post-#2193 deployment.
- Documentation PR #2191 was closed without merge as superseded because it incorrectly recorded #2192 as the final mobile-trap checkpoint.
- A merged PR is not treated as product-complete for a user-reproduced defect where this register explicitly requires deployed/manual acceptance.

### Outstanding manual acceptance

The unresolved hands-on checks are:

1. **Startup on current post-#2193 main** — loading must transition directly to the final V10.42 menu with no compact/intermediate menu flash and no loader → page → loader pulse; the stale-browser update path must retain the current Update Available label through V10.42 identity restamps.
2. **Sustained Solo after #2129** — meaningful movement/firing/combat session including pause/resume, with no freeze, input loss or stopped-firing regression.
3. **Defect 5 Banishment Flask exchange** — obtain three Artefacts/Essences, do not buy a Gold Flask first, receive exactly one Banishment Flask, and verify Gold and Score remain unchanged.
4. **Mobile natural traps after #2193** — on the deployed mobile build, cross naturally generated active spike/fire/shock traps and confirm each real active contact removes one HEALTH while armour remains unchanged.

Automated tests do not substitute for these product gates.

## Authoritative live-defect programme status — 17 September 2026

| Priority | Defect | Status |
| --- | --- | --- |
| 1 | Public-beta watchdog replaces the final menu with COMING SOON and disabled controls after initial paint. | **REPOSITORY-COMPLETE — #2117** |
| 2 | Sustained firing/enemy hits retain projectile entities and progressively slow the game. | **REPOSITORY-COMPLETE — #2118** |
| 3 | Completion portal does not advance Floor 1 to the next campaign depth. | **REPOSITORY-COMPLETE — #2119** |
| 4 | Save and Exit does not restore a supported run through Continue. | **REPOSITORY-COMPLETE — #2123** |
| 5 | Three-Artefact Banishment Flask exchange only works after a Gold purchase. | **VERIFYING — repository path complete through #2090; manual acceptance deferred** |
| 6 | Owned Firearms do not communicate meaningful weapon differences. | **REPOSITORY-COMPLETE — #2125** |
| 7 | Remaining Sizzler/Zzap!/Uncommon RPG wording needs coherent setting-appropriate replacement. | **REPOSITORY-COMPLETE — #2126** |

## Post-program live regression — freeze / stopped firing

After the seven-item repository programme completed, the deployed/current V10.42 r30 build reproduced a separate Solo failure where gameplay could freeze/stall and/or firing could stop before the outstanding Defect 5 shop acceptance could be reached.

PR #2129 proved a split release/cache identity on the canonical page. The authoritative V10.42 bootstrap used `V10.42 r30` / `20260917r30`, while the blocking page still identified and directly loaded the base runtime stack under `2026.09.10.1` / `20260910r1`. That allowed a supported mixed-generation path in which stale base frame/input/attack owners could coexist with current r30 ordered modules even though the visible badge later showed r30.

#2129 synchronised the blocking page build/cache identity, direct Dungeon CSS/JS query tokens and `version.json` to r30. It did not change projectile lifecycle mechanics, firing cadence, movement semantics, save data, supported mode ownership or Defect 5 shop logic.

- Exact qualified #2129 head: `585cda263e2f0c9a626fef61d19bae9635d2087f`.
- Merge commit: `218025ce2beac3765d65ca9b838e8afd58a5eedf`.
- All seven PR-triggered exact-head workflows passed before merge.
- The exact PR head also received a successful Cloudflare preview deployment.
- Detailed checkpoint: `docs/ai-work/dungeon-carnage-live-freeze-cache-2026-09-17.md`.

Repository status: **REPOSITORY-COMPLETE — #2129**. Product-level status remains **VERIFYING — MANUAL ACCEPTANCE DEFERRED**.

## Stage 1 — retired mode / legacy residue audit

PR #2131 is **MERGED**.

The earlier 16 September audit was too broad when it stated that the supported runtime did not load retired Horde/Spy modules. The canonical page did not directly list those special-mode files, but the r30 startup handoff still dynamically preloaded three retired Spy/Saboteurs owners.

#2131 removed supported-startup preloading of:

- `v10-41-r30-spy-exit-control-reset.js`;
- `v10-41-r32-spy-world-owner.js`;
- `v10-41-r32-spy-loader.js`.

Ownership investigation proved that historically named special-mode layers were also carrying supported responsibilities. Those supported responsibilities remain explicitly loaded rather than deleted by filename:

- `v10-41-post-playtest-stability.js` — supported Solo fire-state recovery;
- `v10-41-r56-playtest-completion.js` — ordinary-dungeon environment/chest/combat recovery ownership;
- `v10-41-r59-live-regression-fixes.js` — supported pause/Solo stability ownership;
- `v10-41-horde-frame-performance.js` — despite its name, still loads/maintains the supported Solo R60 live-play integrity owner and stops its Horde R60 polling timer outside Horde;
- `v10-41-r60-horde-owner-composition.js` — despite its name, still protects supported Solo R60 maintenance/damage ancestry.

The first #2131 CI candidate exposed this hidden dependency: the Solo soak lost the Horde-frame compatibility API, while selective-owner recovery could no longer see the supported R56/R60 integrity owners. The tests were not weakened and no retired mode was restored; the candidate was corrected by making supported ownership explicit.

The stale `v10-41-r32-solo-monitor-diagnostic.mjs` contract was also reconciled rather than timed out or deleted. Its final replacement proves the retired R32 loader/observer and retired Spy assets remain absent during canonical Solo while R56/R59/R60 ownership stays present. Exact qualified #2131 head `21fed121ceb0f72278142ba201f25927c5c6b9b5` passed Public Code Cache Version, Native Mouse Wheel Scroll Contract, SEO Automation, canonical/Node contracts and all six Chromium shards. One unchanged shard-5 retry was required after the historical `v10-35-layout.mjs` 15-second startup wait flaked; the retry passed without changing runtime code, assertions or timeouts. #2131 merged as `3358cddc66725f75213c74dec7459551d8ff02b7`.

PR #2134 is the next bounded Stage 1 candidate. It removes the now-dead `CCGLostSizzlerV141R32SpyLoader.handleSpyFullscreenKey()` pre-dispatch from supported `F` fullscreen input while leaving the real `toggleFullscreen()` owner and fullscreen button behavior unchanged. Static and browser contracts protect that boundary; no retired Spy runtime is restored.

### Stage 4 elemental portal foundation — PR #2137 — MERGED

#2137 merged from exact qualified head `030af6e9f8c2da98fb618c64ae276b1159adda3f` as `d3225318ff5cb87664bce96020c790099f53e06a`. It does not create a second progression system.

- Water is the route from Floor 1 to Floor 2; Fire 2→3; Earth 3→4; Air 4→5.
- `run.floor`, `floorComplete()` and `descendFloor()` remain authoritative for campaign depth.
- Portal discovery, unlock and traversal metadata is stored inside the existing run object so the established checkpoint payload carries it.
- Older checkpoints infer portal unlocks only from already-proven campaign depth; loading them does not advance the floor.
- Deterministic route seeds are the handoff for later topology/zone work.
- Ordered bootstrap placement is immediately after the five-depth campaign owner and before split-campaign state.
- Focused Node coverage protects route order, legacy checkpoint compatibility and the no-parallel-progression boundary.
- Initial exact-head CI was green, but automated review correctly identified that the new bootstrap module was still hidden behind the previously deployed r30 cache identity. The branch now advances to `V10.42 r31` / `20260917r31` and replaces the r30 release-identity contract with an r31 contract that also proves the historical r30 handoff derives the canonical cache token.
- Final exact-head qualification passed all eight top-level workflows and all six Chromium shards. The deterministic immediate Solo/Tutorial browser regression is green on the qualified head; the historical shard-5 layout timeout passed on one unchanged targeted retry.
- The two manual product gates remain deferred and are not inferred from this milestone.

### Defect 7 final terminology boundary

PR #2126 preserved the historical rarity identities used internally for progression/save compatibility while replacing only player-facing labels:

- `UNCOMMON` → `RARE`
- `SIZZLER` → `ENCHANTED`
- `GOLD MEDAL` → `RELIC`
- `ZZAP! 97%` → `LEGENDARY`
- visible `Zzap! Citadel guardian` → `Citadel guardian`

The exact candidate head `f70f816910fab8d07aaf946f140b593c9220f1ef` passed all retained exact-head workflows, including canonical/Node qualification and all six Chromium shards, before merge. Detailed record: `docs/ai-work/dungeon-carnage-rpg-terminology-2026-09-17.md`.

## Status definitions

- **PRESENT** — implementation is on audited `main` and no current contrary reproduction is recorded.
- **OPEN** — requested outcome is not complete.
- **PARTIAL** — a foundation is present, but requested follow-on work remains.
- **VERIFYING** — implementation and automated coverage exist, but required live/manual acceptance is still outstanding.
- **REPOSITORY-COMPLETE** — bounded repository correction is merged and qualified; any separately documented deployment/manual acceptance gate still applies.
- **SUPERSEDED** — no longer part of the intended release path.
- **QUEUED SEPARATELY** — valid repository work deliberately isolated from Dungeon Carnage runtime changes.

## Present on audited main

| Area | Status | Current evidence / boundary |
| --- | --- | --- |
| Supported release modes | PRESENT | Solo, Tutorial and local 2P Split Screen remain supported gameplay modes. Weekly Vault/account services remain supported menu/account functionality. |
| Retired online entry/lobby | PRESENT | Networked Dungeon Multiplayer entry/lobby controls are removed and obsolete hard startup bindings are detached. Horde Survivor and Spy/Sizzler Saboteurs are retired product modes. |
| Retained local runtime extraction | PRESENT | #2102 moved the active local gameplay suffix from `game-network.js` into `game-local-runtime.js`, preserving supported local gameplay ownership. |
| Retired multiplayer runtime removal | PRESENT | #2113 replaced the obsolete online packet routing, remote-player simulation and world serializer/receiver layer in `game-network.js` with inert compatibility owners. Regression contracts prohibit that retired transport/world-sync behaviour from returning while preserving the local RoomNetwork session shell still used by supported modes. |
| Local Split Screen full map | PRESENT | #2115 restored the explored full dungeon map for supported local Split Screen while keeping the established P1 exploration knowledge and local input ownership intact. |
| Five-depth campaign foundation | PRESENT | The ordered V10.42 bootstrap loads the five-depth campaign and floor-balance layers. |
| Five-depth environment identity | PRESENT | R6 supplies distinct Threshold, Iron, Bone, Ash and Sigil environment identities. |
| Five-depth room grammar | PRESENT | #2098 adds R24 deterministic room identities, landmarks, route moods, approach cues, foreshadowing and role/rare-role grammar. R24 is semantic metadata only and does not claim simulation, collision, progression, save or network ownership. |
| RPG build focus / stat-10 specialisations | PRESENT | The R23 build-focus/specialisation chain remains present for Vitality, Agility, Endurance and Arcana while preserving established floor caps. |
| Local Split Screen campaign state | PRESENT | Local 2P campaign state remains supported and must be preserved during later cleanup. |
| XP source boundary | PRESENT | Progression XP remains intended for combat and explicit XP rewards rather than ordinary doors, switches, chests or traps. |
| Gold economy | PRESENT | Ordinary shop stock uses Gold with its existing pricing. The separate 10 Gold Banishment Flask route remains available. |
| Public game identity | PRESENT | #2090 keeps the visible runtime subtitle at `C64 DUNGEON CARNAGE — V10.42`; historical internal/path identifiers remain only where compatibility requires them. |
| Startup first-visual ownership | **REPOSITORY-COMPLETE — #2145** | The canonical release loader exists before the game shell with render-blocking loader CSS, while the visible R55 button presentation is present before reveal. Exact head `432af71f...` passed the full triggered matrix and merged as `4c56d2bc...`. |
| Owned Firearms differentiation | PRESENT | #2125 exposes meaningful firearm differences already present in runtime data without changing acquisition, switching or combat ownership. |
| RPG rarity terminology | PRESENT | #2126 reconciles player-facing rarity/objective terminology while retaining historical internal rarity keys for compatibility. |
| NPC/content foundations | PRESENT | Existing R7–R16 layers provide room objectives, breakables, encounter direction/progression, combat bridging, NPC data and environment presentation. This is a foundation, not completion of the wider NPC/merchant request. |
| Warden expansion | PRESENT | Warden purpose, domain progression, cleansing, charge routes, hunt guidance, navigation cues and interface consistency remain in the ordered bootstrap. |
| Weekly Vault/account surface | PRESENT | Weekly Vault/account functionality remains available and is protected from retired-mode cleanup. |

## Merged work still awaiting live acceptance

| Area | Status | Remaining acceptance |
| --- | --- | --- |
| #2129 freeze/stopped-firing regression | **VERIFYING — DEFERRED** | Future live confirmation must cover sustained Solo movement, real enemy combat, repeated firing/hold/release cycles and pause/resume without firing stopping or the game freezing/stalling. |
| 3-Artefact Banishment Flask exchange | **VERIFYING — DEFERRED** | Future live confirmation must prove three Artefacts/Essences exchange for exactly one Banishment Flask without a prior Gold Flask purchase while Gold and Score remain unchanged. |

## Partially completed work

| Area | Status | Remaining work |
| --- | --- | --- |
| Banishment terminology | **PARTIAL** | Runtime and customer-facing layers still contain a mixture of Artefact, Essence, Vessel and Ward-Break wording. Stage 3 may audit and safely reconcile presentation-only terminology while avoiding semantic/data migrations that depend on the deferred live exchange result. |
| NPC / merchant expansion | **PARTIAL** | NPC dialogue/quest data exists, but deeper world integration, merchant/service behaviour and finished reward/content flows remain. |
| Startup/menu simplification | **PARTIAL** | Useful presentation ideas from the now-closed stale #2055 candidate may still be re-derived. Rebuild only valid pieces as small current-main stages; do not restore retired online modes. |
| Final release qualification | **VERIFYING** | A fresh supported-mode acceptance pass is required after remaining product/release work. |

## Requested work not yet implemented

These are post-defect product/backlog items. They are **not** additional defects in the completed seven-item remediation programme.

| Area | Status | Required outcome |
| --- | --- | --- |
| Four elemental portals | **PARTIAL — FOUNDATION MERGED #2137** | Campaign-state foundation is merged: Water maps Floor 1→2, Fire 2→3, Earth 3→4 and Air 4→5, with save/checkpoint persistence and deterministic route seeds. Large visual portal rooms and deeper zone-specific mechanics remain subsequent work. |
| Larger/grander procedural topology | **REPOSITORY-COMPLETE — #2138** | Stage 5 is merged: the authoritative `world.js` generator now adds deterministic floor-aware alternate routes, loops, crossroads, purposeful dead ends and landmarks while preserving 128×84 dimensions, seed stability, secret-space reservation and start→exit reachability. |
| Deeper zone-specific content | **REPOSITORY-COMPLETE — #2139** | Stage 6 is merged: ordinary enemy composition, trap/hazard mechanics, generator pressure and guardian patterns now vary by floor and Stage 5 route role while preserving special identities and established combat/progression ownership. |
| Finished NPC/merchant integration | **REPOSITORY-COMPLETE — #2140** | Stage 7 is merged: named R15 NPCs are bound to existing entrance/hidden shops with contextual dialogue plus optional quest/service hooks while the existing shop transaction/economy owner remains authoritative. |
| itch.io release handoff | **REPOSITORY-COMPLETE — #2141; EXTERNAL PUBLICATION PENDING** | The fresh current-main HTML5 artifact is qualified and merged. It excludes website-root account bootstraps and retired custom commerce, keeps Solo/Tutorial/2P Split Screen self-contained, hands Weekly Vault back to the CCG website, and records file hashes/build identity. Public itch.io page creation/upload/final URL remain external. |

## Superseded work

The old PayPal-specific checkout/paywall/download plan is **SUPERSEDED** and its historical PR graph has been closed without merge. The old provider-neutral packaging/Windows PR stack has also been retired as an integration vehicle; reusable ideas remain available in Git history and must be re-derived against current `main` for the itch.io release.

Horde Survivor, Spy Vs Spy/Sizzler Saboteurs and networked Dungeon Multiplayer are retired product modes. Historical files/tests may still reference them as compatibility or evidence, but their old feature backlog, menu entries, leaderboards and online product flows are not active release requirements.

## Historical evidence

`STABILIZATION_DEFECTS.md` preserves the earlier Solo stabilization programme and its frozen evidence/exit criteria. It is **not** the current Dungeon Carnage backlog. Historical Horde/Spy/online-mode references in that ledger document past testing and do not reactivate those retired modes.

## Separate queued repository work

- Content Publisher 3D-box optimisation is complete through merged #2105; superseded #2073 is closed.
- Game-music Worker endpoint follow-up #2110 is tracked separately and remains blocked by Cloudflare account-side runtime/build configuration; it is not a Dungeon runtime prerequisite.

## Current work order

1. **Stage 1 retired-mode / legacy-residue cleanup — COMPLETE.** #2134 and #2135 are merged; general residue cleanup is backlog unless it blocks a player-facing milestone.
2. **Stage 2 — startup/main-menu polish — COMPLETE.** #2136 is merged and the #2127 first-paint/flicker protections remain intact.
3. **Stage 3 — Banishment terminology preparation — DEFERRED / FOLD INTO SAFE CONTENT WORK.** Keep save-compatible internal identifiers stable and avoid semantic migrations that depend on the deferred Flask acceptance.
4. **Stage 4 — Water / Fire / Earth / Air portal architecture — FOUNDATION COMPLETE.** #2137 is merged; preserve the five-depth campaign as the sole floor-progression owner and build later visual/mechanical portal work on its saved route state.
5. **Stage 5 — larger procedural world structure — COMPLETE.** #2138 is merged and qualified; `world.js` remains the topology owner.
6. **Stage 6 — deeper zone-specific gameplay — COMPLETE.** #2139 is merged and qualified; keep its downstream zone director subordinate to topology, campaign, save and combat owners.
7. **Stage 7 — NPC / merchant integration — COMPLETE.** #2140 is merged and qualified; keep merchant presentation subordinate to `buyShopItem()` and the established economy/exchange owners.
8. **Stage 8 — itch.io release preparation — COMPLETE.** #2141 is merged and qualified; the standalone HTML5 artifact is repository-ready and the retired custom commerce/desktop delivery stack remains excluded. Public itch.io publication is external.
9. **Startup/first-visual remediation — REPOSITORY-COMPLETE THROUGH #2185 / PRODUCTION SMOKE STRENGTHENED THROUGH #2199 / MANUAL RETEST REMAINS.** #2145 established first-paint loader ownership, #2153 prevented reveal before final V10.42 menu composition, #2164 removed the transient legacy release-ready CSS hide, #2180 closed the premature run/tutorial active-state bypass, #2181 aligned the production smoke to r34, #2182 protected the stale-build Update Available badge from the legacy brand observer, and #2185 protected that badge from later V10.42 bootstrap restamps. #2199 adds rendered-frame production-smoke assertions that reject intermediate menu exposure, loader reappearance after the first authoritative reveal, and immediate mode-button presentation changes; it changes no runtime.
10. **Mobile naturally-generated trap damage and landing layout — REPOSITORY-COMPLETE THROUGH #2201 / DEPLOYED MANUAL RETEST REMAINS.** #2201 repairs the reproduced late-owner trap swallow and forces coarse/mobile landing cards into one full-width column with readable Solo text. Dedicated mobile trap/layout checks and the full exact-head matrix passed; Load Safety shard 6 passed on one unchanged targeted retry after the historical V10.36 92%-vs-100% timing sample. Require hands-on mobile confirmation of both behaviours before product closure.
11. **Mobile playfield camera — REPOSITORY-COMPLETE THROUGH #2205 / DEPLOYED MANUAL RETEST REMAINS.** #2203's 1.3x mobile Solo/Tutorial camera was still too small in deployed testing, so #2205 raises it to 1.6x for canvas widths of 900px or narrower. Desktop and local 2P remain 1x. Exact-head qualification passed the full triggered matrix including all six Chromium shards.
12. **Final qualification — EXACT-HEAD AUTOMATION PASS / HANDS-ON REQUIRED.** Repository coding is complete unless a hands-on gate exposes a new reproducible defect. Complete current startup, sustained Solo, Defect 5 Flask, mobile natural-trap damage, full-width mobile landing and mobile playfield-size acceptance before external itch.io publication.

Do not create another Dungeon coding stage solely to keep development active.

## Closure rule

No user-reproduced defect moves to product-complete solely because a PR merged or CI was green when this register explicitly requires deployed/manual acceptance. Closure requires the requested behaviour to exist on current `main`, relevant regression coverage to pass, and the defect to stop reproducing during the required live/manual check.