# CCG Easter Egg System Audit and Upgrade Roadmap

## Goal

Audit the complete Easter egg system, improve weaker entries, and add future Easter eggs without risking the stable E1 Datasette Loader or E2 BASIC Console.

## Current system confirmed

The global Easter egg registry currently includes:

- SYS64738
- PRESS PLAY
- LOAD (E1 Datasette Loader)
- BASIC (E2 BASIC Console)
- VHS
- TERMINATOR
- BSOD
- MARIO
- NOKIA
- SONIC
- WARP
- PARTY
- ZX SPECTRUM
- PACMAN
- BOING
- MATRIX
- INVADERS
- HE-MAN
- LEMMINGS
- CHEEKY
- KONAMI CODE

## Strong foundation

- Shared full-screen overlay system
- Visual viewport binding
- Escape and exit handling
- Scroll and focus restoration support
- Reduced-motion handling in several experiences
- Dedicated E1 and E2 modules and CI workflows

## Main weaknesses to address

- Several older Easter eggs are only a video or audio file inside the shared overlay.
- Presentation depth varies substantially between entries.
- Some games depend on external iframes.
- Space Invaders is desktop-only instead of offering touch controls.
- Older entries do not all have dedicated automated tests.
- Some entries use unique closing or timing behaviour rather than one unified lifecycle.
- Command registration remains concentrated in `js/ccg-global.js`.

## Upgrade rules

- Never alter `index.html`, `resources/css/intro.css` or `js/index-intro.js`.
- Never alter `games/games.json`.
- Preserve E1 Datasette and E2 BASIC unless an improvement is intentional and fully tested.
- Use one feature branch and one pull request per phase.
- Every phase must include desktop, mobile, reduced-motion, close, focus and scroll-restoration checks.
- Do not use broad `git add -A` commands in workflows.
- Scope checks must tolerate unrelated later-phase files.
- Avoid external runtime dependencies where a local implementation is realistic.

## Proposed phases

### E3 — Easter egg framework hardening

- Extract shared Easter egg helpers from `js/ccg-global.js` into a dedicated module without changing behaviour.
- Unify lifecycle, cleanup, focus, scroll restoration and viewport binding.
- Add registry metadata for label, code, platform support and accessibility notes.
- Add a full regression workflow covering every current command.

### E4 — Space Invaders local edition

- Replace the external iframe with a local CCG-styled mini-game.
- Add keyboard and touch controls.
- Add score, lives, pause, restart and mobile layout.

### E5 — Pac-Man upgrade

- Improve the local Pac-Man presentation.
- Add touch controls, clearer instructions, pause and restart.
- Add short-mobile testing.
- Preserve the existing retro character of the game.

### E6 — ZX Spectrum interruption

- Remove dependence on the external emulator page where possible.
- Create a self-contained Spectrum-style loading and interruption sequence.
- Retain the existing Clive interruption gag and audio timing.

### E7 — Audio Easter egg upgrades

Upgrade TERMINATOR, MARIO, NOKIA and SONIC from plain audio screens into distinct animated experiences with replay controls, volume controls and reduced-motion alternatives.

### E8 — Video Easter egg upgrades

Upgrade PRESS PLAY, VHS, BOING, MATRIX, HE-MAN, LEMMINGS, PARTY and KONAMI so each has a themed frame, title, controls, fallback state and consistent close behaviour.

### E9 — System effects upgrade

Improve SYS64738, BSOD and WARP with stronger transitions, reliable cancellation, mobile containment and scroll restoration.

### E10 — Secret console polish

- Organise the command menu into categories.
- Add keyboard focus navigation.
- Show desktop and mobile availability.
- Add optional hidden-command hints without revealing every surprise immediately.

## Completion standard

A phase is complete only when:

- protected files are unchanged;
- tests pass on desktop, mobile and short-mobile viewports;
- reduced-motion behaviour is verified;
- opening and closing restores focus and exact scroll position;
- no console errors are introduced;
- all workflow checks pass before merge.
