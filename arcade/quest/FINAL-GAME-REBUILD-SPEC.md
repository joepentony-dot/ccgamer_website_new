# Cheeky's Commodore Quest — Final Production Rebuild Spec

## Production asset policy
Gameplay artwork is versioned with the game. Admin live overrides are limited to the nine main backgrounds, music and sound effects. Old sprite, boss, hazard, collectible, power-up and Alien Formation override records are ignored.

## Cheeky main animation
`assets/production/player/cheeky-main-sheet.png` is 1024×1280, 4×4, with 256×320 cells. States: idle, four-frame run, jump takeoff, rise, apex, fall, landing, duck, fire, duck-fire, hit and victory. The sprite follows the player's real Y position.

## Fighting stage
Cheeky uses a separate 992×632 fighting sheet with 248×316 cells and renders about 302px tall. Retsu uses `fighter/retsu-sheet.png`, the same grid, and renders about 300px tall. Fighter collision boxes are aligned to the taller characters.

## 8-bit enemies
`enemies/8bit-enemy-sheet.png` is 512×256, 4×2, 128×128 cells. Frames 0–3 are normal running; 4–7 are low/crouched movement.

## Collectibles deliberately use inviting positive presentation
Cassette, floppy, Zzap!64 and joystick use natural proportions, gentle bob/rotation, green glow, green particles and positive pickup text.

## Hazards use a threatening red presentation
Each stage hazard is red/black, pulses and tilts, and retains the incoming warning treatment so danger cannot be confused with a collectible.

## Power-ups
Shield, speed and double-fire pulse with bright positive glow and explicit collection text.

## Bosses
Five 1024×448 boss sheets use 256×224 cells with idle, charge, hit and defeat animation states. Boss impacts have hit feedback and a short BOSS DOWN sequence.

## Alien Formation
Five front-facing alien designs, player ship, bunker and both shots are built in. Runtime bob/squash keeps the formation animated. Established balance remains base speed 72, late-wave +145 and straight-down enemy bullets at `vx=0`.

## Collision feedback
Player hits show a hit animation, knockback, particles and damage text. Enemy kills show impact particles/SMASH feedback. Fighter and boss collisions use matching hit frames.

## Gameplay rules preserved
Electric Beads stays 28 seconds, gravity 2350, speed 360–455. Alien player fire stays single-press at 0.34 seconds. Dot-Maze target remains 110. Existing boss HP/attack profiles remain unchanged.

## Mobile / landscape play
Phones in portrait show a rotate-device prompt. In landscape the 1600×900 canvas expands to the largest 16:9 area that fits `100dvh`, respects safe-area insets, and keeps compact touch controls at the edges. Desktop/tablet behaviour is unchanged.
