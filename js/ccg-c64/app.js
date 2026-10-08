import { ROMVault, ROM_SPEC, REQUIRED_ROM_KEYS, pickRomFiles } from "./rom-vault.js";
import { C64Machine } from "./core/machine.js";
import { KEY_MAP, CHAR_MAP } from "./core/cia.js";
import { D64, d64Variant } from "./core/media/d64.js";
import { G64, isG64 } from "./core/media/g64.js";
import { GameVault } from "./game-vault.js";
import { extractFirstT64Program } from "./t64.js";
import { WebGLPresenter } from "./core/webgl-presenter.js";
import { CRT_MODES, presetParams } from "./core/crt-params.js";
import { PACK_ROOT, PACK_CATALOG_URL, parsePackedCatalog, filterCatalog, loadPackedGameBytes } from "./game-catalog.js";

const vault = new ROMVault();
const gameVault = new GameVault();
const setup = document.querySelector("[data-rom-setup]");
const finishSetup = document.querySelector("[data-finish-setup]");
const romSummary = document.querySelector("[data-rom-summary]");
const romSetInput = document.getElementById("ccg-rom-set");
const romSetMessage = document.querySelector("[data-rom-set-message]");
const closeSetupButton = document.querySelector("[data-close-setup]");
const loadAnyMediaButton = document.querySelector("[data-load-any-media]");
const anyMediaInput = document.getElementById("ccg-c64-any-media-input");
const mediaDropzone = document.querySelector("[data-media-dropzone]");
const onlineLibraryPanel = document.querySelector(".ccg-c64-panel--library");
const controlsDeck = document.querySelector(".ccg-c64-control-stack");
const onlineLibrarySearch = document.querySelector("[data-online-library-search]");
const onlineLibraryGrid = document.querySelector("[data-online-library-grid]");
const onlineLibraryLetters = document.querySelector("[data-library-letters]");
const onlineLibraryCount = document.querySelector("[data-library-result-count]");
const onlineLibraryFormats = document.querySelector(".ccg-c64-library-formats");
const onlineLibraryPages = document.querySelector("[data-library-pages]");
const onlineLibraryPageText = document.querySelector("[data-library-page-indicator]");
const onlineLibraryPrevious = document.querySelector("[data-library-previous]");
const onlineLibraryNext = document.querySelector("[data-library-next]");
const onlineLibraryStatus = document.querySelector("[data-online-library-status]");
const onlineLibraryDisks = document.querySelector("[data-online-library-disks]");
const onlineLibraryDiskSelect = document.querySelector("[data-online-library-disk-select]");
const onlineLibraryDiskSwapButton = document.querySelector("[data-online-library-disk-swap]");
const machineState = document.querySelector("[data-machine-state]");
const screen = document.getElementById("ccg-c64-screen");
// Match the upstream C64 READY presentation path: WebGL first, Canvas2D only as a fallback.
// This must run before any 2D context is requested because a canvas binds to its first context type.
const presenter = screen ? WebGLPresenter.create(screen, screen.width, screen.height) : null;
const screenCtx = !presenter && screen ? screen.getContext("2d") : null;
const statusCanvas = document.createElement("canvas");
statusCanvas.width = screen?.width || 384;
statusCanvas.height = screen?.height || 272;
const statusCtx = statusCanvas.getContext("2d");
const fullscreenButton = document.querySelector("[data-fullscreen]");
const powerButton = document.querySelector("[data-machine-power]");
const resetButton = document.querySelector("[data-machine-reset]");
const pauseButton = document.querySelector("[data-machine-pause]");
const warpLoadButton = document.querySelector("[data-warp-load]");
const loadMediaButton = document.querySelector("[data-load-media]");
const prgInput = document.getElementById("ccg-c64-prg-input");
const loadDiskButton = document.querySelector("[data-load-disk]");
const diskInput = document.getElementById("ccg-c64-disk-input");
const swapDiskButton = document.querySelector("[data-swap-disk]");
const swapDiskInput = document.getElementById("ccg-c64-swap-disk-input");
const diskSlotStatus = document.querySelector("[data-disk-slot-status]");
const driveModeButton = document.querySelector("[data-drive-mode]");
const loadTapeButton = document.querySelector("[data-load-tape]");
const tapeInput = document.getElementById("ccg-c64-tape-input");
const tapeSlotStatus = document.querySelector("[data-tape-slot-status]");
const tapePlayButton = document.querySelector("[data-tape-play]");
const tapeStopButton = document.querySelector("[data-tape-stop]");
const tapeRewindButton = document.querySelector("[data-tape-rewind]");
const loadCartridgeButton = document.querySelector("[data-load-cartridge]");
const cartridgeInput = document.getElementById("ccg-c64-cartridge-input");
const cartridgeSlotStatus = document.querySelector("[data-cartridge-slot-status]");
const ejectCartridgeButton = document.querySelector("[data-eject-cartridge]");
const vaultSlot = document.querySelector("[data-vault-slot]");
const vaultSaveButton = document.querySelector("[data-vault-save]");
const vaultLoadButton = document.querySelector("[data-vault-load]");
const vaultClearButton = document.querySelector("[data-vault-clear]");
const vaultStatus = document.querySelector("[data-vault-status]");
const stageNote = document.querySelector("[data-stage-note]");
const inputStatus = document.querySelector("[data-input-status]");
const joystickSwapButton = document.querySelector("[data-joystick-swap]");
const keyboardJoystickButton = document.querySelector("[data-keyboard-joystick]");
const joystickPortIndicator = document.querySelector("[data-joystick-port]");
const emulatorSpeedStatus = document.querySelector("[data-emulator-speed]");
const audioStatus = document.querySelector("[data-audio-status]");
const audioButton = document.querySelector("[data-audio-toggle]");
const crtButton = document.querySelector("[data-crt-toggle]");
const sizeButton = document.querySelector("[data-size-toggle]");
const screenStage = document.querySelector(".ccg-c64-screen-stage");
const screenBezel = document.querySelector(".ccg-c64-screen-bezel");

const PAL_FRAME_MS = 1000 / 50.125;
// Turbo uses all emulation time available in each animation tick, rather than a fixed 4x cap.
// Keep a little time for rendering, real keyboard events and browser accessibility.
const WARP_FRAME_BUDGET_MS = 12;
const WARP_MAX_FRAMES_PER_TICK = 1024;
let machine = null;
let running = false;
let paused = false;
let warpLoadActive = false;
let frameImage = null;
let frameHandle = 0;
let lastFrameTime = 0;
let frameAccumulator = 0;
let speedSampleTime = 0;
let speedSampleFrames = 0;
let driveMode = "fast"; // Always start user-facing sessions in auto-loading Fast Load mode.
let mountedDisk = null;
// Hold alternate sides in memory so returning to Disk 1 preserves its writes.
const diskSideCache = new Map();
let mountedDiskKey = null;
let activeLibraryEntryId = null;
let activeLibraryDiskIndex = 0;
let mountedTape = null;
let mountedCartridge = null;
let joystickPort = localStorage.getItem("ccg.emulator.c64.joystickPort") === "1" ? 1 : 2;
let keyboardJoystickEnabled = localStorage.getItem("ccg.emulator.c64.keyboardJoystick") === "1";
const keyboardJoystickKeys = new Set();
let keyboardPriorityUntil = 0;
const KEYBOARD_JOYSTICK_MASKS = Object.freeze({
  ArrowUp: 1, KeyW: 1, ArrowDown: 2, KeyS: 2,
  ArrowLeft: 4, KeyA: 4, ArrowRight: 8, KeyD: 8,
  Space: 16, ControlLeft: 16, ControlRight: 16,
});
let gamepadJoyByte = 0xFF;
let touchJoyByte = 0xFF;
let touchHeldMask = 0;
let pendingMedia = null;
let onlineLibraryEntries = [];
let onlineLibraryQuery = "";
let onlineLibraryFormat = "all";
let onlineLibraryLetter = "all";
let onlineLibraryPage = 0;
let onlineLibraryLoadingGame = false;
const onlineLibraryPackCache = new Map();
let autoStartSteps = null;
let autoStartTypeRest = "";
let autoStartSawBusy = false;
let autoStartBudget = 0;
let crtMode = localStorage.getItem("ccg.emulator.c64.crtMode") || "tube";
if (!CRT_MODES.includes(crtMode)) crtMode = "tube";
let fixed2x = localStorage.getItem("ccg.emulator.c64.size") === "2x";

const SID_WORKLET_URL = "/js/ccg-c64/core/sid/sid-worklet.js";
let audioContext = null;
let sidNode = null;
let masterGain = null;
let audioMuted = false;

function applyCrtMode() {
  const strong = crtButton?.querySelector("strong");
  if (!presenter) {
    if (strong) strong.textContent = "PLAIN";
    return;
  }
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  presenter.setCrt(presetParams(crtMode), { reducedMotion });
  if (strong) strong.textContent = crtMode.toUpperCase();
}

function cycleCrtMode() {
  const index = Math.max(0, CRT_MODES.indexOf(crtMode));
  crtMode = CRT_MODES[(index + 1) % CRT_MODES.length];
  localStorage.setItem("ccg.emulator.c64.crtMode", crtMode);
  applyCrtMode();
}

function fitScreenToStage() {
  if (!screenStage || !screenBezel) return;
  // Mobile layouts size from intrinsic aspect ratio. Desktop has a bounded
  // screen stage, so fit the bezel to BOTH measured dimensions, not an
  // assumed vh or a hard-coded browser toolbar height.
  if (!window.matchMedia?.("(min-width: 960px)")?.matches) {
    screenBezel.style.width = "";
    return;
  }
  const style = window.getComputedStyle(screenStage);
  const padX = parseFloat(style.paddingLeft || "0") + parseFloat(style.paddingRight || "0");
  const padY = parseFloat(style.paddingTop || "0") + parseFloat(style.paddingBottom || "0");
  const availableWidth = Math.max(0, screenStage.clientWidth - padX);
  const availableHeight = Math.max(0, screenStage.clientHeight - padY);
  if (!availableWidth || !availableHeight) return;
  const ratio = 384 / 272;
  const bezelWidth = Math.floor(Math.min(
    availableWidth, availableHeight * ratio, fixed2x ? 768 : 1120
  ));
  screenBezel.style.width = `${Math.max(1, bezelWidth)}px`;
}

function applyScreenSize() {
  screenStage?.classList.toggle("is-2x", fixed2x);
  const strong = sizeButton?.querySelector("strong");
  if (strong) strong.textContent = fixed2x ? "2X" : "FIT";
  fitScreenToStage();
}

function toggleScreenSize() {
  fixed2x = !fixed2x;
  localStorage.setItem("ccg.emulator.c64.size", fixed2x ? "2x" : "fit");
  applyScreenSize();
}

applyCrtMode();
applyScreenSize();
if (screenStage && typeof ResizeObserver !== "undefined") {
  new ResizeObserver(fitScreenToStage).observe(screenStage);
}
window.addEventListener("resize", fitScreenToStage);

function updateAudioUi(label = null) {
  if (audioStatus && label) audioStatus.textContent = label;
  if (audioButton) {
    audioButton.disabled = !running || !audioContext || !sidNode;
    const strong = audioButton.querySelector("strong");
    if (strong) strong.textContent = audioMuted ? "UNMUTE" : "MUTE";
  }
}

async function ensureAudioGraph() {
  if (audioContext && sidNode && masterGain) return true;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context || !window.AudioWorkletNode) {
    updateAudioUi("UNAVAILABLE");
    return false;
  }

  audioContext = new Context({ sampleRate: 48000, latencyHint: "interactive" });
  await audioContext.audioWorklet.addModule(SID_WORKLET_URL);
  sidNode = new AudioWorkletNode(audioContext, "sid-processor", {
    outputChannelCount: [2],
  });
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0;
  sidNode.connect(masterGain);
  masterGain.connect(audioContext.destination);
  return true;
}

async function wireAudioToMachine() {
  if (!machine) return false;
  try {
    if (!await ensureAudioGraph()) return false;
    sidNode.port.postMessage({
      type: "init",
      shared: machine.sidShared,
      is8580: machine.sidIs8580,
      engine: "wasm",
    });
    masterGain.gain.setValueAtTime(audioMuted ? 0 : 0.72, audioContext.currentTime);
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    updateAudioUi(audioMuted ? "MUTED" : "SID ACTIVE");
    return true;
  } catch (error) {
    console.warn("[ccg-c64] SID audio unavailable:", error);
    updateAudioUi("AUDIO ERROR");
    return false;
  }
}

function resetAudioForMachine() {
  if (!sidNode || !machine) return;
  sidNode.port.postMessage({ type: "reset", is8580: machine.sidIs8580 });
  if (masterGain && audioContext) {
    masterGain.gain.setValueAtTime(audioMuted ? 0 : 0.72, audioContext.currentTime);
  }
}

function setAudioPaused(value) {
  if (!masterGain || !audioContext) return;
  if (value) {
    masterGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.01);
    return;
  }

  // C64 READY keeps the SID worklet clock free-running. After a main-thread
  // pause/stall, resync it to the machine before reopening the output gain.
  sidNode?.port.postMessage({ type: "resync" });
  masterGain.gain.setTargetAtTime(audioMuted ? 0 : 0.72, audioContext.currentTime, 0.01);
}

function powerOffAudio() {
  if (masterGain && audioContext) masterGain.gain.setValueAtTime(0, audioContext.currentTime);
  updateAudioUi("STANDBY");
}

function toggleAudioMute() {
  if (!masterGain || !audioContext) return;
  audioMuted = !audioMuted;
  const silent = audioMuted || warpLoadActive || paused;
  masterGain.gain.setTargetAtTime(silent ? 0 : 0.72, audioContext.currentTime, 0.01);
  updateAudioUi(warpLoadActive ? "WARP SILENT" : (audioMuted ? "MUTED" : "SID ACTIVE"));
}

function updateJoystickUi() {
  if (joystickPortIndicator) joystickPortIndicator.textContent = `PORT ${joystickPort}`;
  if (joystickSwapButton) {
    joystickSwapButton.setAttribute("aria-label", `Swap joystick to C64 port ${joystickPort === 2 ? 1 : 2}`);
    joystickSwapButton.title = `Currently using C64 joystick port ${joystickPort}. Click to switch to port ${joystickPort === 2 ? 1 : 2}.`;
  }
  if (keyboardJoystickButton) {
    keyboardJoystickButton.textContent = `KEYBOARD JOY: ${keyboardJoystickEnabled ? "ON" : "OFF"}`;
    keyboardJoystickButton.setAttribute("aria-pressed", keyboardJoystickEnabled ? "true" : "false");
  }
}

function keyboardJoystickByte() {
  if (!keyboardJoystickEnabled) return 0xFF;
  let result = 0xFF;
  for (const code of keyboardJoystickKeys) result &= ~KEYBOARD_JOYSTICK_MASKS[code];
  return result;
}

function applyJoystickInput() {
  if (!machine) return;
  // A browser gamepad can keep a direction/fire held down continuously.
  // Give physical C64 keys priority while held and briefly after the last
  // keypress, preventing those joystick bits from masking the keyboard CIA.
  const typing = keyboardJoystickKeys.size > 0 || heldMatrixKeys.size > 0 ||
    shiftLeftPhysical || shiftRightPhysical || performance.now() < keyboardPriorityUntil;
  const byte = typing ? keyboardJoystickByte() : (gamepadJoyByte & touchJoyByte);
  machine.joyPort1 = joystickPort === 1 ? byte : 0xFF;
  machine.joyPort2 = joystickPort === 2 ? byte : 0xFF;
  // Joystick-1 FIRE shares VIC-II lightpen wiring: update its pin immediately.
  machine._updateLightpen?.();
}

function swapJoystickPort() {
  joystickPort = joystickPort === 2 ? 1 : 2;
  localStorage.setItem("ccg.emulator.c64.joystickPort", String(joystickPort));
  applyJoystickInput();
  updateJoystickUi();
  if (inputStatus) inputStatus.textContent = `JOYSTICK PORT ${joystickPort} SELECTED`;
  screen?.focus();
}

joystickSwapButton?.addEventListener("click", swapJoystickPort);
keyboardJoystickButton?.addEventListener("click", () => {
  keyboardJoystickEnabled = !keyboardJoystickEnabled;
  keyboardJoystickKeys.clear();
  keyboardPriorityUntil = 0;
  localStorage.setItem("ccg.emulator.c64.keyboardJoystick", keyboardJoystickEnabled ? "1" : "0");
  applyJoystickInput();
  updateJoystickUi();
  if (inputStatus) inputStatus.textContent = keyboardJoystickEnabled
    ? "KEYBOARD JOYSTICK // ARROWS OR WASD + SPACE"
    : "KEYBOARD KEYS // C64 ACTIVE";
  screen?.focus();
});
updateJoystickUi();

function updateDriveModeUi(snapshot = vault.snapshot()) {
  const driveAvailable = Boolean(snapshot.driveReady);
  if (driveModeButton) {
    driveModeButton.disabled = !running || !driveAvailable;
    driveModeButton.textContent = driveMode === "true" ? "TRUE 1541" : "FAST LOAD";
    driveModeButton.setAttribute("aria-pressed", driveMode === "true" ? "true" : "false");
  }
}

function updateMediaControls(snapshot = vault.snapshot()) {
  const active = Boolean(running && machine);
  // File selection stays available before boot. If system ROMs are not cached,
  // the selected media is held in memory and resumed after the one-time setup.
  if (loadTapeButton) loadTapeButton.disabled = false;
  if (loadCartridgeButton) loadCartridgeButton.disabled = false;
  if (ejectCartridgeButton) ejectCartridgeButton.disabled = !active || !mountedCartridge;
  if (tapePlayButton) tapePlayButton.disabled = !active || mountedTape?.kind !== "tap";
  if (tapeStopButton) tapeStopButton.disabled = !active || mountedTape?.kind !== "tap";
  if (tapeRewindButton) tapeRewindButton.disabled = !active || mountedTape?.kind !== "tap";
  if (vaultSaveButton) vaultSaveButton.disabled = !active;
  if (vaultLoadButton) vaultLoadButton.disabled = !active;
  if (vaultClearButton) vaultClearButton.disabled = false;
  if (swapDiskButton) swapDiskButton.disabled = !active || !mountedDisk;
  if (onlineLibraryDiskSwapButton) onlineLibraryDiskSwapButton.disabled =
    !active || !mountedDisk || !activeLibraryEntryId;
  updateDriveModeUi(snapshot);
  updateOnlineDiskUi();
}

function cloneMedia(media) {
  if (!media) return null;
  return {
    ...media,
    bytes: media.bytes ? media.bytes.slice() : null,
  };
}

function createDiskFromMedia(media) {
  if (!media?.bytes) return null;
  return media.kind === "g64" ? new G64(media.bytes.slice()) : new D64(media.bytes.slice());
}

function captureMutableMedia() {
  if (!machine) return;
  machine.commitDriveWrites();
  if (mountedDisk && machine.currentD64?.img) {
    mountedDisk = { ...mountedDisk, bytes: machine.currentD64.img.slice() };
    if (mountedDiskKey) diskSideCache.set(mountedDiskKey, cloneMedia(mountedDisk));
  }
  if (mountedTape?.kind === "tap" && machine.datasette?.hasMedia) {
    mountedTape = { ...mountedTape, bytes: machine.exportTapBytes() };
  }
}

function currentVaultSlot() {
  const slot = Number(vaultSlot?.value || 1);
  return [1, 2, 3].includes(slot) ? slot : 1;
}

async function refreshVaultStatus() {
  if (!vaultStatus) return;
  try {
    const record = await gameVault.load(currentVaultSlot());
    vaultStatus.textContent = record
      ? `Slot ${record.slot} saved ${new Date(record.savedAt).toLocaleString()}`
      : `Slot ${currentVaultSlot()} empty`;
  } catch (error) {
    vaultStatus.textContent = error?.message || "Game Vault unavailable";
  }
}

function attachSessionMedia(target) {
  if (mountedCartridge?.bytes) target.loadCartridge(mountedCartridge.bytes.slice());
  if (mountedDisk?.bytes) target.setD64(createDiskFromMedia(mountedDisk));
  if (mountedTape?.kind === "tap" && mountedTape.bytes) target.loadTap(mountedTape.bytes.slice());

  const trueDrivePossible = driveMode === "true" &&
    Boolean(vault.getBytes("drive1541")) &&
    Boolean(mountedDisk && (mountedDisk.kind === "d64" || mountedDisk.kind === "g64"));
  target.setTrueDrive(trueDrivePossible);
}

const heldMatrixKeys = new Map();
let shiftLeftPhysical = false;
let shiftRightPhysical = false;
let gamepadConnected = false;

function setC64Shift(left, right) {
  if (!machine) return;
  machine.cia1.setKey(1, 7, Boolean(left));
  machine.cia1.setKey(6, 4, Boolean(right));
}

function releaseAllInput() {
  if (machine) {
    for (const held of heldMatrixKeys.values()) {
      machine.cia1.setKey(held.col, held.row, false);
    }
    setC64Shift(false, false);
    machine.cia1.setKey(7, 2, false);
    machine.joyPort1 = 0xFF;
    gamepadJoyByte = 0xFF;
    touchJoyByte = 0xFF;
    touchHeldMask = 0;
    machine.joyPort2 = 0xFF;
    machine.setRestoreNmiLine(false);
  }
  heldMatrixKeys.clear();
  keyboardJoystickKeys.clear();
  keyboardPriorityUntil = 0;
  shiftLeftPhysical = false;
  shiftRightPhysical = false;
}

function physicalMatrixBinding(event) {
  const physical = KEY_MAP[event.code] || KEY_MAP[event.key];
  if (!physical) return null;
  return { col: physical[0], row: physical[1] };
}

function pressMatrixBinding(heldKey, binding) {
  if (!machine || !binding) return;
  machine.cia1.setKey(binding.col, binding.row, true);
  heldMatrixKeys.set(heldKey, binding);
  if (inputStatus) inputStatus.textContent = `KEY ${heldKey.replace(/^(?:Key|Digit)/, "")} // C64 ACTIVE`;
}

function pressShiftedMatrixBinding(heldKey, col, row) {
  if (!machine) return;
  const lShiftDown = machine.cia1.isKeyDown(1, 7);
  const rShiftDown = machine.cia1.isKeyDown(6, 4);
  let pressedLeftShift = false;
  if (!lShiftDown && !rShiftDown) {
    machine.cia1.setKey(1, 7, true);
    pressedLeftShift = true;
  }
  pressMatrixBinding(heldKey, { col, row, pressedLeftShift, symbolMapped: true });
}

function pressCharacterBinding(event, heldKey) {
  if (!machine || !event.key || event.key.length !== 1) return false;
  const charBinding = CHAR_MAP[event.key];
  if (!charBinding) return false;

  const lShiftDown = machine.cia1.isKeyDown(1, 7);
  const rShiftDown = machine.cia1.isKeyDown(6, 4);
  const shiftDown = lShiftDown || rShiftDown;
  let pressedLeftShift = false;
  let releasedLeftShift = false;
  let releasedRightShift = false;

  // VICE-style symbolic mapping: the character typed on the host determines
  // the C64 key. Host Shift is temporarily overridden to the state the C64
  // symbol actually requires. On UK keyboards this is what makes Shift+8
  // produce the C64 asterisk instead of Shift+the C64 8 key.
  if (charBinding.shift && !shiftDown) {
    machine.cia1.setKey(1, 7, true);
    pressedLeftShift = true;
  } else if (!charBinding.shift && shiftDown) {
    if (lShiftDown) {
      machine.cia1.setKey(1, 7, false);
      releasedLeftShift = true;
    }
    if (rShiftDown) {
      machine.cia1.setKey(6, 4, false);
      releasedRightShift = true;
    }
  }

  pressMatrixBinding(heldKey, {
    col: charBinding.col,
    row: charBinding.row,
    symbolMapped: true,
    pressedLeftShift,
    releasedLeftShift,
    releasedRightShift,
  });
  return true;
}

function releaseHeldMatrixBinding(event, heldKey) {
  if (!machine) return false;
  const binding = heldMatrixKeys.get(heldKey);
  if (!binding) return false;

  heldMatrixKeys.delete(heldKey);
  machine.cia1.setKey(binding.col, binding.row, false);
  if (inputStatus && !heldMatrixKeys.size) inputStatus.textContent = "KEYBOARD READY";

  if (binding.symbolMapped) {
    if (binding.pressedLeftShift && !event.shiftKey) {
      machine.cia1.setKey(1, 7, false);
    }
    if (binding.releasedLeftShift && event.shiftKey) {
      machine.cia1.setKey(1, 7, true);
    }
    if (binding.releasedRightShift && event.shiftKey) {
      machine.cia1.setKey(6, 4, true);
    }
  }
  return true;
}

function usesNativeKeyboard(target) {
  return Boolean(target?.closest?.(
    'input, textarea, select, button, a, summary, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="button"]'
  ));
}

function usesTextInput(target) {
  const field = target?.closest?.(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]'
  );
  // Hidden file pickers can retain browser focus after LOAD & AUTO START.
  // They are not editable fields and must never disable game keystrokes.
  if (field?.tagName === "INPUT" && ["file", "hidden"].includes(field.type)) return false;
  return Boolean(field);
}

function handleC64Key(event, pressed) {
  if (!running || !machine) return;

  // A clicked toolbar button retains browser focus. That must NOT prevent game
  // commands such as S to start, Q to quit, or F-keys from reaching the C64.
  // Text fields and dropdowns keep their native keyboard, as do ENTER/SPACE
  // for activating a focused button or link. The ROM setup remains modal.
  const nativeActivation = ["Enter", "NumpadEnter", "Space"].includes(event.code) &&
    (usesNativeKeyboard(event.target) || usesNativeKeyboard(document.activeElement));
  if (pressed && (setup?.hidden === false ||
    usesTextInput(event.target) || usesTextInput(document.activeElement) ||
    nativeActivation)) return;

  // Leave operating-system/browser shortcuts alone (AltGr remains available).
  if (event.metaKey || (event.altKey && !event.getModifierState?.("AltGraph"))) return;

  // Physical keyboard always wins over the gamepad, including when a gamepad
  // button remains pressed. The optional keyboard joystick converts arrow,
  // WASD and fire presses to the currently selected joystick port, but does
  // not suppress normal C64 keys (including S for game-start menus).
  if (KEY_MAP[event.code] || CHAR_MAP[event.key] ||
      ["ArrowLeft", "ArrowUp", "F2", "F4", "F6", "F8", "F12"].includes(event.code)) {
    keyboardPriorityUntil = performance.now() + 1200;
    const joystickMask = KEYBOARD_JOYSTICK_MASKS[event.code];
    if (joystickMask && keyboardJoystickEnabled) {
      if (pressed) keyboardJoystickKeys.add(event.code);
      else keyboardJoystickKeys.delete(event.code);
    }
    applyJoystickInput();
  }

  if (event.code === "F12") {
    event.preventDefault();
    machine.setRestoreNmiLine(pressed);
    return;
  }

  if (event.code === "ShiftLeft") {
    event.preventDefault();
    shiftLeftPhysical = pressed;
    machine.cia1.setKey(1, 7, pressed);
    return;
  }

  if (event.code === "ShiftRight") {
    event.preventDefault();
    shiftRightPhysical = pressed;
    machine.cia1.setKey(6, 4, pressed);
    return;
  }

  // Windows AltGr is emitted as Ctrl+Alt. Once AltGraph is active, the symbol
  // itself must reach CHAR_MAP without a phantom C64 CTRL modifier.
  if (event.getModifierState?.("AltGraph")) {
    machine.cia1.setKey(7, 2, false);
    if (["ControlLeft", "ControlRight", "AltLeft", "AltRight"].includes(event.code)) return;
  }

  const heldKey = event.code || `key:${event.key}`;

  if (pressed) {
    if (event.repeat || heldMatrixKeys.has(heldKey)) {
      if (heldMatrixKeys.has(heldKey)) event.preventDefault();
      return;
    }

    // C64 cursor left/up are SHIFT + cursor right/down.
    if (event.code === "ArrowLeft") {
      event.preventDefault();
      pressShiftedMatrixBinding(heldKey, 0, 2);
      return;
    }
    if (event.code === "ArrowUp") {
      event.preventDefault();
      pressShiftedMatrixBinding(heldKey, 0, 7);
      return;
    }

    // C64 F2/F4/F6/F8 are SHIFT + F1/F3/F5/F7.
    const shiftedFn = { F2: "F1", F4: "F3", F6: "F5", F8: "F7" };
    if (shiftedFn[event.code]) {
      const pos = KEY_MAP[shiftedFn[event.code]];
      if (pos) {
        event.preventDefault();
        pressShiftedMatrixBinding(heldKey, pos[0], pos[1]);
      }
      return;
    }

    if (pressCharacterBinding(event, heldKey)) {
      event.preventDefault();
      return;
    }

    const binding = physicalMatrixBinding(event);
    if (!binding) return;
    event.preventDefault();
    pressMatrixBinding(heldKey, binding);
    return;
  }

  if (releaseHeldMatrixBinding(event, heldKey)) {
    event.preventDefault();
  }
}

function pollGamepad() {
  if (!machine || !running) return;
  const pads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
  const pad = Array.from(pads || []).find((entry) => entry && entry.connected);

  if (!pad) {
    gamepadJoyByte = 0xFF;
    applyJoystickInput();
    if (gamepadConnected) {
      gamepadConnected = false;
      if (inputStatus && touchHeldMask === 0) inputStatus.textContent = "KEYBOARD READY";
    }
    return;
  }

  const axisX = Number(pad.axes?.[0] || 0);
  const axisY = Number(pad.axes?.[1] || 0);
  const pressed = (index) => Boolean(pad.buttons?.[index]?.pressed);

  let byte = 0xFF;
  if (axisY < -0.35 || pressed(12)) byte &= ~0x01;
  if (axisY > 0.35 || pressed(13)) byte &= ~0x02;
  if (axisX < -0.35 || pressed(14)) byte &= ~0x04;
  if (axisX > 0.35 || pressed(15)) byte &= ~0x08;
  if (pressed(0) || pressed(1)) byte &= ~0x10;
  gamepadJoyByte = byte;
  applyJoystickInput();

  if (!gamepadConnected) {
    gamepadConnected = true;
    if (inputStatus) inputStatus.textContent = `GAMEPAD // PORT ${joystickPort}`;
  }
}

function drawStatus(snapshot, message = null) {
  if (!screen || !statusCtx) return;
  const ctx = statusCtx;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#101a5b";
  ctx.fillRect(0, 0, screen.width, screen.height);
  ctx.fillStyle = "#7184ff";
  ctx.fillRect(22, 20, screen.width - 44, screen.height - 40);
  ctx.fillStyle = "#101a5b";
  ctx.font = "18px monospace";
  ctx.fillText("CCG OMEGA C64", 52, 58);
  ctx.font = "12px monospace";

  const lines = message
    ? [message]
    : snapshot.allRequiredReady
      ? [
          "ROM BANK VERIFIED.",
          "",
          "PRESS BOOT C64 TO START.",
          "",
          "ROM DATA REMAINS LOCAL."
        ]
      : [
          "READY FOR C64 MEDIA",
          "",
          "LOAD A D64 / TAP / PRG / CRT",
          "",
          `SYSTEM ROMS STORED: ${snapshot.requiredReady}/3`
        ];

  lines.forEach((line, index) => ctx.fillText(line, 52, 92 + index * 20));

  if (presenter) presenter.presentCanvas(statusCanvas);
  else screenCtx?.drawImage(statusCanvas, 0, 0);
}

function setControlState(snapshot) {
  const canBoot = snapshot.allRequiredReady && typeof SharedArrayBuffer !== "undefined";
  if (powerButton) powerButton.disabled = !canBoot;
  if (resetButton) resetButton.disabled = !running;
  if (pauseButton) pauseButton.disabled = !running;
  if (warpLoadButton) {
    warpLoadButton.disabled = !running || paused;
    warpLoadButton.setAttribute("aria-pressed", warpLoadActive ? "true" : "false");
    const strong = warpLoadButton.querySelector("strong");
    if (strong) strong.textContent = warpLoadActive ? "ON · MAX" : "MAX";
  }
  if (loadMediaButton) loadMediaButton.disabled = false;
  if (loadDiskButton) loadDiskButton.disabled = false;
  updateMediaControls(snapshot);
  updateAudioUi();

  if (powerButton) {
    powerButton.querySelector("strong").textContent = running ? "POWER OFF" : "BOOT C64";
  }
  if (pauseButton) {
    pauseButton.querySelector("strong").textContent = paused ? "RESUME" : "PAUSE";
  }
}

function render(snapshot) {
  document.querySelectorAll("[data-rom-count]").forEach((node) => {
    node.textContent = String(snapshot.requiredReady);
  });

  const drive = document.querySelector("[data-drive-status]");
  if (drive) drive.textContent = snapshot.driveReady ? "READY" : "OPTIONAL";

  for (const key of Object.keys(ROM_SPEC)) {
    const ready = Boolean(snapshot.entries[key]);
    const state = document.querySelector(`[data-rom-state="${key}"]`);
    const card = document.querySelector(`[data-rom-card="${key}"]`);
    if (state) state.textContent = ready ? "READY" : (ROM_SPEC[key].required ? "WAITING" : "OPTIONAL");
    card?.classList.toggle("is-ready", ready);
  }

  if (romSummary) {
    const missing = REQUIRED_ROM_KEYS.filter((key) => !snapshot.entries[key]).map((key) => ROM_SPEC[key].label);
    romSummary.textContent = missing.length
      ? `Still needed: ${missing.join(", ")}.`
      : "Required ROM bank verified. You can enter the command deck.";
  }

  if (finishSetup) finishSetup.disabled = !snapshot.allRequiredReady;

  if (!running && machineState) {
    if (snapshot.allRequiredReady && typeof SharedArrayBuffer === "undefined") {
      machineState.textContent = "ROM BANK READY // SECURE CORE HEADERS REQUIRED";
    } else {
      machineState.textContent = snapshot.allRequiredReady
        ? "SYSTEM ROMS READY // LOAD MEDIA OR BOOT"
        : "READY FOR MEDIA // SYSTEM ROMS NEEDED ON FIRST RUN";
    }
  }

  setControlState(snapshot);
  if (!running) drawStatus(snapshot);
}

function showSetup() {
  if (!setup) return;
  setup.hidden = false;
  document.body.classList.add("is-rom-setup-open");
}

function hideSetup() {
  if (!setup) return;
  setup.hidden = true;
  document.body.classList.remove("is-rom-setup-open");
}

function stopFrameLoop() {
  if (frameHandle) cancelAnimationFrame(frameHandle);
  frameHandle = 0;
  lastFrameTime = 0;
  frameAccumulator = 0;
  speedSampleTime = 0;
  speedSampleFrames = 0;
}

function blitMachine() {
  if (!machine || !screen) return;
  if (presenter) {
    presenter.present(machine.vic2.presentationBuffer());
    return;
  }
  if (!screenCtx) return;
  if (!frameImage || frameImage.data.buffer !== machine.vic2.frameBuffer.buffer) {
    frameImage = new ImageData(machine.vic2.frameBuffer, screen.width, screen.height);
  }
  screenCtx.putImageData(frameImage, 0, 0);
}

function basicReady() {
  const ram = machine?.mem?.ram;
  return Boolean(ram && ram[0x00C6] === 0 && ram[0x00CC] === 0 && ram[0x002C] === 0x08);
}

function cancelAutoStart() {
  autoStartSteps = null;
  autoStartTypeRest = "";
  autoStartSawBusy = false;
  autoStartBudget = 0;
}

function queueAutoStart(steps) {
  autoStartSteps = steps.slice();
  autoStartTypeRest = "";
  autoStartSawBusy = false;
  autoStartBudget = 10 * 60 * 60;
}

function serviceAutoStart() {
  if (!autoStartSteps || !machine || !running || paused) return;
  if (autoStartBudget-- <= 0) {
    cancelAutoStart();
    if (stageNote) stageNote.textContent = "Automatic start timed out. The game remains mounted for manual loading.";
    return;
  }

  const step = autoStartSteps[0];
  if (!step) {
    cancelAutoStart();
    return;
  }

  if (step.ready) {
    if (basicReady()) autoStartSteps.shift();
  } else if (step.type !== undefined) {
    if (autoStartTypeRest === "") autoStartTypeRest = step.type;
    autoStartTypeRest = autoStartTypeRest.slice(machine.bufferKeyboardText(autoStartTypeRest));
    if (autoStartTypeRest === "") autoStartSteps.shift();
  } else if (step.loadDone) {
    if (!basicReady()) autoStartSawBusy = true;
    if (autoStartSawBusy && basicReady()) {
      autoStartSawBusy = false;
      autoStartSteps.shift();
    }
  } else if (step.run) {
    try { step.run(); } catch (error) {
      cancelAutoStart();
      if (stageNote) stageNote.textContent = error?.message || "Automatic game start failed.";
      return;
    }
    autoStartSteps.shift();
  } else {
    autoStartSteps.shift();
  }

  if (autoStartSteps && autoStartSteps.length === 0) cancelAutoStart();
}

async function prepareFreshGameSession() {
  if (!machine || !running) return;
  cancelAutoStart();
  releaseAllInput();

  mountedDisk = null;
  mountedDiskKey = null;
  diskSideCache.clear();
  mountedTape = null;
  mountedCartridge = null;
  driveMode = "fast";
  localStorage.setItem("ccg.emulator.c64.driveMode", driveMode);

  const fresh = new C64Machine();
  fresh.loadROMs({
    kernal: vault.getBytes("kernal"),
    basic: vault.getBytes("basic"),
    charRom: vault.getBytes("charRom"),
  });
  const driveRom = vault.getBytes("drive1541");
  if (driveRom) fresh.attachDrive(driveRom);
  fresh.setTrueDrive(false);

  machine = fresh;
  applyJoystickInput();
  paused = false;
  warpLoadActive = false;
  frameImage = null;
  frameAccumulator = 0;
  lastFrameTime = 0;
  await wireAudioToMachine();
  setAudioPaused(false);
  setControlState(vault.snapshot());
}

function frameLoop(now) {
  if (!running || !machine) return;
  pollGamepad();
  if (!lastFrameTime) lastFrameTime = now;
  // Account for legitimate 100–250ms browser/renderer stalls, rather than
  // dropping elapsed PAL time and making ordinary gameplay run slow.
  const delta = Math.min(250, Math.max(0, now - lastFrameTime));
  lastFrameTime = now;

  if (!paused) {
    let frames = 0;
    if (warpLoadActive) {
      // Run at the fastest browser-safe rate this device can sustain. Do not
      // throttle to a fixed PAL multiplier, or build up a huge frame backlog.
      const start = performance.now();
      do {
        machine.runFrame();
        frames++;
        if (autoStartSteps && (frames & 3) === 0) serviceAutoStart();
      } while (frames < WARP_MAX_FRAMES_PER_TICK &&
        performance.now() - start < WARP_FRAME_BUDGET_MS);
      if (autoStartSteps) serviceAutoStart();
      frameAccumulator = 0;
    } else {
      frameAccumulator += delta;
      while (frameAccumulator >= PAL_FRAME_MS) {
        machine.runFrame();
        frameAccumulator -= PAL_FRAME_MS;
        frames++;
      }
      if (frames) serviceAutoStart();
    }
    if (frames) blitMachine();
    if (!speedSampleTime) speedSampleTime = now;
    speedSampleFrames += frames;
    if (now - speedSampleTime >= 1000) {
      if (emulatorSpeedStatus) {
        const speed = Math.round(100 * (speedSampleFrames * PAL_FRAME_MS) /
          Math.max(1, now - speedSampleTime));
        emulatorSpeedStatus.textContent = warpLoadActive
          ? `WARP // ${speed}% PAL`
          : `PAL SPEED // ${speed}%`;
        emulatorSpeedStatus.title = speed < 95 && !warpLoadActive
          ? "This device or tab is not sustaining real-time PAL emulation; try closing other tabs or using plain CRT mode."
          : "Measured emulated frame time relative to real time (100% = PAL speed).";
      }
      speedSampleTime = now;
      speedSampleFrames = 0;
    }
  } else {
    speedSampleTime = 0;
    speedSampleFrames = 0;
  }

  frameHandle = requestAnimationFrame(frameLoop);
}

function powerOff() {
  captureMutableMedia();
  releaseAllInput();
  powerOffAudio();
  running = false;
  paused = false;
  warpLoadActive = false;
  cancelAutoStart();
  stopFrameLoop();
  machine = null;
  frameImage = null;
  if (machineState) machineState.textContent = "POWERED OFF // ROM BANK RETAINED";
  if (stageNote) stageNote.textContent = "Machine powered off. Your validated ROMs remain stored locally in this browser.";
  render(vault.snapshot());
}

async function powerOn() {
  const snapshot = vault.snapshot();
  if (!snapshot.allRequiredReady) {
    showSetup();
    return;
  }
  if (running) {
    powerOff();
    return;
  }

  try {
    machine = new C64Machine();
    machine.loadROMs({
      kernal: vault.getBytes("kernal"),
      basic: vault.getBytes("basic"),
      charRom: vault.getBytes("charRom"),
    });

    const driveRom = vault.getBytes("drive1541");
    if (driveRom) machine.attachDrive(driveRom);
    attachSessionMedia(machine);

    const audioReady = await wireAudioToMachine();
    running = true;
    paused = false;
    warpLoadActive = false;
    applyJoystickInput();
    frameImage = null;
    frameAccumulator = 0;
    lastFrameTime = 0;
    if (machineState) machineState.textContent = "C64 CORE RUNNING // VIDEO + INPUT ACTIVE";
    if (inputStatus) inputStatus.textContent = "KEYBOARD READY";
    if (stageNote) stageNote.textContent = audioReady ? "Machine, video, keyboard/gamepad, touch controls, SID audio, disk, tape, cartridge and Game Vault paths are active." : "Machine, video and input are active. SID audio could not start in this browser session; media and save-state systems remain available.";
    setControlState(snapshot);
    frameHandle = requestAnimationFrame(frameLoop);
    screen?.focus();
  } catch (error) {
    machine = null;
    running = false;
    if (machineState) machineState.textContent = "BOOT BLOCKED";
    drawStatus(snapshot, error?.message || "CORE START FAILED");
    if (stageNote) stageNote.textContent = "Boot could not start. On the deployed route, the emulator requires the scoped secure COOP/COEP headers already added to this branch.";
    setControlState(snapshot);
  }
}

function resetMachine() {
  if (!machine || !running) return;
  cancelAutoStart();
  machine.reset();
  resetAudioForMachine();
  paused = false;
  warpLoadActive = false;
  frameAccumulator = 0;
  lastFrameTime = 0;
  setAudioPaused(false);
  if (machineState) machineState.textContent = "C64 RESET // RUNNING";
  if (stageNote) stageNote.textContent = "C64 reset. Warp Load returned to normal 1× speed.";
  applyJoystickInput();
  setControlState(vault.snapshot());
}

function setWarpLoad(value) {
  if (!machine || !running) return;
  warpLoadActive = Boolean(value);

  // Warp is intentionally silent. The SID worklet keeps consuming its event
  // ring while the machine advances faster than real time; when warp ends,
  // resync before restoring audible output.
  setAudioPaused(warpLoadActive || paused);
  frameAccumulator = 0;
  lastFrameTime = 0;

  if (machineState) {
    machineState.textContent = warpLoadActive
      ? "WARP LOAD ACTIVE // MAX SPEED"
      : "C64 CORE RUNNING // VIDEO ACTIVE";
  }
  if (stageNote) {
    stageNote.textContent = warpLoadActive
      ? "Warp Load now runs as fast as this device can sustain. SID is muted during warp; switch it off after loading."
      : "Warp Load disabled. Normal 1× timing and SID audio restored.";
  }
  updateAudioUi(warpLoadActive ? "WARP SILENT" : (audioMuted ? "MUTED" : "SID ACTIVE"));
  setControlState(vault.snapshot());
}

function toggleWarpLoad() {
  if (!machine || !running || paused) return;
  setWarpLoad(!warpLoadActive);
}

function togglePause() {
  if (!machine || !running) return;
  paused = !paused;
  if (paused && warpLoadActive) warpLoadActive = false;
  setAudioPaused(paused);
  frameAccumulator = 0;
  lastFrameTime = 0;
  if (machineState) machineState.textContent = paused ? "C64 PAUSED" : "C64 CORE RUNNING // VIDEO ACTIVE";
  if (stageNote) stageNote.textContent = paused
    ? "C64 paused. Warp Load has been cancelled."
    : "C64 resumed at normal 1× speed.";
  updateAudioUi(paused ? "PAUSED" : (audioMuted ? "MUTED" : "SID ACTIVE"));
  setControlState(vault.snapshot());
}

for (const button of document.querySelectorAll("[data-open-setup]")) {
  button.addEventListener("click", showSetup);
}

document.querySelector("[data-clear-roms]")?.addEventListener("click", () => {
  if (!window.confirm("Clear the locally stored C64 ROMs from this browser?")) return;
  if (running) powerOff();
  render(vault.clear());
  showSetup();
});

for (const input of document.querySelectorAll("[data-rom-input]")) {
  input.addEventListener("change", async () => {
    const key = input.getAttribute("data-rom-input");
    const file = input.files?.[0];
    input.value = "";
    if (!key || !file) return;

    try {
      await vault.installFile(key, file);
      render(vault.snapshot());
    } catch (error) {
      window.alert(error.message || "That ROM could not be accepted.");
    }
  });
}

if (romSetInput) {
  romSetInput.addEventListener("change", async () => {
    const files = [...(romSetInput.files || [])];
    romSetInput.value = "";
    if (!files.length) return;

    const found = pickRomFiles(files);
    const loaded = [];
    const unresolved = [];

    for (const [key, file] of Object.entries(found)) {
      try {
        await vault.installFile(key, file);
        loaded.push(ROM_SPEC[key].label);
      } catch {}
    }

    for (const key of REQUIRED_ROM_KEYS) {
      if (!vault.snapshot().entries[key]) unresolved.push(ROM_SPEC[key].label);
    }

    const snapshot = vault.snapshot();
    render(snapshot);
    if (romSetMessage) {
      romSetMessage.textContent = loaded.length
        ? `Accepted: ${loaded.join(", ")}.${unresolved.length ? ` Still needed: ${unresolved.join(", ")}.` : " System ROMs ready."}`
        : "No recognised C64 ROM filenames were found. Use the individual slots below for unusually named files.";
    }
  });
}

closeSetupButton?.addEventListener("click", hideSetup);

finishSetup?.addEventListener("click", async () => {
  if (!vault.snapshot().allRequiredReady) return;
  hideSetup();

  if (pendingMedia) {
    const media = pendingMedia;
    if (!running) await powerOn();
    if (running && machine) {
      pendingMedia = null;
      try {
        await openMediaBytes(media);
      } catch (error) {
        if (stageNote) stageNote.textContent = error?.message || "The queued media could not be opened.";
      }
    }
  }

  screen?.focus();
});

document.querySelector("[data-emulator-back]")?.addEventListener("click", () => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = "/emulation.html";
});

powerButton?.addEventListener("click", () => { void powerOn(); });
resetButton?.addEventListener("click", () => { resetMachine(); screen?.focus(); });
pauseButton?.addEventListener("click", () => { togglePause(); screen?.focus(); });
warpLoadButton?.addEventListener("click", () => { toggleWarpLoad(); screen?.focus(); });
audioButton?.addEventListener("click", () => { toggleAudioMute(); screen?.focus(); });
crtButton?.addEventListener("click", () => { cycleCrtMode(); screen?.focus(); });
sizeButton?.addEventListener("click", () => { toggleScreenSize(); screen?.focus(); });
screen?.addEventListener("pointerdown", () => screen.focus());

const SUPPORTED_MEDIA_TYPES = new Set(["prg", "d64", "d71", "d81", "g64", "tap", "t64", "crt"]);

function mediaTypeFromName(name) {
  const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match && SUPPORTED_MEDIA_TYPES.has(match[1]) ? match[1] : null;
}

function decodeLibraryBase64(value) {
  const binary = atob(String(value || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Change the physical disk in drive 8 without touching the C64 CPU, RAM,
// current game, execution state or BASIC auto-start queue.
function swapMountedDisk(media, key = null) {
  if (!running || !machine || !mountedDisk) {
    throw new Error("Start a disk game before using SWAP DISK.");
  }
  const name = media?.name || "";
  const type = String(media?.type || mediaTypeFromName(name) || "").toLowerCase();
  if (!["d64", "d71", "d81", "g64"].includes(type)) {
    throw new Error("Only disk images (D64, D71, D81 or G64) can be swapped.");
  }
  const bytes = media.bytes instanceof Uint8Array ? media.bytes : new Uint8Array(media.bytes || []);
  const g64 = type === "g64" || isG64(bytes);
  const variant = g64 ? null : d64Variant(bytes.length);
  if ((!g64 && (!variant || variant.kind !== type)) ||
      (g64 && !vault.getBytes("drive1541"))) {
    throw new Error(g64
      ? "G64 disk swapping needs the optional 1541 DOS ROM."
      : "The replacement disk image is invalid for its file format.");
  }

  const kind = g64 ? "g64" : variant.kind;
  const targetKey = key || `local:${name}`;
  // Retain any writes made to the outgoing disk, including True 1541 writes.
  captureMutableMedia();
  const source = diskSideCache.get(targetKey) || { name, kind, bytes };
  const nextDisk = { name: source.name || name, kind, bytes: source.bytes.slice() };
  const disk = createDiskFromMedia(nextDisk);
  if (!disk) throw new Error("The replacement disk cannot be opened.");

  cancelAutoStart();
  machine.setD64(disk);
  machine.setTrueDrive(driveMode === "true" &&
    ["d64", "g64"].includes(kind) && Boolean(vault.getBytes("drive1541")));
  mountedDisk = nextDisk;
  mountedDiskKey = targetKey;
  diskSideCache.set(targetKey, cloneMedia(nextDisk));
  if (diskSlotStatus) diskSlotStatus.textContent = `DISK SWAPPED // ${name}`;
  if (machineState) machineState.textContent = `DISK 8 INSERTED // ${name.toUpperCase()}`;
  if (stageNote) stageNote.textContent =
    `${name} inserted into drive 8. Game and memory preserved — return to the game to continue loading.`;
  updateMediaControls(vault.snapshot());
  screen?.focus();
  return true;
}

function onlineDiskSides(entry) {
  if (!entry || !Array.isArray(entry.disks) || entry.disks.length < 2) return [];
  return entry.disks.filter((disk) =>
    disk && typeof disk.filename === "string" &&
    typeof disk.url === "string" &&
    /^\/emulator\/c64\/media\/[a-z0-9._-]+\.(?:d64|d71|d81|g64)$/i.test(disk.url) &&
    ["d64", "d71", "d81", "g64"].includes(String(disk.format).toLowerCase())
  );
}

function updateOnlineDiskUi() {
  if (!onlineLibraryDisks || !onlineLibraryDiskSelect) return;
  const entry = onlineLibraryEntries.find((item) => item.id === activeLibraryEntryId);
  const sides = onlineDiskSides(entry);
  const visible = sides.length > 1 && Boolean(running && mountedDisk);
  onlineLibraryDisks.hidden = !visible;
  onlineLibraryDiskSelect.replaceChildren();
  if (visible) {
    for (let i = 0; i < sides.length; i += 1) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = sides[i].label || `Disk ${i + 1}`;
      onlineLibraryDiskSelect.append(option);
    }
    onlineLibraryDiskSelect.value = String(activeLibraryDiskIndex);
  }
  if (onlineLibraryDiskSwapButton) onlineLibraryDiskSwapButton.disabled = !visible;
}

async function fetchLibraryDisk(disk) {
  if (!disk?.url || !/^\/emulator\/c64\/media\/[a-z0-9._-]+\.(?:d64|d71|d81|g64)$/i.test(disk.url)) {
    throw new Error("This game disk is not an approved local disk image.");
  }
  const response = await fetch(disk.url, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Disk download failed (HTTP ${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

async function swapOnlineLibraryDisk() {
  const entry = onlineLibraryEntries.find((item) => item.id === activeLibraryEntryId);
  const sides = onlineDiskSides(entry);
  const index = Number(onlineLibraryDiskSelect?.value);
  if (!sides.length || !Number.isInteger(index) || !sides[index]) return;
  const disk = sides[index];
  const key = `library:${entry.id}:${index}`;
  if (onlineLibraryDiskSwapButton) onlineLibraryDiskSwapButton.disabled = true;
  try {
    const saved = diskSideCache.get(key);
    const bytes = saved?.bytes || await fetchLibraryDisk(disk);
    swapMountedDisk({ name: disk.filename, type: disk.format, bytes }, key);
    activeLibraryDiskIndex = index;
    updateOnlineDiskUi();
  } catch (error) {
    if (stageNote) stageNote.textContent = error?.message || "The requested disk cannot be inserted.";
  } finally {
    if (onlineLibraryDiskSwapButton) onlineLibraryDiskSwapButton.disabled = false;
  }
}

async function openMediaBytes(media) {
  if (!media || !machine || !running) return false;
  const name = media.name || `media.${media.type || "bin"}`;
  const bytes = media.bytes instanceof Uint8Array ? media.bytes : new Uint8Array(media.bytes || []);
  const type = media.type || mediaTypeFromName(name);
  if (!type || !SUPPORTED_MEDIA_TYPES.has(type)) throw new Error("Unsupported C64 media format.");

  if (type === "prg") {
    if (bytes.length < 3) throw new Error("That PRG is too small to contain a C64 load address.");
    queueAutoStart([
      { ready: true },
      { run: () => {
        machine.loadPRG(bytes);
        machine.injectRun();
        if (machineState) machineState.textContent = `PRG AUTO-START // ${name.toUpperCase()}`;
        if (stageNote) stageNote.textContent = `${name} loaded and RUN was entered automatically.`;
      } },
    ]);
    screen?.focus();
    return true;
  }

  if (["d64", "d71", "d81", "g64"].includes(type)) {
    const g64 = type === "g64" || isG64(bytes);
    const variant = g64 ? null : d64Variant(bytes.length);
    if (!g64 && (!variant || variant.kind !== type)) {
      throw new Error("Use a supported D64, D71, D81 or G64 disk image.");
    }
    if (g64 && !vault.getBytes("drive1541")) {
      throw new Error("G64 raw-track images require the optional 1541 DOS ROM in System ROMs.");
    }

    const kind = g64 ? "g64" : variant.kind;
    const disk = g64 ? new G64(bytes) : new D64(bytes);
    machine.setD64(disk);
    mountedDisk = { name, bytes: bytes.slice(), kind };
    mountedDiskKey = media.sourceKey || `local:${name}`;
    diskSideCache.set(mountedDiskKey, cloneMedia(mountedDisk));

    if (g64) {
      driveMode = "true";
      localStorage.setItem("ccg.emulator.c64.driveMode", driveMode);
    }

    const useTrueDrive = driveMode === "true" &&
      (kind === "d64" || kind === "g64") &&
      Boolean(vault.getBytes("drive1541"));
    machine.setTrueDrive(useTrueDrive);

    queueAutoStart([
      { ready: true },
      { type: 'LOAD"*",8,1\r' },
      { loadDone: true },
      { type: "RUN\r" },
    ]);

    if (diskSlotStatus) {
      const label = disk.diskName ? `${disk.diskName} // ${name}` : name;
      diskSlotStatus.textContent = `${kind.toUpperCase()} // ${label}`;
    }
    if (machineState) machineState.textContent = `${kind.toUpperCase()} AUTO-START // ${name.toUpperCase()}`;
    if (stageNote) {
      stageNote.textContent = useTrueDrive
        ? "Disk mounted in True 1541 mode. The emulator will wait for BASIC READY, type LOAD, wait for loading to finish, then type RUN."
        : "Disk mounted in Fast Load mode. The emulator will automatically LOAD and RUN the first program. If the game asks for Disk 2, choose SWAP DISK; your game will continue.";
    }
    updateMediaControls(vault.snapshot());
    updateOnlineDiskUi();
    screen?.focus();
    return true;
  }

  if (type === "t64") {
    const program = extractFirstT64Program(bytes);
    mountedTape = null;
    queueAutoStart([
      { ready: true },
      { run: () => {
        machine.loadPRG(program.prg);
        machine.injectRun();
        if (machineState) machineState.textContent = `T64 AUTO-START // ${program.name.toUpperCase()}`;
        if (stageNote) stageNote.textContent = "The first runnable T64 program was loaded and RUN was entered automatically.";
      } },
    ]);
    if (tapeSlotStatus) tapeSlotStatus.textContent = `T64 AUTO-START // ${program.name}`;
    updateMediaControls(vault.snapshot());
    screen?.focus();
    return true;
  }

  if (type === "tap") {
    machine.loadTap(bytes);
    mountedTape = { name, bytes: bytes.slice(), kind: "tap" };
    queueAutoStart([
      { ready: true },
      { type: "LOAD\r" },
      { run: () => machine.setTapeKey("PLAY") },
      { loadDone: true },
      { type: "RUN\r" },
    ]);
    if (tapeSlotStatus) tapeSlotStatus.textContent = `TAP AUTO-START // ${name}`;
    if (machineState) machineState.textContent = `TAP AUTO-START // ${name.toUpperCase()}`;
    if (stageNote) stageNote.textContent = "Tape mounted. LOAD and PLAY will be handled automatically; RUN is entered if the tape returns to BASIC.";
    updateMediaControls(vault.snapshot());
    screen?.focus();
    return true;
  }

  if (type === "crt") {
    cancelAutoStart();
    const info = machine.loadCartridge(bytes);
    mountedCartridge = {
      name,
      label: info.name || name,
      bytes: bytes.slice(),
      kind: "crt",
    };
    resetAudioForMachine();
    if (cartridgeSlotStatus) cartridgeSlotStatus.textContent = `${info.mode.toUpperCase()} // ${mountedCartridge.label}`;
    if (machineState) machineState.textContent = `CARTRIDGE AUTO-BOOT // ${mountedCartridge.label.toUpperCase()}`;
    if (stageNote) stageNote.textContent = "CRT cartridge inserted and booted automatically through the cartridge hardware path.";
    updateMediaControls(vault.snapshot());
    screen?.focus();
    return true;
  }

  return false;
}

async function queueMedia(media, { freshBoot = false } = {}) {
  if (!media?.bytes?.length) throw new Error("The selected media file is empty.");
  const type = media.type || mediaTypeFromName(media.name);
  if (!type) throw new Error("Use PRG, D64, D71, D81, G64, TAP, T64 or CRT media.");

  pendingMedia = {
    name: media.name || `media.${type}`,
    type,
    bytes: media.bytes instanceof Uint8Array ? media.bytes.slice() : new Uint8Array(media.bytes),
    sourceKey: media.sourceKey || null,
  };

  if (!vault.snapshot().allRequiredReady) {
    if (stageNote) stageNote.textContent = `${pendingMedia.name} is ready. Add the three C64 system ROMs once, then it will start automatically.`;
    showSetup();
    return false;
  }

  const wasRunning = running;
  if (!running) await powerOn();
  if (!running || !machine) return false;
  if (freshBoot && wasRunning) await prepareFreshGameSession();

  const queued = pendingMedia;
  pendingMedia = null;
  try {
    return await openMediaBytes(queued);
  } catch (error) {
    if (stageNote) stageNote.textContent = error?.message || "The media could not be opened.";
    return false;
  }
}

async function queueMediaFile(file, options = {}) {
  if (!file) return false;
  const type = mediaTypeFromName(file.name);
  activeLibraryEntryId = null;
  activeLibraryDiskIndex = 0;
  updateOnlineDiskUi();
  if (!type) {
    if (stageNote) stageNote.textContent = "Use PRG, D64, D71, D81, G64, TAP, T64 or CRT media.";
    return false;
  }
  return queueMedia({ name: file.name, type, bytes: new Uint8Array(await file.arrayBuffer()) }, options);
}

function refreshOnlineLibraryCards() {
  if (!onlineLibraryGrid || !onlineLibraryLetters) return;
  const filtered = filterCatalog(onlineLibraryEntries, {
    query: onlineLibraryQuery, format: onlineLibraryFormat,
    letter: onlineLibraryLetter, page: onlineLibraryPage,
  });
  onlineLibraryPage = filtered.page;
  onlineLibraryGrid.replaceChildren();
  for (const entry of filtered.games) {
    const card = document.createElement("article");
    card.className = "ccg-c64-game-card";
    const title = document.createElement("strong");
    title.className = "ccg-c64-game-title";
    title.textContent = entry.title;
    const foot = document.createElement("div");
    foot.className = "ccg-c64-game-card-foot";
    const media = document.createElement("span");
    media.className = "ccg-c64-game-type";
    media.textContent = String(entry.format).toUpperCase();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ccg-c64-game-launch";
    button.dataset.playGame = entry.id;
    button.textContent = "PLAY";
    button.disabled = onlineLibraryLoadingGame;
    button.setAttribute("aria-label", "Play " + entry.title);
    foot.append(media, button);
    card.append(title, foot);
    onlineLibraryGrid.append(card);
  }
  if (!filtered.games.length) {
    const none = document.createElement("p");
    none.className = "ccg-c64-library-empty";
    none.textContent = "No games match this search. Try another title or A-Z filter.";
    onlineLibraryGrid.append(none);
  }
  if (onlineLibraryCount) {
    const start = filtered.total ? filtered.page * 36 + 1 : 0;
    const end = Math.min(filtered.total, (filtered.page + 1) * 36);
    onlineLibraryCount.textContent = `${start}-${end} OF ${filtered.total} GAMES`;
  }
  if (onlineLibraryPages) onlineLibraryPages.hidden = filtered.pages <= 1;
  if (onlineLibraryPageText) onlineLibraryPageText.textContent =
    `PAGE ${filtered.page + 1} / ${filtered.pages}`;
  if (onlineLibraryPrevious) onlineLibraryPrevious.disabled = filtered.page <= 0;
  if (onlineLibraryNext) onlineLibraryNext.disabled = filtered.page >= filtered.pages - 1;
  onlineLibraryLetters.querySelectorAll("button[data-library-letter]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.libraryLetter === onlineLibraryLetter ? "true" : "false");
  });
  onlineLibraryFormats?.querySelectorAll("button[data-library-format]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.libraryFormat === onlineLibraryFormat ? "true" : "false");
  });
}

async function initialiseOnlineLibrary() {
  if (!onlineLibraryGrid || !onlineLibraryStatus || !onlineLibraryLetters) return;
  onlineLibraryStatus.textContent = "SCANNING";
  onlineLibraryLetters.replaceChildren();
  for (const letter of ["all", "0-9", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.libraryLetter = letter;
    button.textContent = letter === "all" ? "ALL" : letter;
    button.setAttribute("aria-pressed", letter === "all" ? "true" : "false");
    onlineLibraryLetters.append(button);
  }

  let regular = [];
  try {
    const response = await fetch("/emulator/c64/library.json", {
      cache: "no-store", credentials: "same-origin",
    });
    if (response.ok) {
      const data = await response.json();
      regular = (Array.isArray(data?.entries) ? data.entries : []).filter((entry) =>
        entry && entry.approved === true &&
        typeof entry.id === "string" && typeof entry.title === "string" &&
        typeof entry.license === "string" && entry.license.trim() &&
        SUPPORTED_MEDIA_TYPES.has(String(entry.format || "").toLowerCase()) &&
        ((typeof entry.url === "string" && entry.url.startsWith("/emulator/c64/media/")) ||
          (typeof entry.dataBase64 === "string" && entry.dataBase64.length > 0)));
    }
  } catch (_) { /* Optional direct-file catalogue may be empty. */ }

  let packed = [];
  try {
    const response = await fetch(PACK_CATALOG_URL, {
      cache: "no-store", credentials: "same-origin",
    });
    if (response.ok) {
      const data = parsePackedCatalog(await response.json());
      // Never show launch buttons for a partially uploaded pack collection.
      // A failed HEAD leaves the public catalogue hidden until all packs arrive.
      const available = await Promise.all(data.packs.map(async (pack) => {
        const head = await fetch(PACK_ROOT + pack.file, {
          method: "HEAD", cache: "no-store", credentials: "same-origin",
        });
        if (!head.ok || /text\/html/i.test(head.headers.get("content-type") || "")) return false;
        const reported = Number(head.headers.get("content-length") || 0);
        return !reported || reported === pack.bytes;
      }));
      if (available.every(Boolean)) {
        // CCG-approved direct game uploads win over matching packed titles.
        // This also prevents duplicates if an older pack includes those disks.
        const directGameKeys = new Set(regular.map((entry) =>
          `${entry.title.trim().toLocaleLowerCase()}|${String(entry.format).toLowerCase()}`));
        packed = data.entries.filter((entry) =>
          !directGameKeys.has(`${entry.title.trim().toLocaleLowerCase()}|${entry.format}`));
      }
    }
  } catch (_) { /* Keep the existing C64 upload controls working when packs are absent. */ }

  onlineLibraryEntries = [...regular, ...packed];
  if (onlineLibraryPanel) onlineLibraryPanel.hidden = onlineLibraryEntries.length === 0;
  controlsDeck?.classList.toggle("has-online-library", onlineLibraryEntries.length > 0);
  onlineLibraryStatus.textContent = onlineLibraryEntries.length
    ? `${onlineLibraryEntries.length.toLocaleString("en-GB")} READY` : "EMPTY";
  refreshOnlineLibraryCards();
}

async function loadOnlineLibraryEntry(id) {
  if (onlineLibraryLoadingGame) return;
  const entry = onlineLibraryEntries.find((item) => item.id === id);
  if (!entry) return;
  onlineLibraryLoadingGame = true;
  if (onlineLibraryStatus) onlineLibraryStatus.textContent = "LOADING GAME";
  refreshOnlineLibraryCards();

  try {
    let bytes;
    if (entry.packed) {
      bytes = await loadPackedGameBytes(entry, onlineLibraryPackCache);
    } else if (entry.dataBase64) {
      bytes = decodeLibraryBase64(entry.dataBase64);
    } else {
      const url = new URL(entry.url, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/emulator/c64/media/")) {
        throw new Error("Game media must be hosted on the CCG website.");
      }
      const response = await fetch(url.href, {
        cache: "no-store", credentials: "same-origin",
      });
      if (!response.ok) throw new Error(`Game file is unavailable (HTTP ${response.status}).`);
      bytes = new Uint8Array(await response.arrayBuffer());
    }

    const type = String(entry.format).toLowerCase();
    const filename = entry.filename || `${entry.title.replace(/[^a-z0-9._-]+/gi, "-") || "ccg-game"}.${type}`;
    const firstKey = ["d64", "d71", "d81", "g64"].includes(type)
      ? `library:${entry.id}:0` : null;
    activeLibraryEntryId = entry.id;
    activeLibraryDiskIndex = 0;
    const queued = await queueMedia({
      name: filename, type, bytes, sourceKey: firstKey,
    }, { freshBoot: true });
    if (!queued && !pendingMedia) activeLibraryEntryId = null;
    updateOnlineDiskUi();
    if (onlineLibraryStatus) onlineLibraryStatus.textContent =
      queued ? "GAME STARTED" : pendingMedia ? "ROM SETUP" : "LOAD FAILED";
  } catch (error) {
    if (onlineLibraryStatus) onlineLibraryStatus.textContent = "LOAD FAILED";
    if (stageNote) stageNote.textContent = error?.message || "This game could not be started.";
  } finally {
    onlineLibraryLoadingGame = false;
    refreshOnlineLibraryCards();
  }
}

loadAnyMediaButton?.addEventListener("click", () => anyMediaInput?.click());
anyMediaInput?.addEventListener("change", async () => {
  const file = anyMediaInput.files?.[0];
  anyMediaInput.value = "";
  await queueMediaFile(file, { freshBoot: true });
});

loadMediaButton?.addEventListener("click", () => prgInput?.click());
prgInput?.addEventListener("change", async () => {
  const file = prgInput.files?.[0];
  prgInput.value = "";
  await queueMediaFile(file);
});

window.addEventListener("keydown", (event) => handleC64Key(event, true));
window.addEventListener("keyup", (event) => handleC64Key(event, false));
window.addEventListener("blur", releaseAllInput);
document.addEventListener("focusin", (event) => {
  if (running && usesNativeKeyboard(event.target)) releaseAllInput();
});

document.addEventListener("visibilitychange", () => {
  if (!running) return;
  if (document.hidden) {
    setAudioPaused(true);
    return;
  }
  lastFrameTime = 0;
  frameAccumulator = 0;
  if (!paused) setAudioPaused(false);
});

document.addEventListener("fullscreenchange", () => {
  if (!running || paused) return;
  lastFrameTime = 0;
  frameAccumulator = 0;
  sidNode?.port.postMessage({ type: "resync" });
});

loadDiskButton?.addEventListener("click", () => diskInput?.click());
diskInput?.addEventListener("change", async () => {
  const file = diskInput.files?.[0];
  diskInput.value = "";
  await queueMediaFile(file);
});

swapDiskButton?.addEventListener("click", () => swapDiskInput?.click());
swapDiskInput?.addEventListener("change", async () => {
  const file = swapDiskInput.files?.[0];
  swapDiskInput.value = "";
  if (!file) return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    swapMountedDisk({ name: file.name, type: mediaTypeFromName(file.name), bytes });
    activeLibraryEntryId = null;
    activeLibraryDiskIndex = 0;
    updateOnlineDiskUi();
  } catch (error) {
    if (stageNote) stageNote.textContent = error?.message || "The replacement disk cannot be inserted.";
  }
});

driveModeButton?.addEventListener("click", () => {
  if (!running || !machine) return;
  if (!vault.getBytes("drive1541")) {
    if (stageNote) stageNote.textContent = "True 1541 mode requires the optional 1541 DOS ROM in System ROMs.";
    return;
  }
  if (driveMode === "fast" && mountedDisk && !["d64", "g64"].includes(mountedDisk.kind)) {
    if (stageNote) stageNote.textContent = "D71 and D81 images use the virtual-drive path. True 1541 mode is available for D64 and G64 media.";
    return;
  }

  driveMode = driveMode === "true" ? "fast" : "true";
  localStorage.setItem("ccg.emulator.c64.driveMode", driveMode);
  machine.setTrueDrive(driveMode === "true");
  updateDriveModeUi(vault.snapshot());
  if (stageNote) {
    stageNote.textContent = driveMode === "true"
      ? "True 1541 mode enabled. D64 and G64 disk commands now run through the cycle-driven 1541."
      : "Fast Load mode enabled. D64/D71/D81 media use the virtual-drive route with automatic LOAD/RUN.";
  }
  screen?.focus();
});

loadTapeButton?.addEventListener("click", () => tapeInput?.click());
tapeInput?.addEventListener("change", async () => {
  const file = tapeInput.files?.[0];
  tapeInput.value = "";
  await queueMediaFile(file);
});

tapePlayButton?.addEventListener("click", () => {
  if (!machine || mountedTape?.kind !== "tap") return;
  machine.setTapeKey("PLAY");
  if (tapeSlotStatus) tapeSlotStatus.textContent = `PLAY // ${mountedTape.name}`;
  screen?.focus();
});

tapeStopButton?.addEventListener("click", () => {
  if (!machine || mountedTape?.kind !== "tap") return;
  machine.setTapeKey("STOP");
  if (tapeSlotStatus) tapeSlotStatus.textContent = `STOP // ${mountedTape.name}`;
  screen?.focus();
});

tapeRewindButton?.addEventListener("click", () => {
  if (!machine || mountedTape?.kind !== "tap") return;
  machine.rewindTape();
  if (tapeSlotStatus) tapeSlotStatus.textContent = `REWOUND // ${mountedTape.name}`;
  screen?.focus();
});

loadCartridgeButton?.addEventListener("click", () => cartridgeInput?.click());
cartridgeInput?.addEventListener("change", async () => {
  const file = cartridgeInput.files?.[0];
  cartridgeInput.value = "";
  await queueMediaFile(file);
});

ejectCartridgeButton?.addEventListener("click", () => {
  if (!machine || !mountedCartridge) return;
  machine.ejectCartridge();
  resetAudioForMachine();
  mountedCartridge = null;
  if (cartridgeSlotStatus) cartridgeSlotStatus.textContent = "CRT / EasyFlash ready";
  if (machineState) machineState.textContent = "CARTRIDGE EJECTED // C64 RESET";
  updateMediaControls(vault.snapshot());
  screen?.focus();
});

function dragContainsFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

function firstSupportedDroppedFile(event) {
  return Array.from(event.dataTransfer?.files || []).find((file) => mediaTypeFromName(file.name)) || null;
}

mediaDropzone?.addEventListener("dragenter", (event) => {
  if (!dragContainsFiles(event)) return;
  event.preventDefault();
  mediaDropzone.classList.add("is-dragover");
}, { capture: true });

mediaDropzone?.addEventListener("dragover", (event) => {
  if (!dragContainsFiles(event)) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  mediaDropzone.classList.add("is-dragover");
}, { capture: true });

mediaDropzone?.addEventListener("dragleave", (event) => {
  if (event.relatedTarget && mediaDropzone.contains(event.relatedTarget)) return;
  mediaDropzone.classList.remove("is-dragover");
}, { capture: true });

mediaDropzone?.addEventListener("drop", async (event) => {
  if (!dragContainsFiles(event)) return;
  event.preventDefault();
  event.stopPropagation();
  mediaDropzone.classList.remove("is-dragover");

  const file = firstSupportedDroppedFile(event);
  if (!file) {
    if (stageNote) stageNote.textContent = "Drop a PRG, D64, D71, D81, G64, TAP, T64 or CRT file onto the C64 screen.";
    return;
  }

  if (stageNote) stageNote.textContent = `Dropped ${file.name}. Preparing it for automatic loading…`;
  await queueMediaFile(file, { freshBoot: true });
});

onlineLibrarySearch?.addEventListener("input", () => {
  onlineLibraryQuery = onlineLibrarySearch.value;
  onlineLibraryPage = 0;
  refreshOnlineLibraryCards();
});
onlineLibraryFormats?.addEventListener("click", (event) => {
  const format = event.target.closest("button[data-library-format]")?.dataset.libraryFormat;
  if (!format) return;
  onlineLibraryFormat = format;
  onlineLibraryPage = 0;
  refreshOnlineLibraryCards();
});
onlineLibraryLetters?.addEventListener("click", (event) => {
  const letter = event.target.closest("button[data-library-letter]")?.dataset.libraryLetter;
  if (!letter) return;
  onlineLibraryLetter = letter;
  onlineLibraryPage = 0;
  refreshOnlineLibraryCards();
});
onlineLibraryGrid?.addEventListener("click", (event) => {
  const id = event.target.closest("button[data-play-game]")?.dataset.playGame;
  if (id) void loadOnlineLibraryEntry(id);
});
onlineLibraryPrevious?.addEventListener("click", () => {
  onlineLibraryPage -= 1;
  refreshOnlineLibraryCards();
});
onlineLibraryNext?.addEventListener("click", () => {
  onlineLibraryPage += 1;
  refreshOnlineLibraryCards();
});
onlineLibraryDiskSwapButton?.addEventListener("click", () => { void swapOnlineLibraryDisk(); });
void initialiseOnlineLibrary();

async function saveGameVaultSlot() {
  if (!machine || !running) return;
  try {
    captureMutableMedia();

    const slot = currentVaultSlot();
    const record = await gameVault.save(slot, {
      format: "ccg-c64-vault",
      version: 1,
      driveMode,
      state: machine.serializeState(),
      media: {
        disk: cloneMedia(mountedDisk),
        tape: cloneMedia(mountedTape),
        cartridge: cloneMedia(mountedCartridge),
      },
    });
    if (vaultStatus) vaultStatus.textContent = `Slot ${slot} saved ${new Date(record.savedAt).toLocaleString()}`;
    if (machineState) machineState.textContent = `GAME VAULT // SLOT ${slot} SAVED`;
    screen?.focus();
  } catch (error) {
    if (stageNote) stageNote.textContent = error?.message || "Game Vault save failed.";
  }
}

async function loadGameVaultSlot() {
  if (!running) return;
  try {
    const slot = currentVaultSlot();
    const record = await gameVault.load(slot);
    const payload = record?.payload;
    if (!payload || payload.format !== "ccg-c64-vault") throw new Error(`Game Vault slot ${slot} is empty.`);

    const driveRom = vault.getBytes("drive1541");
    if (payload.state?.drive1541 && !driveRom) {
      throw new Error("This state used True 1541 mode. Restore the optional 1541 DOS ROM first.");
    }

    stopFrameLoop();
    setAudioPaused(true);

    mountedDisk = cloneMedia(payload.media?.disk);
    mountedTape = cloneMedia(payload.media?.tape);
    mountedCartridge = cloneMedia(payload.media?.cartridge);
    driveMode = payload.driveMode === "true" ? "true" : "fast";
    localStorage.setItem("ccg.emulator.c64.driveMode", driveMode);

    const restored = new C64Machine();
    restored.loadROMs({
      kernal: vault.getBytes("kernal"),
      basic: vault.getBytes("basic"),
      charRom: vault.getBytes("charRom"),
    });
    if (driveRom) restored.attachDrive(driveRom);
    attachSessionMedia(restored);
    restored.restoreState(payload.state);

    machine = restored;
    applyJoystickInput();
    running = true;
    paused = false;
    frameImage = null;
    frameAccumulator = 0;
    lastFrameTime = 0;
    await wireAudioToMachine();
    setAudioPaused(false);
    setControlState(vault.snapshot());
    blitMachine();
    frameHandle = requestAnimationFrame(frameLoop);
    if (machineState) machineState.textContent = `GAME VAULT // SLOT ${slot} RESTORED`;
    if (stageNote) stageNote.textContent = "Machine state and its local disk, tape and cartridge media were restored from this browser.";
    updateMediaControls(vault.snapshot());
    await refreshVaultStatus();
    screen?.focus();
  } catch (error) {
    if (!frameHandle && running && machine) frameHandle = requestAnimationFrame(frameLoop);
    setAudioPaused(false);
    if (stageNote) stageNote.textContent = error?.message || "Game Vault restore failed.";
  }
}

vaultSaveButton?.addEventListener("click", () => { void saveGameVaultSlot(); });
vaultLoadButton?.addEventListener("click", () => { void loadGameVaultSlot(); });
vaultClearButton?.addEventListener("click", async () => {
  const slot = currentVaultSlot();
  if (!window.confirm(`Clear Game Vault slot ${slot} from this browser?`)) return;
  try {
    await gameVault.clear(slot);
    await refreshVaultStatus();
  } catch (error) {
    if (stageNote) stageNote.textContent = error?.message || "Game Vault slot could not be cleared.";
  }
});
vaultSlot?.addEventListener("change", () => { void refreshVaultStatus(); });

for (const button of document.querySelectorAll("[data-joy-mask]")) {
  const mask = Number(button.getAttribute("data-joy-mask")) & 0x1F;
  const press = (event) => {
    event.preventDefault();
    touchHeldMask |= mask;
    touchJoyByte = 0xFF & ~touchHeldMask;
    applyJoystickInput();
    if (inputStatus) inputStatus.textContent = `TOUCH // PORT ${joystickPort}`;
    try { button.setPointerCapture?.(event.pointerId); } catch {}
  };
  const release = (event) => {
    event.preventDefault();
    touchHeldMask &= ~mask;
    touchJoyByte = 0xFF & ~touchHeldMask;
    applyJoystickInput();
    if (!touchHeldMask && inputStatus && !gamepadConnected) inputStatus.textContent = "KEYBOARD READY";
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
}

void refreshVaultStatus();

fullscreenButton?.addEventListener("click", async () => {
  const target = document.querySelector(".ccg-c64-console");
  if (!target) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await target.requestFullscreen();
  } catch {}
});

document.querySelector("[data-ccg-c64-year]")?.replaceChildren(String(new Date().getFullYear()));

const initial = vault.restore();
render(initial);

// Returning visitors with a complete local ROM bank should see the real C64
// BASIC READY screen, not the CCG pre-boot status canvas. First-time visitors
// still retain the media-first flow and are prompted for ROMs only when needed.
if (initial.allRequiredReady && typeof SharedArrayBuffer !== "undefined") {
  void powerOn();
}

// Do not interrupt first-time visitors with a firmware modal. They can choose
// media immediately; setup is requested only when the selected media needs booting.

window.addEventListener("pagehide", () => {
  releaseAllInput();
  stopFrameLoop();
});
