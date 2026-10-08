#!/usr/bin/env node
"use strict";

import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const html = read("emulator/c64/index.html");
const css = read("resources/css/ccg-c64-emulator.css");
const app = read("js/ccg-c64/app.js");
const cia = read("js/ccg-c64/core/cia.js");
const audioWorklet = read("js/ccg-c64/core/sid/sid-worklet.js");
const sidWasmBlob = read("js/ccg-c64/core/sid/sid-wasm-blob.js");
const webglPresenter = read("js/ccg-c64/core/webgl-presenter.js");
const crtParams = read("js/ccg-c64/core/crt-params.js");
const sidFilter = read("js/ccg-c64/core/sid/sid-filter.js");
const g64 = read("js/ccg-c64/core/media/g64.js");
const gameVault = read("js/ccg-c64/game-vault.js");
const t64 = read("js/ccg-c64/t64.js");
const vault = read("js/ccg-c64/rom-vault.js");
const headers = read("_headers");
const emulation = read("emulation.html");
const onlineLibrary = JSON.parse(read("emulator/c64/library.json"));
const coiBootstrap = read("js/ccg-c64/coi-bootstrap.js");
const coiWorker = read("emulator/c64/coi-service-worker.js");

assert(html.includes("CCG BROWSER C64") || html.includes("CCG C64"), "CCG identity is required");
assert(!/C64 READY\.?/i.test(html), "Upstream product branding must not appear in the CCG emulator UI");
assert(html.includes('width="384" height="272"'), "Native C64 canvas dimensions must be reserved");
assert(!html.includes("webkitdirectory"), "The emulator must not force a VICE-folder scan");
assert(html.includes('id="ccg-rom-set"') && html.includes("multiple"), "Direct multi-file system ROM selection must exist");
assert(html.includes("data-load-any-media"), "A file-first C64 media loader must exist");
assert(html.includes("data-media-dropzone"), "Drag-and-drop media loading must exist");
assert(html.includes("data-online-library-select"), "The CCG Online Library selector must exist");
assert(html.includes("data-emulator-back"), "The emulator route must expose a visible Back control");
assert(html.includes('href="/home.html"') && html.includes('href="/games/"') && html.includes('href="/emulation.html"'), "The emulator route must expose core CCG site navigation");
assert(!/<iframe\b/i.test(html), "Stage 1 must not introduce eager third-party frames");
assert(!/<script[^>]+https?:/i.test(html), "Emulator shell must not load third-party scripts");
assert(html.includes('src="/js/ccg-c64/coi-bootstrap.js"'), "Emulator shell must start through the COI bootstrap");
assert(!html.includes('src="/js/ccg-c64/app.js"'), "The C64 app must not start before cross-origin isolation is ready");
assert(coiBootstrap.includes('navigator.serviceWorker.register(WORKER_URL'), "COI bootstrap must register the route-scoped worker");
assert(coiBootstrap.includes('window.crossOriginIsolated === true'), "COI bootstrap must verify browser isolation before importing the emulator");
assert(coiBootstrap.includes('await import("/js/ccg-c64/app.js")'), "COI bootstrap must import the emulator only after isolation");
assert(coiBootstrap.includes('location.reload()'), "COI bootstrap must reload once under the isolated document response");
assert(coiWorker.includes('Cross-Origin-Opener-Policy'), "COI worker must stamp COOP on emulator navigation responses");
assert(coiWorker.includes('Cross-Origin-Embedder-Policy'), "COI worker must stamp COEP on emulator navigation responses");
assert(coiWorker.includes('request.mode !== "navigate"'), "COI worker must remain scoped to document navigations");
assert(coiWorker.includes('url.pathname.startsWith(EMULATOR_SCOPE)'), "COI worker must not rewrite unrelated CCG routes");
assert(css.includes(".ccg-c64-control-stack"), "Compact modular control-deck layout must be present");
assert(css.includes('grid-template-areas: "console controls"'), "Desktop C64 workstation must pin console and controls to named grid areas");
assert(css.includes('.ccg-c64-workspace > :not(.ccg-c64-console):not(.ccg-c64-control-stack)'), "Injected route UI must not become a third workstation grid item");
assert(css.includes("grid-area: console"), "C64 display must stay in the left workstation column");
assert(css.includes("grid-area: controls"), "C64 controls must stay in the right workstation column");
assert(css.includes(".ccg-c64-screen-stage"), "Large emulator display stage must be present");
assert(css.includes("@media (max-width: 760px)"), "Mobile command-deck layout is required");
assert(vault.includes("ccg.emulator.c64.rom.kernal"), "CCG-local ROM namespace is required");
assert(vault.includes("export function pickRomFiles"), "Generic ROM-set matching must replace VICE-only discovery");
assert(vault.includes("async installFiles(files)"), "ROM vault must support installing a selected ROM set");
assert(vault.includes("sizes: [8192]"), "KERNAL/BASIC size validation is required");
assert(vault.includes("sizes: [4096]"), "CHARGEN size validation is required");
assert(vault.includes("sizes: [16384, 16386]"), "1541 size validation is required");
assert(app.includes("vault.restore()"), "Cached ROM restoration must be wired");
assert(app.includes('if (initial.allRequiredReady && typeof SharedArrayBuffer !== "undefined")'), "Cached system ROMs must auto-boot the real C64 on page load");
assert(app.includes("void powerOn();"), "Cached-ROM startup must invoke the real C64 power-on path");
assert(app.includes('document.querySelector("[data-emulator-back]")'), "Back navigation must be wired in the emulator application");
assert(!app.includes("if (!initial.allRequiredReady) showSetup()"), "First visit must not force the firmware setup modal");
assert(app.includes("pendingMedia"), "Media selected before system ROM setup must be queued");
assert(app.includes("queueMediaFile"), "File-first media routing must be wired");
assert(app.includes("initialiseOnlineLibrary"), "Online Library manifest loading must be wired");
assert(app.includes('fetch("/emulator/c64/library.json"'), "Online Library must load from the CCG manifest");
assert(app.includes('import { C64Machine } from "./core/machine.js"'), "Machine core must be wired into the CCG app");
assert(app.includes("machine.runFrame()"), "PAL frame execution must be wired");
assert(app.includes("machine.loadPRG(bytes)"), "Stage 2 quick PRG loading must be wired");
assert(app.includes('import { KEY_MAP, CHAR_MAP } from "./core/cia.js"'), "C64 keyboard matrix maps must be wired");
assert(app.includes("machine.cia1.setKey"), "Physical keyboard input must reach the CIA1 matrix");
assert(app.includes("machine.setRestoreNmiLine"), "RESTORE/NMI keyboard handling must be wired");
assert(app.includes("navigator.getGamepads"), "Gamepad polling must be wired");
assert(app.includes("gamepadJoyByte = byte"), "Gamepad input must feed the shared Port 2 merger");
assert(app.includes("touchHeldMask |= mask"), "Touch controls must feed joystick Port 2");
assert(app.includes('event.code || `key:${event.key}`'), "Held keyboard identity must survive Shift changes");
assert(cia.includes("'*': { col: 6, row: 1, shift: false }"), "C64 asterisk must remain the unshifted matrix key");
assert(app.includes("else if (!charBinding.shift && shiftDown)"), "Symbol mapping must suppress host Shift when the C64 symbol is unshifted");
assert(app.includes("releasedLeftShift") && app.includes("releasedRightShift"), "Symbol mapping must restore either physical Shift key after a host-layout override");
assert(app.includes('event.getModifierState?.("AltGraph")'), "AltGr must not leak a phantom C64 CTRL modifier");
assert(app.includes('event.code === "ArrowLeft"') && app.includes('event.code === "ArrowUp"'), "VICE-style shifted cursor mapping must be retained");
assert(app.includes('F2: "F1"') && app.includes('F8: "F7"'), "VICE-style shifted function-key mapping must be retained");
assert(app.includes('import { D64, d64Variant } from "./core/media/d64.js"'), "D64 parser must be wired into the media bay");
assert(app.includes("machine.setD64(disk)"), "Drive 8 disk mounting must reach the machine core");
assert(app.includes("queueAutoStart(["), "The D64 loader must use the staged auto-start queue rather than the retired direct LOAD/RUN shortcut");
assert(app.includes('let driveMode = "fast"'), "Each emulator visit must start in Fast Load so ordinary disk images auto-start");
assert(app.includes("firstSupportedDroppedFile"), "Screen drop loading must choose a supported C64 media file");
assert(app.includes('mediaDropzone?.addEventListener("drop"'), "The C64 screen stage must accept dropped game media");
assert(app.includes("await queueMediaFile(file, { freshBoot: true })"), "Dropped media must use the same clean automatic boot/load route as primary file selection");
assert(html.includes("LOAD &amp; AUTO START"), "Primary file loader must advertise automatic game start");
assert(app.includes("function basicReady()"), "Auto-start must wait for a real BASIC READY prompt");
assert(app.includes("function queueAutoStart(steps)"), "Auto-start must use a staged load sequence");
assert(app.includes("function serviceAutoStart()"), "Auto-start sequence must advance from the emulation loop");
assert(app.includes("machine.bufferKeyboardText(autoStartTypeRest)"), "Long LOAD commands must be chunk-fed through the C64 keyboard buffer");
assert(app.includes("{ loadDone: true }"), "Disk/tape auto-start must wait for loading to finish before RUN");
assert(app.includes("prepareFreshGameSession()"), "Primary file loading must be able to start a clean C64 session");
assert(app.includes("queueMediaFile(file, { freshBoot: true })"), "Primary file and drop routes must request a clean auto-start session");
assert(app.includes("{ type: 'LOAD\"*\",8,1\\r' }"), "Disk auto-start must enter LOAD wildcard on device 8");
assert(app.includes('{ type: "RUN\\r" }'), "Disk/tape auto-start must enter RUN after loading");
assert(html.includes("AUTO START") && html.includes("DRAG &amp; DROP"), "The emulator UI must advertise screen drop auto-start");
assert(html.includes("data-load-disk"), "The CCG media bay must expose its disk load control");
assert(html.includes('accept=".d64,.d71,.d81,.g64"'), "Disk bay must expose D64/D71/D81/G64 workflows");
assert(app.includes("new G64(bytes)"), "G64 raw-track media must be wired");
assert(g64.includes("GCR-1541"), "G64 parser must validate the raw-track signature");
assert(html.includes("data-drive-mode"), "Disk bay must expose Fast Load / True 1541 switching");
assert(html.includes("data-load-tape"), "Datasette bay must expose TAP/T64 loading");
assert(html.includes("data-load-cartridge"), "Cartridge bay must expose CRT loading");
assert(html.includes('accept=".prg,.d64,.d71,.d81,.g64,.tap,.t64,.crt"'), "Unified loader must advertise every supported user-media format");
assert(html.includes("data-vault-save"), "Game Vault must expose save controls");
assert(html.includes("data-joy-mask"), "Mobile touch joystick controls must exist");
assert(app.includes('machine.loadTap(bytes)'), "TAP media must reach the datasette");
assert(app.includes("extractFirstT64Program(bytes)"), "T64 quick-load path must be wired");
assert(app.includes("machine.loadCartridge(bytes)"), "CRT media must reach the cartridge hardware path");
assert(app.includes("machine.serializeState()"), "Game Vault must capture restorable machine state");
assert(app.includes("restored.restoreState(payload.state)"), "Game Vault must restore machine state");
assert(gameVault.includes('indexedDB.open(DB_NAME, DB_VERSION)'), "Game Vault must use browser-local IndexedDB");
assert(t64.includes("extractFirstT64Program"), "T64 parser must be present");
assert(html.includes("data-input-status"), "The command deck must expose live input state");
assert(html.includes("data-audio-status"), "The command deck must expose SID audio state");
assert(html.includes("data-audio-toggle"), "The command deck must expose SID mute control");
assert(html.includes("data-crt-toggle"), "The deck must expose CRT preset switching");
assert(html.includes("data-size-toggle"), "The deck must expose fit/2x display switching");
assert(html.includes("data-warp-load"), "The deck must expose Warp Load");
assert(app.includes("const WARP_FRAME_BUDGET_MS = 12"), "Warp Load must be bounded by a real-time budget");
assert(app.includes("const WARP_MAX_FRAMES_PER_TICK = 1024"), "Warp Load must retain a runaway-frame safety guard");
assert(app.includes("performance.now() - start < WARP_FRAME_BUDGET_MS"), "Warp must use as many emulated frames as the device can sustain, not a fixed 4x speed");
assert(app.includes("frameAccumulator += delta"), "Normal PAL-timed playback must remain unchanged when Warp is off");
assert(app.includes("WARP SILENT"), "Warp Load must silence SID output while accelerated");
assert(app.includes("sidNode?.port.postMessage({ type: \"resync\" })"), "SID resync must remain available when Warp Load returns to 1x");
assert(app.includes("audioWorklet.addModule(SID_WORKLET_URL)"), "SID AudioWorklet module must be loaded");
assert(app.includes('SID_WORKLET_URL = "/js/ccg-c64/core/sid/sid-worklet.js"'), "The upstream-quality SID worklet path must be active");
assert(app.includes("shared: machine.sidShared"), "SID worklet must receive the machine SharedArrayBuffer");
assert(app.includes('engine: "wasm"'), "The upstream reSID WASM engine must be requested");
assert(app.includes('new AudioWorkletNode(audioContext, "sid-processor"'), "The upstream SID processor name must be used");
assert(audioWorklet.includes("registerProcessor('sid-processor'"), "Upstream SID processor must be registered");
assert(audioWorklet.includes("EVENT_LOOKAHEAD_CYCLES"), "SID timing/lookahead transport must be retained");
assert(audioWorklet.includes("SIDFilter"), "SID worklet must use the reSID-derived filter/mixer stage");
assert(audioWorklet.includes("SIDExternalFilter"), "SID worklet must use the C64 external RC output stage");
assert(audioWorklet.includes("sidWasmBytes"), "SID worklet must wire the embedded WASM engine");
assert(sidWasmBlob.includes("export function sidWasmBytes"), "Compiled SID WASM payload must be present");
assert(sidFilter.includes("filter8580new"), "Retained SID filter source must identify its reSID lineage");
assert(webglPresenter.includes("export class WebGLPresenter"), "Upstream WebGL presenter must be bundled");
assert(app.includes("WebGLPresenter.create"), "WebGL presenter must be the primary display path");
assert(app.includes("presentationBuffer()"), "Presented VIC-II buffer must feed WebGL");
assert(crtParams.includes("CRT_PRESETS"), "CRT preset definitions must be bundled");
assert(app.includes("presetParams(crtMode)"), "CRT presets must reach the presenter");
assert(!app.includes("frames < 3"), "The old three-frame catch-up cap must not throttle emulation after a stall");
assert(app.includes('type: "resync"'), "SID must resync after host-side pauses and display transitions");
assert(headers.includes("/emulator/c64/*"), "Emulator-specific headers are required");
assert(headers.includes("Cross-Origin-Embedder-Policy: require-corp"), "COEP must be scoped for SharedArrayBuffer");
assert(emulation.includes('href="/emulator/c64/"'), "Emulation hub must link to the CCG browser emulator");
assert.equal(onlineLibrary.version, 1, "Online Library manifest version must be pinned");
assert(Array.isArray(onlineLibrary.entries), "Online Library manifest must contain an array (which may be empty)");
assert(!onlineLibrary.entries.some((entry) => entry.id === "ccg-emulator-test-prg" || entry.title === "CCG Emulator Test"),
  "The dummy CCG test PRG must never appear in the public catalogue");
assert(onlineLibrary.entries.every((entry) => entry.approved === true &&
  typeof entry.license === "string" && entry.license.trim() &&
  ((typeof entry.url === "string" && entry.url.startsWith("/emulator/c64/media/")) ||
   (typeof entry.dataBase64 === "string" && entry.dataBase64.length > 0))),
  "Public games need explicit redistribution approval, licence and media");
assert(html.includes('class="ccg-c64-panel ccg-c64-panel--library" hidden'),
  "Online Library must be hidden until approved titles are available");
assert(app.includes("onlineLibraryPanel.hidden = onlineLibraryEntries.length === 0"),
  "Approved titles must automatically reveal Online Library");

// Verify actual shipped game bytes, not merely dropdown labels or broken
// external download links. Git blob hashes pin the exact developer releases.
const gameNotices = read("emulator/c64/media/LICENCES.txt");
assert(onlineLibrary.entries.length >= 3, "Approved Online Library must contain playable games, not placeholder items");
assert(onlineLibrary.entries.some((entry) => entry.id === "snake64"), "Snake must be included");
assert(onlineLibrary.entries.some((entry) => entry.id === "8bit-island"), "8 Bit Island must be included");
assert(onlineLibrary.entries.some((entry) => entry.id === "meteor-storm"), "Meteor Storm must be included");
const seenGameIds = new Set();
for (const entry of onlineLibrary.entries) {
  assert(!seenGameIds.has(entry.id), "Duplicate approved game ID: " + entry.id);
  seenGameIds.add(entry.id);
  assert(entry.approved === true && entry.license === "MIT",
    "Public entries require explicit licensing approval: " + entry.id);
  assert(/^\/emulator\/c64\/media\/[a-z0-9-]+\.prg$/.test(entry.url),
    "Hosted PRG paths must be local and restricted to the game media folder: " + entry.id);
  assert(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(entry.source),
    "Each game must identify its upstream GitHub source: " + entry.id);
  assert(/^[a-f0-9]{40}$/.test(entry.sourceCommit) && /^[a-f0-9]{40}$/.test(entry.sourceBlob),
    "Each game must be pinned to a verified source revision and original game blob");
  const program = fs.readFileSync(path.join(root, entry.url.slice(1)));
  assert.equal(program.length, entry.bytes, "Hosted game size must match approved manifest: " + entry.id);
  assert.equal(program[0] | (program[1] << 8), 0x0801,
    "Approved game must have a valid C64 BASIC-loadable PRG header: " + entry.id);
  assert(program.length >= 100 && program.length <= 65536, "Game must fit a normal C64 PRG: " + entry.id);
  const blobHash = createHash("sha1").update(`blob ${program.length}\0`).update(program).digest("hex");
  assert.equal(blobHash, entry.sourceBlob,
    "Hosted game must be exactly the developer's approved binary: " + entry.id);
  assert(gameNotices.includes(entry.sourceBlob) && gameNotices.includes(entry.sourceCommit),
    "Game copyright and licence notice must retain original file provenance: " + entry.id);
}
assert(app.includes("machine.injectRun()") &&
  app.includes("await queueMedia({ name: filename, type, bytes }, { freshBoot: true })"),
  "Online Library selection must pass playable PRG bytes to the existing auto-start pipeline");

assert(html.includes("data-keyboard-joystick"),
  "Players must be able to use a keyboard as C64 joystick");

console.log("CCG browser C64 Stage 1 contract passed.");
