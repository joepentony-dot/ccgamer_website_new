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

### E11 — Interactive Archive Expansion

Add ten original, local, interactive experiences rather than media-only overlays:

- **CCG BBS** — command-driven 2400-baud bulletin board with hidden commands and links into other E11 experiences.
- **Guru Meditation** — responsive Amiga-style failure/recovery screen with diagnostics and reduced-motion handling.
- **SID Lab** — three-voice browser synth lab with waveform, detune, level, filter and keyboard controls plus oscilloscope.
- **1541 Drive** — interactive drive terminal with directory/status/load commands, generated head/noise audio and activity states.
- **CCG Cracktro** — original canvas starfield/raster presentation with scroller, pause and generated chiptune-style audio.
- **Amiga Workbench** — interactive desktop with drawers, draggable window and archive link.
- **C64 Sprite Editor** — 24×21 editor with pointer/touch drawing, mirror/invert/random tools and live 63-byte export.
- **Modem** — Hayes-style terminal with local generated handshake and a live handoff into the BBS.
- **Disk Error** — recoverable 1541-style fault puzzle which hands off into the working 1541 experience.
- **Amiga Boot** — Kickstart-inspired disk insertion sequence which hands off into Workbench.

E11 also adds persistent local discovery tracking. The secret console shows **SECRETS FOUND: n / ???** without revealing the catalogue total, and nested handoffs count as discoveries.

Implementation rules:

- lazy-load E11 modules only when requested;
- keep all E11 runtime dependencies local;
- keep styling in `resources/css/`;
- preserve the shared overlay lifecycle, Escape handling, viewport binding, focus restoration and scroll restoration;
- support desktop, mobile, short-mobile and reduced-motion contexts;
- do not touch the intro loader stack or `games/games.json`;
- require the E3 registry regression and dedicated E11 Chromium qualification before merge.

## Completion standard

A phase is complete only when:

- protected files are unchanged;
- tests pass on desktop, mobile and short-mobile viewports;
- reduced-motion behaviour is verified;
- opening and closing restores focus and exact scroll position;
- no console errors are introduced;
- all workflow checks pass before merge.
