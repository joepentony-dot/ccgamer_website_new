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
Additional free replacement source licences identified on original pages: Kenney Tiny Dungeon, hyprv Dungeon 16x16, DeadlyEssence01 Free Dungeon Tileset, elesrech animated monsters, and supplemental CC0 props/torches. A curated 16x16 Kenney Tiny Dungeon barrel is now imported, selected and SHA-pinned; it is a free CC0 replacement with a documented original tile index, and independently byte-matched to `tile_0082.png` in three public Kenney Tiny Dungeon folders (a direct comparison to Kenney's own ZIP was not performed). The other new free-source candidates are not imported or wired. SnowHex Dungeon Gathering Free Version was independently traced to the original creator's commercial-use permissions and its extracted embedded `License.txt`; the owner-held free version (not the paid full tier) is eligible for future scale/animation review, but no SnowHex sprites are enabled. The recovered owner archives also provided verified runtime CC0 key, crate and now 0x72 II 16×48 stone-column replacements. The column is rendered proportionally over a plinth to keep the existing blocking tile visually apparent, with unchanged collision and room logic. Its original archive hash and PNG identity are regression-guarded. Full candidate and incorporation distinctions: docs/ai-work/dungeon-carnage-r118-free-replacements.md.
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
