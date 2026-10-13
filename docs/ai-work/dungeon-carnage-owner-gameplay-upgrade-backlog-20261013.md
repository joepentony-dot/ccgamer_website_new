# Dungeon Carnage — owner playtest defects and later gameplay-quality programme

**Owner report:** 13 October 2026. **Disposition:** recorded for later work, NOT implemented, tested, merged, or released. This is a documentation-only branch from main `e7982156deffc4fe4e00d68eeacb2f4e345d0413`. The owner explicitly wants broader, more intelligent design work **after** current game-breaking reliability defects.

**Do not alter R136** (`fix/dungeon-r136-warp-stack-and-chest-notice-20261013`, draft PR #2704), already blocked by death-cache inventory-duplication review and a Chromium Solo timing test failure. No part of this note authorises a gameplay or commercial release.

## Immediate owner-reported blockers — resolve before major redesign

1. **Banishment Flask “INVENTORY FULL” despite two empty-looking slots.** In `js/progression.js::inventoryCanAdd` and `inventoryAdd`, Flask (`kind:"banishment"`) is intentionally **restricted to one carried instance** and `compactInventory` rewrites it into a single Ward-Break Charge; `v10-42-artefact-shop-stability.js::tradeArtefactsForFlask` reports any insertion failure as “INVENTORY FULL”. This can be a misleading error when slots are available or when visually empty inventory slots are actually locked. The proper intended flask ownership/carrying rule must be decided and surfaced accurately; adding unbounded Flasks could break Count Loadula balance. Preserve Essence transaction atomicity, old saves, Gold/Score and one-flask-per-exchange assertions.
2. **All recorded speech running continuously.** Voice director `v10-16-voice-director.js` plays individual cues from `ccg-recorded-voices-r69.ogg` using `cue.start`, `cue.duration` and a 25ms timer. `armWatchdog(...)` calls `finishActive` which clears ownership/timers **without pausing the media element**; if the timer does not stop the clip (seek/play timing, document throttling, metadata/race), the recording can continue through subsequent unrelated spoken lines. Treat as a high-priority source-level *hypothesis*, not proven exact trigger; test audible cue boundaries and all playback interruptions in actual browsers and offline Windows, not only Node fakes.
3. **Scout repeatedly says “I'll follow you”, and reaching Sanctuary says “Hello, big boy” rather than “We made it”.** In `v10-41-stage8-npc-dialogue.js`, `wrapRescueOwner` presents `scout.following` repeatedly whenever `triggerRescue` runs and the scout remains within reach; the `REPEAT_MS=7000` throttle is not an encounter-once latch. `game-play.js::updateRescue` transitions to `rescued=true` directly, not through the `triggerRescue` wrapper that presents the `scout.rescued` voice. `v10-16-voice-director.js` classifies “SCOUT REACHES SANCTUARY” as `sanctuaryReached`, while the Sanctuary Keeper has separate greeting ownership. `v10-42-r69-recorded-voices.js` *does* map `npc.scout.safe` to `we-made-it`; use a one-time, reliable rescue-completion event with clear voice priority, separate Keeper greeting and preserved subtitles. Validate following, lagging, arrival, re-entry, save/Continue, and only-once events.
4. **Floor 3 four-direction torch sequence fails to acknowledge walking over a torch.** `js/systems.js::installOptionalPuzzles` constructs the four perimeter torches; `js/game-play.js::movementTriggers` calls `triggerSequenceTorch(p,deliberate)` on movement, requiring a deliberate movement, precise tile coordinates and local player membership. `triggerSequenceTorch` has entry-by-player directional suppression, but no continuous occupancy retry; investigate generator positioning, furniture collision, save/Continue stale `entryByPlayer`, dash/tunnel/contact boundaries, and RoomAt ownership. The owner’s exact floor seed/save has not been supplied, so do not falsely claim a reproduced exact cause. Ensure any walk-over activation is obvious and one-shot; wrong order retains exactly one ambush enemy; preserve Floor 2 blood clue and Floor 3 reward.
5. **R136 draft Warp stacking + chest notice** must not merge until its independent review blocker is fixed: partial death-cache inventory additions may be reported as failures without rolling back, duplicating quantities. Rework inventory insertion as an atomic operation and test full stacks, partial capacity, saved legacy stacks, other inventory types, death recovery and shop transactions before requalifying Chromium endurance. R135 remains the last known merged version.

## Deferred owner-requested programme — not to be folded into an urgent hotfix

### A. Equip/swap armour items and distinguish them from armour pickups

**Owner symptom:** collected equippable armour cannot reliably be swapped. Pickups that equip gear need a different colour/icon from common `+1 armour` restorations.

**Source audit:** `v10-42-r71-equipment-inventory.js` shows BODY ARMOUR as a name derived solely from numerical `player.armor` (0–12). `progression.js::lootForChest` currently emits `kind:"armour"` as a points-based “Armour Plate”, not a wearable, even though `armourCap(player)` already inspects `player.wearables` for bonuses. The inventory controls currently offer Use/Info/Drop for consumables, but no true body-armour Equip/Compare/Swap interaction. This suggests incomplete integration between clothing gear and armour-point restoration; it does **not** prove the precise failure in the owner's save.

**Acceptance and architecture:** specify distinct item categories (`armourRepair` vs `bodyArmourEquipment` or equivalent), explicit equip/swap/unequip and comparison confirmation, atomic replacement even with full inventory, drop/pickup/Save/Continue/death-cache preservation, correct armour/resistance stats and visual slot state. Use distinct colour **and text/icon**, compatible with accessibility, without altering the established C64/Amiga-inspired theme or RPG progression. Add deterministic mouse, keyboard, touch and save-migration tests.

### B. Replace generic named chest loot with useful Dungeon Carnage items

**Owner request:** rewrite all named rewards appearing in chests so they make sense within the game and have accurate playable uses rather than generic labels.

**Source audit:** `progression.js::lootForChest` builds rarity-prefixed generic tables: “<rarity> Armour Plate”, “Restoration Potion”, “Ammo Cache”, “Flaming Torch”, “Teleport Spell”, “Rapid-Fire Module”, and “CCG Artefact”, plus weapon rolls and specific Magic Sack/Map Reveal. `systems.js` preassigns loot in seeded room generation. Special puzzle and bridge reward chests have their own contracts.

**Acceptance:** authored loot catalogue with item descriptions grounded in actual game mechanics, clear class, meaningful rarity/benefit, floor/biome/encounter suitability and pickup feedback. Preserve existing actual C64 rescued-game collectibles, Essence/Flask economy and important puzzle rewards. Introduce equipment only when its actual usage/swap flow works. Ensure deterministic seeds, zero duplicate payouts, honest tooltips, save compatibility, no inventory overfill, and source art permissions.

### C. Overhaul Count Loadula encounters and enemy AI as a cohesive RPG system

**Owner request:** a **major intelligent upgrade** to Count Loadula's scripting and to enemy combat behaviour, not an extra random sound or speed increase.

**Source audit:** `systems.js` spawns the `count-loadula` stalker; `game-play.js::updateStalker` covers awakening, pursuit, sanctuary immunity, proximity damage and resource drain. The voice director has an approved Loadula cue and more general threat calls. Other enemies use a separate AI/combat implementation; avoid replacing both in one uncontrolled refactor.

**Planned design:** audit all 15 floors, enemy classes, boss and stalker interactions, threat states, telegraphed attacks, target selection, LOS, environment and cover, search/retreat/flanking, waypoint/stuck recovery, fair cooldowns and performance. Give Count Loadula recognisable phases, conditions, fair warning, distinct behaviours and story progression; maintain the Flask/Banishment balance and Sanctuary safe-room boundaries. Do not fabricate original spoken voice tracks; assess exact available aliases before expanding authored dialogue. Test many deterministic seeds, soft locks, save/resume, single/coop, difficulty, mobile, accessibility, AI CPU budget, and balance.

## Priority and release discipline

1. **First**: repair and fully test the urgent owner-observed Flask, audio, Scout, torch sequence defects and R136 atomicity, preserving current voice assets and 15-floor gameplay.
2. **Then**: armour equip/swap as the next owner-visible mechanical bug; include proper visual differentiation.
3. **Then**: revise chest itemisation against actually usable equipment and consumables.
4. **Finally**: plan/test phase-driven Count Loadula and larger enemy-AI redesign in small, reviewable development slices.

Do not merge any speculative improvement to main or offer a Windows test download claiming these fixes before exact-head Node/browser/Windows/itch, device acceptance and regression checks succeed. The user's R135 build is not updated by this document.

**Tracking note:** GitHub Issues creation returned HTTP 410 “Issues has been disabled in this repository”. This file on a standalone source branch is the durable project record instead; no added PR or gameplay source changes are part of recording it.
