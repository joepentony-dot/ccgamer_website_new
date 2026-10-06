# CCG browser C64 emulator

## Stage 1 — original Omega command deck and ROM boundary — 6 October 2026

- Active branch: `codex/ccg-c64-browser-emulator-stage1`, created from main `60d1aff5deecfa5b08b184103a2c2cf09dfa9450`.
- The route is `/emulator/c64/`. It is a separate browser-emulator application, not an iframe and not a reskin of another public page.
- Visual ownership is CCG-only: an original three-column Omega command deck places system status on the left, a large CRT/command console in the centre, and media bays on the right. Mobile reorders CRT first, then system and media controls. No upstream product name or branding appears in the emulator UI.
- Stage 1 implements the real local ROM boundary: KERNAL/BASIC/CHARGEN plus optional 1541 DOS size validation, VICE-folder scanning, individual ROM selection, fixed CCG-local storage keys, cached restoration and explicit local-only privacy copy.
- Copyrighted Commodore ROMs are not included or fetched by the site.
- GPL obligations remain mandatory. Derived source files retain applicable copyright/licence notices. The public legal page describes GPL-derived components without using upstream branding as CCG product branding.
- `_headers` scopes COOP/COEP and gamepad permissions to `/emulator/c64/*` so SharedArrayBuffer can be enabled for the future SID AudioWorklet without imposing COEP on the rest of the CCG website.
- `emulation.html` gains a direct Browser C64 route. Sitemap registration is intentionally deferred until the emulator is release-ready, because the permanent year/platform validator treats unrelated in-flight static-route additions as a Phase 4D contract violation.
- Lighthouse rule: the emulator is isolated to its own route. No emulator payload is added to ordinary CCG pages beyond the small link. Stage 1 contains no iframe and no third-party runtime script.
- Qualification repair: the initial dedicated workflow used CommonJS `require()` inside `.mjs` tests; those tests are now native ESM. The premature sitemap registry addition was removed rather than weakening the unrelated Phase 4D year/platform validator.
- Intro loader files and `games/games.json` are untouched.

## Video-core integration — 6 October 2026

- The GPL machine dependency graph required for BASIC boot is now vendored under `js/ccg-c64/core/`, preserving source copyright/SPDX notices while leaving all upstream UI/CSS behind.
- `app.js` now creates `C64Machine` only after the required ROM bank is present, loads KERNAL/BASIC/CHARGEN, optionally attaches the user's 1541 DOS ROM, runs PAL-paced frames and blits the real 384×272 VIC-II framebuffer into the CCG CRT.
- Power, reset, pause and fullscreen are live. A bounded quick-load path accepts a user PRG, injects it into the running machine and starts it through the core's existing PRG run path.
- This establishes a real emulator video boot path rather than a visual mock-up. Audio and complete physical input/media ownership remain outstanding.

## Physical input integration — 6 October 2026

- The CCG shell now routes focused physical keyboard input directly into the CIA1 C64 keyboard matrix using the core's retained matrix maps, including function keys and a dedicated F12 RESTORE/NMI path.
- Browser shortcuts are not globally captured: keyboard ownership applies only while the CCG CRT canvas has focus.
- The first connected standard gamepad is polled once per animation frame and routed to joystick Port 2 with analogue/D-pad directions and primary fire buttons. Disconnect returns the port to the active-high idle byte.
- Blur, power-off and page-hide release all held matrix/joystick/NMI state so browser focus changes cannot leave stuck C64 keys.
- The System Rail now reports whether the active input path is keyboard or a detected Port 2 gamepad.

## Not merge-ready yet

The machine/video core, power/reset/pause lifecycle and a first PRG quick-load path are now connected. Before merge, the branch must still integrate and qualify SID/worklet audio, disk/tape/cartridge loading, save-state/media storage, mobile controls, source/licence inventory and performance. Physical keyboard and standard gamepad Port 2 routing are now present but still require browser-level qualification. The Stage 1 shell should remain the visual contract while those systems are connected.

## Visual/legal rule

Do not copy the upstream interface, panel arrangement, branding, wording or artwork. CCG presentation must remain independently designed. Do not remove copyright or licence notices from code that is actually derived from GPL source merely to hide provenance; legal attribution belongs in source/legal notices, not in the branded emulator UI.
