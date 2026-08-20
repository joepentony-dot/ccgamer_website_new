# Exploration Test Build — Automated Validation

- PASS: JavaScript syntax — config.js, audio.js, world.js, network.js, ai.js, game.js.
- PASS: Runtime initialization with stub browser DOM/canvas.
- PASS: `data-game-ready` flag set after initialization.
- PASS: 100 different BSP dungeon seeds generated.
- PASS: all three main vault keys reachable with every optional bronze door locked.
- PASS: main exit reachable with every optional bronze door locked.
- PASS: generated builds contain 4–8 isolated locked bonus rooms and at least 14 chests.
- PASS: 741/741 generated locked bonus branches tested were unreachable until their door was opened.
- PASS: bronze keys spawn only in the unlocked/main dungeon region.
- PASS: enemy direct line-of-sight acquisition.
- PASS: enemy same-room acquisition.
- PASS: walls prevent line-of-sight acquisition across different rooms.
- PASS: chase state falls back to search and then idle after the player is lost.
- PASS: Swanh8ter charge test moved three tiles in one aggressive charge.
- PASS: strict configured light radii are 5 tiles (10 diameter) and 10 tiles with a torch (20 diameter).
- PASS: downloadable build contains all locally referenced PNG/SVG/CSS/JS assets.
- PASS: GitHub branch integration verified after the Exploration commit; config and game controller blob SHAs match the prepared build.

Hands-on browser gameplay remains the next test gate. The development branch must not be merged to `main` yet.
