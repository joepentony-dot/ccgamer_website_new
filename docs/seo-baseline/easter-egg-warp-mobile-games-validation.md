# WARP, PACMAN and INVADERS Easter Egg Validation

## Verdict

**PASS**

| Environment | Checks | Result |
|---|---:|---:|
| mobile | 9/9 | PASS |
| desktop | 6/6 | PASS |

## Required behaviour

- WARP renders a visible canvas effect on desktop and under mobile-lite animation suppression.
- PACMAN displays a mobile directional pad and Start/New Game control.
- PACMAN touch buttons dispatch the keyboard codes expected by the local game.
- Mobile INVADERS displays “AVAILABLE ON DESKTOP ONLY” and does not load the keyboard-only iframe.
- Desktop INVADERS uses a dedicated centred 4:3 layout and remains inside the viewport.

## Failed checks

- None
