# Adventure Build Validation

Current development validation for **Cheeky Commodore Quest — The Lost Sizzler**.

## Automated development checks completed

- ✅ JavaScript syntax checked for `config.js`
- ✅ JavaScript syntax checked for `audio.js`
- ✅ JavaScript syntax checked for `world.js`
- ✅ JavaScript syntax checked for the unchanged stable `network.js`
- ✅ JavaScript syntax checked for `ai.js`
- ✅ Adventure controller source passed runtime initialization in a stub browser DOM/canvas before integration
- ✅ Game initialization marker is part of the integrated controller
- ✅ 60 procedurally generated dungeon seeds checked
- ✅ All three main vault keys reachable with every optional bronze door locked
- ✅ Main exit reachable with every optional bronze door locked
- ✅ Optional treasure doors begin locked
- ✅ Sufficient bronze keys generated for bonus doors
- ✅ Main vault keys excluded from optional locked areas
- ✅ Walls block enemy line-of-sight
- ✅ Open corridors allow line-of-sight
- ✅ Detection enters chase state
- ✅ Detection alert hook fires
- ✅ Adjacent hunter performs a melee attack
- ✅ Alerted hunter switches to the faster chase cadence
- ✅ Isolated wrap-tunnel floor bug discovered during validation and fixed

## Required hands-on test now

The integrated GitHub Adventure build now needs normal browser play-testing for:

- solo balance and enemy pacing
- fog-of-war visibility
- torch attraction behaviour
- pickup banners and inventory clarity
- weapon / armour / potion progression
- optional bronze-key treasure rooms
- two-player local split-screen controls
- friendly fire
- room-code co-op between browser windows

The container's Chromium/DBus environment was not reliable enough to claim a visual headless-browser pass. A normal user browser test is therefore the next release gate.

**This is development-only. Do not merge `dev/ccg-quest-stealth` to `main` until it is explicitly approved for release.**
