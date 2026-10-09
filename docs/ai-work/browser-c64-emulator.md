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

## First disk-bay workflow — 6 October 2026

- The D8 Media Bay is no longer a dead placeholder: while the machine is running it accepts a local D64 image, validates the byte length through the retained disk parser, mounts it on Drive 8 and queues LOAD/RUN.
- This first route intentionally selects the virtual-drive fast-load path after mounting so launch behaviour is deterministic while advanced true-drive UI/qualification is still outstanding. The user's optional 1541 ROM remains retained and will be used when the later true-drive control surface is exposed.
- The command deck reports the mounted disk name/file and returns CRT focus after selection.
- D71/D81/G64 remain disabled rather than advertising unsupported active controls; the visible first-pass button says LOAD D64.

## First live SID audio path — 6 October 2026

- The CCG command deck now starts a same-origin AudioWorklet from the Boot C64 user gesture and wires the machine's existing SharedArrayBuffer SID event stream into it.
- The AudioWorklet is a CCG-specific adapter rather than an imported UI/runtime shell. It uses the retained GPL SID voice core, applies cycle-stamped register writes, keeps oscillator hard-sync ordering, outputs stereo browser audio and exposes a CCG Mute/Unmute control.
- A short local prefill keeps the audio clock behind the frame-burst producer so register writes are available before playback reaches their cycle stamps.
- Power-off, reset and pause now have explicit audio lifecycle messages so sound cannot continue after the emulated machine has stopped.
- This first pass intentionally does not ship the optional compiled SID WASM engine. It also does not yet reproduce the full reSID analog filter/mixer/output stage; that remains a dedicated fidelity/qualification pass rather than blocking first live sound.

## Media Bay, Game Vault and mobile-control expansion — 6 October 2026

- The disk bay now accepts validated D64, D71 and D81 images. D64 can switch between deterministic Fast Load and the cycle-driven True 1541 path when the user has supplied the optional 1541 DOS ROM; D71/D81 stay on the virtual-drive path because they are not 1541 media.
- The Datasette bay now accepts TAP images with PLAY/STOP/REW transport controls and queues the normal C64 LOAD command. T64 containers use a bounded CCG-owned parser to extract the first runnable PRG for direct quick-load; unsupported or malformed containers are rejected rather than guessed.
- The cartridge bay now accepts CRT images through the retained cartridge hardware registry and supports eject/reset lifecycle.
- The CCG Game Vault now provides three browser-local IndexedDB save slots. A slot captures the core's restorable machine state plus the currently mounted disk, TAP and CRT bytes so restore can rebuild the matching media environment before applying the state.
- Mobile now exposes an on-page Port 2 direction pad and FIRE button. Touch and standard gamepad input are merged as active-low joystick state rather than overwriting one another.
- The physical-key held-binding key now uses the stable KeyboardEvent.code identity so releasing Shift before a symbol key cannot strand a C64 matrix key.

## SID analogue path, G64 and source inventory — 6 October 2026

- The CCG AudioWorklet now routes the three cycle-clocked SID voices through the retained reSID-derived transistor-level SID filter/mixer/nonlinear volume stage and the C64 external RC output filter. The earlier lightweight volume/DC placeholder has been removed.
- The filter implementation remains JavaScript source and keeps the upstream GPL/reSID/VICE notices; no compiled SID WebAssembly payload is shipped by the CCG route.
- G64 raw GCR track images are now supported through the retained G64 parser. Because G64 exists to preserve raw 1541 track layout and protection behavior, the CCG route requires the user's optional 1541 DOS ROM and automatically selects True 1541 mode for G64 media.
- A CCG-specific THIRD-PARTY-NOTICES file now records the bundled GPL core/reSID/VICE provenance without claiming that unrelated upstream fonts, 3D models or third-party UI dependencies are part of the CCG build.

## Not merge-ready yet

The machine/video core, SID browser audio, keyboard/gamepad/touch input, D64/D71/D81 media, optional True 1541, TAP/T64, CRT cartridge loading and three local Game Vault slots are now connected. Before merge, the remaining product work is final SID analogue-fidelity qualification, a decision on G64 support, final third-party/source inventory, deployed browser acceptance, release sitemap registration and a last Lighthouse/performance review. The Stage 1 shell remains the visual contract.

## Dual-action mobile input — 9 October 2026

- Branch: `codex/c64-mobile-dual-action-controls-20261009`.
- Optional JUMP uses the original joystick UP bit. FIRE uses its original bit. The original F1/F3/F5/F7 CIA-matrix keys remain, under an expandable mobile panel.
- The hosted library applies per-game controls when loaded. Unverified games remain FIRE-only; players can opt in to JUMP and save preferences per title on their device. No guessed binary-file classification.
- Per-button held states preserve overlapping joystick UP and JUMP, including pointer cancellations; reset releases all controls.
- Qualify portrait/landscape, fullscreen, function keys, source contracts and performance before merge.

## Visual/legal rule

Do not copy the upstream interface, panel arrangement, branding, wording or artwork. CCG presentation must remain independently designed. Do not remove copyright or licence notices from code that is actually derived from GPL source merely to hide provenance; legal attribution belongs in source/legal notices, not in the branded emulator UI.
