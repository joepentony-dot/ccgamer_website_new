## New owner-approved request — premium visual upgrade, 9 October 2026

**STATUS: OUTSTANDING / STAGED.** Reach the quality of the supplied atmospheric top-down pixel dungeon screenshot: weathered detailed wall/floor art, dark negative space, warm flickering torch lighting, room-purpose-aware props/moss/debris clusters, expressive but bounded combat VFX, state-driven enemy/player/environment animation, coherent large playable scene and compact legible HUD. Preserve fifteen distinct biomes, CCG hero identity, approved/verified artwork, collision and progression, accessibility, desktop/mobile and browser/itch/Windows parity. Reference is **not licensed game artwork to copy**. Full locked roadmap: [premium visual target](dungeon-carnage-premium-visual-target-2026-10-09.md). **No visual implementation is marked complete by recording this request.** Prioritise live audio/combat defects and red exact-head CI first.

# C64 Dungeon Carnage — Master Owner Request Reconciliation

Last reconciled: 8 October 2026 (R118 branch audit; not proof of deployed acceptance)
Repository: joepentony-dot/ccgamer_website_new
Scope: browser-based C64 Dungeon Carnage only, plus directly related website tasks explicitly requested by the owner.

This file is the durable owner-request audit. A request is not considered finished merely because an old PR existed. Current main/runtime, merged history, superseded branches and manual acceptance all matter.

## Status labels

- COMPLETE — present in current runtime/main and protected by current contracts.
- PARTIAL — some requested behaviour exists, but the full owner request is not satisfied.
- OUTSTANDING — explicit owner request not yet fully implemented/reconciled.
- MANUAL ACCEPTANCE — repository work exists but owner hands-on testing is still required.
- SUPERSEDED — older implementation vehicle must not be merged wholesale; salvage only valid delta onto current main.
- SEPARATE WEBSITE TASK — not Dungeon runtime, but explicitly requested and must remain on the work list.

---

## 1. Current R113–R117 live-playtest/reconciliation tranche

### COMPLETE / carried into the current reconciliation
- R113 tactical minimap room scale, centred cyan YOU marker, ambiguous triangle removed.
- Desktop Shop compacted to one-screen presentation.
- Timed Chamber visible countdown retained.
- Sanctuary guaranteed visible healing square.
- Rare capped Spread reward must remain an actual three-way firearm.
- Mandatory fullscreen on Start Game, Tutorial, saved-run restore and pause resume.
- Cartographer's Eye usable from TAB and numbered quick inventory; map geometry and intended map icons revealed.
- Ward-Break Charge repaired to one carried charge; duplicate/oversized legacy states compact; misleading repeated ×25 labels removed.
- Magic Sack rare stock and run-wide 10/15/20 Gold progression through +3 cap.
- Banishment Essence floor-budget / Vessel-cap scarcity pass.
- Armour and Restoration Potion routine drop scarcity pass.
- Sanctuary safe-room hardening: no anti-idle damage, generator spawn, ordinary damage or Count Loadula entry.
- Wearable-aware armour cap applied to Shop repair, level-up repair, Endurance and Sigil WARD.
- Rotten Bridge collapse / Dungeon Thief / stolen-stash exact-once recovery / shoot-only rebuild / emergency firearm+ammo / upgraded far-side reward.
- Named rare weapon usefulness: alternate archetype, refinement or reforge rather than common ammo/XP/score salvage.
- Concise player-facing Dungeon Guide replacing implementation-heavy Rulebook.
- Tutorial contracts reconciled to current fifteen-floor systems.
- Floor 15 Blood Archivist/guardian composition repaired so boss and Sigil progression do not compete.
- Fifteen-floor enemy/hazard profiles and floor identities are retained.
- R117 authored secondary trials and fifteen-floor room-objective identity were carried through merged PR #2593 (7 October 2026; recorded in the R118 audit). Deployed/owner acceptance remains a separate gate.

### CURRENT RELEASE / ACCEPTANCE HOLD
- R117 PR #2593 was merged on 7 October 2026. Do not repeat the outdated claim that it is open.
- R118 PR #2600 remains a separate, not-yet-merged owner-supplied artwork pass; it must be reconciled with latest main and exact-head qualified.
- The release and owner-test acceptance criteria below still apply, including confirmed deployment/cache identity; green CI on an earlier SHA is not sufficient.

---

## 2. Historical reliability and progression requests

### COMPLETE
- FIRE ownership/liveness repairs, including post-pause and long-session recovery contracts.
- ACTIVE FIRE/SPIKE/SHOCK contact ownership and cycle-aware damage contracts.
- Floor 1 -> Floor 2 transition stack-overflow repair and later-floor progression hardening.
- Save & Continue / resilient Solo floor-entry checkpoint system.
- Memory Vault: five-pad ownership, reset/replay, sealed exits until solve; Floor 12 seven-pad variant.
- Persistent YOU DIED acknowledgement before respawn.
- Death XP/level/stat loss and exact-once death-cache recovery.
- Second-death loss of the prior unrecovered cache.
- Might affects melee and firearm damage consistently.
- One evolving firearm model; ordinary weapon-cache language moved toward upgrades rather than inventory clutter.
- Fifteen-floor campaign, palette/theme progression and Floor 6–15 topology profiles.
- Major bosses on Floors 5/10/15.
- Map/minimap Sanctuary/Warden identities and discovered/reveal behaviour.
- Authored pickup/environment sprites from the R85 original-project art pass.
- Role-matched authored enemy art and floor-aware enemy identities from later visual passes.
- Uploaded production soundtrack ownership and owner-recorded voice routing have dedicated release-critical contracts.
- Public route/branding is C64 Dungeon Carnage while legacy internal compatibility paths remain where required.
- Startup loader/menu flicker repair has regression coverage.
- 24-hour public playtest boundary and five-minute gameplay session controller were implemented as a separate access layer.

---

## 3. Requests that are NOT fully satisfied

### OUTSTANDING — equipment catalogue is narrower than requested
Owner request included a fuller RPG equipment model with Head / Body / Hands / Boots / Trinket and visible collectible gear.
Current R80 runtime defines only:
- Head
- Hands
- Feet

Body and Trinket are not present in the canonical wearable slot order. This must not be called complete merely because R80 added genuine equipment.

### PARTIAL — recent supplied third-party/free asset packs (R118)
The owner supplied/identified newer packs on 7 October, including KayKit Dungeon Pack, Dungeons & Pixels demo, Dungeon tileset, free pixel-art dungeon objects, Super Pixel Objects, Treasure+ and related material, and asked to use suitable artwork and source missing art.
R118 imported four licensed 0x72 wall-torch frames and staged further candidates, but most owner-supplied packs are NOT yet integrated. The Niji gold-key override was re-enabled only after a unique exact pixel match against the recovered original v1.1 archive; one source-byte-matched 0x72 II crate is also now imported as a visual replacement, with proportional torch/prop rendering and hash-pinned tests. Earlier R85/R97 authored art does not close this request.
Owner instructed: NO PAID LICENCES OR DOWNLOADS. Minifantasy free/non-commercial-only, paid expansion tiers and unknown-rights Dungeon tileset(1).zip are excluded from commercial intake.
Additional free replacement source licences identified on original pages: Kenney Tiny Dungeon, hyprv Dungeon 16x16, DeadlyEssence01 Free Dungeon Tileset, elesrech animated monsters, and supplemental CC0 props/torches. A curated 16x16 Kenney Tiny Dungeon barrel is now imported, selected and SHA-pinned; it is a free CC0 replacement with a documented original tile index, and independently byte-matched to `tile_0082.png` in three public Kenney Tiny Dungeon folders (a direct comparison to Kenney's own ZIP was not performed). The other new free-source candidates are not imported or wired. SnowHex Dungeon Gathering Free Version was independently traced to the original creator's commercial-use permissions and its extracted embedded `License.txt`; the owner-held free version (not the paid full tier) is eligible for future scale/animation review, but no SnowHex sprites are enabled. The recovered owner archives also provided verified runtime CC0 key, crate and now 0x72 II 16×48 stone-column replacements. The column is rendered proportionally over a plinth to keep the existing blocking tile visually apparent, with unchanged collision and room logic. Its original archive hash and PNG identity are regression-guarded. Pixel_Poem's free 2D Pixel Dungeon Asset Pack v2.0 has also supplied an exact-source-verified animated 16×16 gold-score pickup (four animation phases, three distinct PNGs); the separately recorded creator-granted commercial-use permission is **not CC0**. R85 gold SVG fallback remains, all scoring and pickup behaviour stays unchanged. Smaller Pixel_Poem enemy sprites are held back after comparison with the existing larger enemy art. A licensing correction now distinguishes eight source-traced staged CC0 visuals from the remaining two staged Pixel_Poem movement strips: `skeleton-move.png` and `vampire-move.png` are creator-permitted free-commercial assets, **not CC0**, with exact source ZIP/frame hashes and no runtime activation. The R118 test rejects future CC0 misclassification. Both previously unverified staged 0x72 character sheets (`pumpkin-dude.png` and `plague-doc.png`) are now positively traced, pixel-for-pixel, to eight original DungeonTileset II v1.7 idle/run frames each (16×23 sprites within 16×32 atlas cells); original ZIP, sheet hashes and placement offsets have been recorded and regression-guarded. Neither sheet is mapped onto the current game enemies until gameplay visual acceptance. Full candidate and incorporation distinctions: docs/ai-work/dungeon-carnage-r118-free-replacements.md.
The R118 itch.io builder now excludes all ten staged, unwired candidate PNGs from downloadable packages while preserving them untouched in the source repository. Its manifest-based licence-separated exclusion list, active-sprite presence checks and build-time verification passed against an actual package: ten excluded, none leaked, all active included. This makes future false source-only redistribution less likely; website asset layout and gameplay remain unchanged. Bookcase review is now CLOSED AS AN ARTWORK-QUALITY DECISION: Craftpix's wooden supply shelves are not bookcases. A real zero-cost CC0 16×16 bookshelf from o_lobster's original pack was located, byte-matched in three mirrors, and visually compared at game scale with the existing 64×64 R85 bookcase; the established R85 rendering was visibly more detailed and recognisable, so no paid asset or new override is needed. The package also now ships a concise artist-credit record for active 0x72, Niji, Kenney and separately licensed free-commercial Pixel_Poem artwork, regression-guarded for commercial-use and non-CC0 distinctions.
Continue exact binary provenance, proportion/animation tests, appropriate credits, and preserved collisions/combat/progression. R118 is not complete until integrated, tested, approved and merged.

### PARTIAL / OUTSTANDING — endgame and credits
R88 functionality is still present in current main and includes:
- Blood Citadel campaign-completion section.
- defeated-enemy recap using the gameplay enemy-avatar renderer.
- AZALEA and CPU acknowledgements plus Patreon/supporter thanks.
- Share Completion action.
- donation/support link.
- feedback mailto to info@cheekycommodoregamer.co.uk.
- configurable end-credits music hook.
- Friendly fire is not shown in the normal/recovery end-screen statistics.

However, the later R89 substantial-endgame branch (#2470) was closed without merge and must be treated as a salvage source, not as completed work.
Still requiring reconciliation against the owner's full request:
- a more substantial RPG-like completion presentation rather than only the compact R88 extension.
- permanent final relic/title reward (the requested Crimson Dungeonheart concept) awarded exactly once and persisted across new runs.
- explicit skippable credits/credits-flow behaviour.
- final purchase/download CTA aligned with the later itch.io distribution decision, not retired custom commerce.
- verify credits music has a real configured asset rather than only an empty hook.
- verify completion rewards cannot duplicate on repeat/reload.

### PARTIAL — NPC dialogue/voice richness
R68 and later voice-routing releases added real keyed NPC speech, recorded-voice overrides and package-safe audio ownership.
The broader request for richer voiced NPC dialogue should remain PARTIAL until current NPC coverage is audited for Scout, Trader/Quartermaster, Sanctuary Keeper, Alchemist and later-floor NPCs against the desired amount of actual dialogue.

### PARTIAL — environmental art/tileset overhaul
R68/R85/R97 materially improved pickups, furniture, collision-safe props and enemy art.
This does not automatically satisfy the later request for a broader dungeon tileset/object replacement using the supplied packs. Keep that later art pass separate.

---

## 4. Manual owner acceptance that must remain open

Do not mark these complete only because automated CI is green.

- Sustained Solo combat / FIRE / pause / inventory / floor-transition stability.
- Real ACTIVE trap contact/re-entry behaviour on owner hardware.
- Banishment Flask exchange: obtain the required Essence, perform the Alchemist exchange without first buying a Gold Flask, receive exactly one Flask, and confirm Gold and Score remain unchanged.
- Menu/first-paint and inventory flicker on repeated real reloads.
- RPG HUD and deferred/unused level-up presentation.
- Mobile movement/FIRE/DASH/POTION/TORCH/BANISH/ITEMS/MAP.
- Loader geometry on real desktop/mobile viewports.
- Intended uploaded soundtrack and owner-recorded voice playback on owner hardware.
- Wearable equip/swap/floor-persistence behaviour in a real run.
- Final Floor 15 completion flow and credits once R117/endgame reconciliation is the deployed candidate.

---

## 5. Public playtest / access requests

### COMPLETE / preserve
- 24-hour public test pass separated from ordinary owner/development access.
- five-minute actual-gameplay timer.
- feedback/contact route.
- Coming Soon/expired-session handling.
- public token not exposed as a ChatGPT-labelled URL.

### FOLLOW-UP / ANALYTICS
- Owner separately asked to determine how many testers participated. This is an analytics/reporting task and must not be confused with gameplay completion.

---

## 6. Separate website task — Bad Game Sprites quiz

### OUTSTANDING — SEPARATE WEBSITE TASK
PR #2532 added the owner-supplied 20-image Bad Game Sprites C64 quiz but was closed without merge.
The old branch is far behind current main and must not be merged wholesale.
Required salvage:
- 20 supplied sprite images.
- quiz pack/data/loader changes.
- pixel-art presentation.
- resolve the review finding by reserving stable media space/dimensions before image decode so answer buttons do not shift.
- rebase/salvage onto current main, qualify and merge.

A later defrag/salvage PR also closed without delivering this to main. Keep this task visible until it is actually merged.

---

## 7. Requests explicitly superseded/retired

- Native C64 .D64 Dungeon Carnage project is retired; do not revive unless explicitly requested.
- Custom PayPal purchase/paywall/download-delivery programme is superseded by itch.io for game distribution.
- Old stacked/stale Dungeon branches must not be merged wholesale when current-main salvage is safer.
- Retired online room/multiplayer wording must not return where online play is disabled.
- Old Lost Sizzler player-facing naming must not return.

---

## 8. Acceptance rule before telling the owner to test

The owner should be told the build is ready for full gameplay testing only when:
1. all intended current Dungeon repository changes are merged to main;
2. no known owner-request delta is stranded only on an old branch without an explicit status in this audit;
3. exact-head required qualification is green;
4. deployment is verified;
5. live version/cache identity matches the candidate;
6. manual-only gates are listed separately rather than falsely reported as automated-complete.

---

## 9. Next repository work order

1. Reconcile draft R118 PR #2600 with current main; finish the free-only third-party asset intake and source-file matching, including the replacement candidate matrix.
2. Verify pixel-scale/animation and regression tests; then run all qualification on the exact reconciled head before considering merge/deployment. Re-audit the deployed mainline after release.
3. Salvage/finish the full requested endgame delta that remains beyond R88, especially persistent final reward/title and substantial completion flow.
4. Reconcile the fuller equipment-slot request (Body + Trinket gap).
5. Continue the October R118 owner-supplied and free-replacement asset intake; only use verified free/commercially usable files, not paid tiers or non-commercial-only artwork.
6. Audit richer voiced NPC coverage and close remaining gaps.
7. Salvage and merge the Bad Game Sprites quiz on a fresh current-main branch.
8. Run the owner manual acceptance list on the deployed final candidate.

Do not delete an item from this file merely because a PR once existed. Move it to COMPLETE only when current main/runtime or an explicitly external completed action proves it.

---

## 10. 15 October 2026 — authoritative owner intake / P0-first guarded audit

**15:04 BST bounded-phase update:** source/test `9752a2cf0441353c4ab8240a66d532f12eb98cee` follows refreshed #2705 head `ac4c3e34a214b2599f6ddc020c1d4024a7f3d402`. Adds safe reachable/reserved **Warden** cache placement (R115 trial caches were a separate owner); original source fails the new live-generator overlap control. Twelve focused Node files passed; R87 fixture corrected to canonical generator `alive:true` with collision assertions retained. Real-source paired guardian/Stalker tests establish narrow immunity/charge/defeat/reward invariants, not the owner's respawn/freeze reproduction. Row 4 remains partial at overall request/acceptance level; rows 1–3 remain open. Main `0f9a2a028dca833b7f2942f03e45a093826cbc40` is 13 commits ahead of candidate ancestry. No browser/Windows/full CI/review/merge/deployment/owner acceptance; no paid workflow dispatched. Exact files, commands, limitations and next task: [R137 checkpoint](dungeon-carnage-r137-owner-blockers.md). Stop this phase; next authorised task is reproducing the existing Solo endurance named-defeat and Space-input failures on refreshed #2705.

**Intake:** [owner's full 14–15 October request](https://github.com/joepentony-dot/ccgamer_website_new/pull/2705#issuecomment-6180930995). This section supplements, and does **not** replace, historical sections 1–9. Older labels such as COMPLETE refer to prior code milestones, not fresh owner acceptance of the newly reported faults. Do not revive retired two-player or arena gameplay.

**Snapshot, not release qualification:** website `main` `cdc6a3b9f0d509da8231e561f552ceb0871292d6`; cumulative **OPEN DRAFT** PR #2705 head `eb96b8e25e7227737bba317dcf707168a19d5918`, 44 commits ahead and 11 behind main, 27 changed candidate paths. Main and candidate both change the two Dungeon public `index.html` files: integration must preserve main's development/registration notice. The three other open PRs at snapshot are #2778 (composer SEO), #2779 and #2780 (emulator links); no cross-scope edits or merges were made. The GitHub commit-workflow lookup returned no PR-triggered runs for this exact candidate head, and combined legacy statuses were empty. Therefore **zero current-head full-suite qualification** is claimed. Independent published-main/browser reports also identify a red solo-combat endurance contract (named defeat exactly once / Space attack input ownership); investigate it, do not dismiss it as flaky.

**Status key:** Y = established for the **specific new request**; P = partial source implementation or prior narrow test, not full owner scenario; N = not established; B = blocked. **R** reported, **Rep** reproduced, **I** implemented on cumulative draft or preserved source, **T** regression-tested for the specific scenario, **Q** qualified at exact current PR head, **M** merged to main, **D** deployed as accepted candidate, **O** owner-accepted. P in the implementation column does not imply the requested behaviour works. Earlier released features and old CI do not advance Q/M/D/O for this intake.

| # | Priority / new owner request | R | Rep | I | T | Q | M | D | O |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | P0 Guardian Maw + Death Stalker paired death, respawn, single Stalker per floor, liveness | Y | N | P | N | N | N | N | N |
| 2 | P0 Count Loadula, 2/3 generators, locked guardian room, missing Flask escape | Y | N | P | P | N | N | N | N |
| 3 | P0 bridge thief one-time stolen inventory, mobile roaming/fleeing, minimap, exact recovery and Flask HUD | Y | N | P | N | N | N | N | N |
| 4 | P0 reward chest occupied-tile collision and reachable fallback | Y | Y* | Y | P | N | N | N | N |
| 5 | P0 Floor 4 torch re-entry after forced displacement | Y | N | P | P | N | N | N | N |
| 6 | P0 Alchemist three Artefacts/Essence, post-payment freed slot, atomic single Flask, unchanged Gold/Score | Y | P | P | P | N | N | N | N |
| 7 | P1 Superior Torch and general stronger wearable swap, no loss/duplication, save continuity | Y | N | N | N | N | N | N | N |
| 8 | P1 full helmet/gloves/boots, equipped hero identity | Y | N | P | N | N | N | N | N |
| 9 | P1 crates/furniture collision and visual footprints | Y | N | P | P | N | N | N | N |
| 10 | P1 coloured minimap, single YOU triangle, Sanctuary/Key/Sigil/Cache/Warden/Exit/thief icons | Y | P | P | N | N | N | N | N |
| 11 | P1 replace placeholder torches/keys/switches/potions/traps/interactables with provenanced sprites | Y | N | P | N | N | N | N | N |
| 12 | P1 Scout rescued voice once, objective/timed/door feedback | Y | P | P | P | N | N | N | N |
| 13 | P2 premium 15-floor environmental art, animation, lighting, performance/licensing | Y | N | P | N | N | N | N | N |
| 14 | P2 recover all 16 **original** owner MP3s and verify soundtrack transitions | Y | B | B | B | N | N | N | N |
| 15 | P2 older RPG/endgame/tutorial/HUD/fullscreen/solo Windows installer requests | Y | P | P | P | N | N | N | N |

\* **Chest source reproduction only:** the former R115 `rewardCell()` returned an unvalidated fallback (potentially the player/objective tile) when six neighbouring candidates were occupied. Commit `eb96b8e25e7227737bba317dcf707168a19d5918` changes the search to reachable unoccupied tiles and defers reward/score if none exists. An earlier source-executed fixture and an extended existing R87 Node regression were recorded in [the PR discussion](https://github.com/joepentony-dot/ccgamer_website_new/pull/2705#issuecomment-6181853566). Neither full 15-floor/browser/Windows nor owner seed has passed on the current head.

### New source observations and remaining falsification tests

**15 October 2026 — generator topology falsification:** Source-executed actual world generation, decoration and canonical player walkability on **48 seeded generator-objective floors** (12 each of Floors 2, 5, 9 and 12) showed all three generators had a reachable adjacent tile **after ordinary room doors were opened**. A first-pass analysis that mistakenly treated ordinary unopened doors as permanently impassable was discarded. An eight-seed regression with a deliberately sealed negative control was added to the existing R87 campaign test on draft #2705. This is structural reachability only: actual door interactions, the owner's original seed, Count Loadula/Flask, generator destruction, combat liveness and Windows remain unverified. **P0 row 2 remains open, not owner-accepted.**


- `systems.js` currently creates **Count Loadula as `host.stalker`** and one separately modelled **Death Stalker in `host.enemies`** per generated floor, then calls `enforceDeathStalkerSingleton` during decoration. The helper filters duplicate `deathStalker && voidStalker` records and retains the first. This **does not** prove the owner saw no duplicate encounter after death, save, respawn or late spawn. Verify canonical permanent-banishment, both classes' kill bookkeeping, no duplicate spawn from later wrappers, and reachable progression without a second Flask. The current save UI describes **floor-entry checkpoint restore, not a mid-combat quick save**; test that actual behaviour explicitly.
- `game-play.js` includes a guarded recovery of `sigilLockdown` with no living defenders, but that **does not** solve an incomplete 2/3-generator objective or a room with a living inaccessible defender. The actual owner save/seed and Windows crash trace remain missing. Build separate positive and negative objective/door/defender fixtures, including inaccessible generator and Flask exhaustion.
- `game-render.js` `renderRadarPanel` currently declares `playerMarker.shape: "square"` and draws a cyan square, not the requested single triangle; it has no `bridgeThief` minimap marker. The current Key is a circle and Death Cache is an X, so the new icon specification is **not** complete despite earlier minimap milestones. Respect earned discovery, current coordinates and small/mobile dimensions when correcting it.
- `game-play.js` `bridgeStashedItems` collects active `dropped-` items with `carriedItem` around the bridge and marks them stolen; `spawnBridgeThief` creates an ordinary ambusher-labelled actor. No proof yet that the theft touches only the intended stacks, preserves the Banishment HUD, moves away across rooms, or recovers items exactly once after reload. Reproduce inventory quantities and minimap position through a full bridge cycle before editing the live thief AI.
- The source has a dedicated `v10-42-artefact-shop-stability.js` transaction wrapper and narrow capacity/rollback tests. The owner must still test **three real Artefacts/Essence with every unlocked slot initially occupied**, exactly one Flask, no prerequisite Gold Flask and unchanged Gold/Score. Distinguish physical legacy Artefacts from Vessel Essence and test both rollback and successful slot-release cases.
- The published-main six-shard browser report [PR comment](https://github.com/joepentony-dot/ccgamer_website_new/pull/2705#issuecomment-6193040260) cites `v10-42-live-solo-combat-endurance.mjs` failures on runs 38666514685 and 38669465532 (named-defeat accounting and Space input). They are separate release blockers, not evidence that the new draft passes.

### Guarded next actions

1. **P0 first:** isolate simultaneous guardian/Stalker and objective-lock scenarios using real source/runtime and deterministic fixtures, preserving the solo campaign; extend existing tests rather than adding a new tiny regression file per fix. Do not equate a floor-start checkpoint with a live encounter save.
2. Inspect the current-main versus candidate overlap on both Dungeon public index pages **before any integration**. Preserve the live development notice, registration protections and all unrelated website/SEO/emulator changes. No blind restack or forced ref update.
3. Resolve the solo-combat endurance failure and run exact-head Node plus six Chromium shards, relevant site/SEO/cache/package/itch and Windows installed-EXE save migration checks, independent review and owner acceptance **before** merging. A draft head moving again resets Q.
4. Original 16 owner MP3s remain **BLOCKED** pending authorised Supabase access, verified binaries and rights/provenance. Do not substitute generated tracks or publish a commercial package. Preserve existing saves, appId `uk.co.cheekycommodoregamer.dungeoncarnage`, `127.0.0.1:47731` and `%APPDATA%\\C64 Dungeon Carnage` continuity.
