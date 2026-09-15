# Commodore Quest 3.0 — Rebuild Specification

## Purpose
Quest 3.0 replaces the Quest 2.0 gameplay runtime while preserving the public URL, established Cheeky artwork, achievements, remote background/music overrides and mobile landscape support.

The old `main-v3.js` remains in the repository as a rollback reference. Quest 3.0 is loaded through `main-v4.js` only after review.

## Non-negotiable quality rules
- Difficulty comes from recognising and answering a threat, not from contradictory or unavoidable overlaps.
- Main-stage patterns use one mandatory response at a time: jump, crouch, move or attack.
- Ambient enemies no longer run on an independent timer capable of landing on top of authored patterns.
- Fighter attacks have explicit telegraph, active and recovery phases.
- A low kick must remain jumpable after its warning appears; a high punch must remain crouchable after its warning appears.
- Losing a life keeps the player in the current section instead of replaying earlier completed sections.
- The renderer clears the canvas before camera shake so previous animation frames cannot remain visible at the edges.

## Sprite runtime
- Sprite animations use per-character state clocks.
- Entering a new state resets that animation clock to zero.
- Player, fighter and boss drawing uses anchored sprites.
- Sprite metadata includes `nativeFacing`; mirroring compares requested facing against the artwork's native direction instead of blindly flipping any left-facing actor.
- Player and fighter collision is driven from the same named state used for rendering.
- F2 toggles a developer overlay for collision bodies and ground anchors.

## Main stages
### The Bedroom
Cassette, loose-tape, rewinder and enemy encounters are individually readable. Obstacles are drawn as recognisable bedroom/loading objects rather than coloured blocks.

### The Budget Rack
Shelves, price tags and bargain bins have distinct silhouettes and game-box detail. Optional pickups can reward risk without blocking the safe route.

### Christmas Morning
Presents, tinsel, baubles and mice replace generic obstacles. Reverse flow remains the identity of the level without stacking incompatible reactions.

### Amiga Upgrade
Floppy disks, Workbench windows and computer-themed enemies form the hazard language. Disk motion is readable and windows require crouching rather than arbitrary collision.

### Guru Meditation
Glitch blocks, corrupt memory objects and vertical beams use visible warnings. Beam damage never begins before its telegraph expires.

## 36% Conversion Bout
- Enemy decisions are slower and separated by cooldowns.
- Punch telegraph: at least 0.52 seconds.
- Kick telegraph: at least 0.68 seconds.
- Punch and kick hitboxes are inactive throughout the telegraph phase.
- Missed attacks enter recovery before another enemy decision is permitted.
- Cheeky and Retsu both use anchored sprite states with independent animation clocks.
- Retsu's source artwork is declared as natively left-facing so it is not double-mirrored.

## Other arcade sections
- Electric Bead Run alternates readable jump/crouch decisions and caps concurrent beads.
- Alien Formation uses slower enemy shots, fewer rows, useful bunkers and section checkpoints.
- Dot-Maze Run uses a connected authored maze, four enemy roles, power windows and section checkpoints.

## Validation gates
Quest 3.0 must pass:
1. JavaScript syntax checks for the V3 runtime and tests.
2. Static contract validation for the new runtime, metadata and public wrapper.
3. Mathematical combat fairness checks for the fighter telegraph windows.
4. Chromium checks covering title boot, sprite state reset, crouch geometry, all nine practice sections, high-punch crouch avoidance and low-kick jump avoidance.
5. Existing site-safety and arcade package workflows before merge.

## Release rule
Do not merge the rebuild until hands-on play confirms that the Bedroom and 36% Conversion Bout meet the quality bar. The remaining stages inherit the same threat director and rendering systems, but automated checks do not replace play-testing.
