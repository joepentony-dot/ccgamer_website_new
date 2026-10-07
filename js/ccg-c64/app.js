import { ROMVault, ROM_SPEC, REQUIRED_ROM_KEYS, pickRomFiles } from "./rom-vault.js";
import { C64Machine } from "./core/machine.js";
import { KEY_MAP, CHAR_MAP } from "./core/cia.js";
import { D64, d64Variant } from "./core/media/d64.js";
import { G64, isG64 } from "./core/media/g64.js";
import { GameVault } from "./game-vault.js";
import { extractFirstT64Program } from "./t64.js";
import { WebGLPresenter } from "./core/webgl-presenter.js";
import { CRT_MODES, presetParams } from "./core/crt-params.js";

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
const onlineLibrarySelect = document.querySelector("[data-online-library-select]");
const onlineLibraryLoad = document.querySelector("[data-online-library-load]");
const onlineLibraryStatus = document.querySelector("[data-online-library-status]");
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
const audioStatus = document.querySelector("[data-audio-status]");
const audioButton = document.querySelector("[data-audio-toggle]");
const crtButton = document.querySelector("[data-crt-toggle]");
const sizeButton = document.querySelector("[data-size-toggle]");
const screenStage = document.querySelector(".ccg-c64-screen-stage");

const PAL_FRAME_MS = 1000 / 50.125;
const WARP_LOAD_FACTOR = 4;
let machine = null;
let running = false;
let paused = false;
let warpLoadActive = false;
let frameImage = null;
let frameHandle = 0;
let lastFrameTime = 0;
let frameAccumulator = 0;
let driveMode = "fast"; // Always start user-facing sessions in auto-loading Fast Load mode.
let mountedDisk = null;
let mountedTape = null;
let mountedCartridge = null;
let gamepadJoyByte = 0xFF;
let touchJoyByte = 0xFF;
let touchHeldMask = 0;
let pendingMedia = null;
let onlineLibraryEntries = [];
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

function applyScreenSize() {
  screenStage?.classList.toggle("is-2x", fixed2x);
  const strong = sizeButton?.querySelector("strong");
  if (strong) strong.textContent = fixed2x ? "2X" : "FIT";
}

function toggleScreenSize() {
  fixed2x = !fixed2x;
  localStorage.setItem("ccg.emulator.c64.size", fixed2x ? "2x" : "fit");
  applyScreenSize();
}

applyCrtMode();
applyScreenSize();

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

function applyJoystickPort2() {
  if (machine) machine.joyPort2 = gamepadJoyByte & touchJoyByte;
}

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
  updateDriveModeUi(snapshot);
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

function handleC64Key(event, pressed) {
  if (!running || !machine || document.activeElement !== screen) return;

  if (event.metaKey) return;

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
    applyJoystickPort2();
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
  applyJoystickPort2();

  if (!gamepadConnected) {
    gamepadConnected = true;
    if (inputStatus) inputStatus.textContent = "GAMEPAD // PORT 2";
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
  ctx.fillText("COMMODORE 64", 52, 58);
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
    if (strong) strong.textContent = warpLoadActive ? `ON · ${WARP_LOAD_FACTOR}X` : `${WARP_LOAD_FACTOR}X`;
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
  const delta = Math.min(100, Math.max(0, now - lastFrameTime));
  lastFrameTime = now;

  if (!paused) {
    frameAccumulator += delta * (warpLoadActive ? WARP_LOAD_FACTOR : 1);
    let frames = 0;
    while (frameAccumulator >= PAL_FRAME_MS) {
      machine.runFrame();
      frameAccumulator -= PAL_FRAME_MS;
      frames += 1;
    }
    if (frames) {
      blitMachine();
      serviceAutoStart();
    }
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
      ? `WARP LOAD ACTIVE // ${WARP_LOAD_FACTOR}X`
      : "C64 CORE RUNNING // VIDEO ACTIVE";
  }
  if (stageNote) {
    stageNote.textContent = warpLoadActive
      ? `Warp Load is running the C64 at up to ${WARP_LOAD_FACTOR}× speed. Audio is muted while warping; switch it off when loading has finished.`
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

powerButton?.addEventListener("click", () => { void powerOn(); });
resetButton?.addEventListener("click", resetMachine);
pauseButton?.addEventListener("click", togglePause);
warpLoadButton?.addEventListener("click", toggleWarpLoad);
audioButton?.addEventListener("click", toggleAudioMute);
crtButton?.addEventListener("click", cycleCrtMode);
sizeButton?.addEventListener("click", toggleScreenSize);
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
        : "Disk mounted in Fast Load mode. The emulator will automatically LOAD and RUN the first program.";
    }
    updateMediaControls(vault.snapshot());
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
  if (!type) {
    if (stageNote) stageNote.textContent = "Use PRG, D64, D71, D81, G64, TAP, T64 or CRT media.";
    return false;
  }
  return queueMedia({ name: file.name, type, bytes: new Uint8Array(await file.arrayBuffer()) }, options);
}

async function initialiseOnlineLibrary() {
  if (!onlineLibrarySelect || !onlineLibraryStatus) return;
  onlineLibraryStatus.textContent = "LOADING";
  try {
    const response = await fetch("/emulator/c64/library.json", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];
    onlineLibraryEntries = entries.filter((entry) =>
      entry && typeof entry.id === "string" && typeof entry.title === "string" &&
      SUPPORTED_MEDIA_TYPES.has(String(entry.format || "").toLowerCase()) &&
      (typeof entry.url === "string" || typeof entry.dataBase64 === "string")
    );

    onlineLibrarySelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = onlineLibraryEntries.length ? "Choose an item…" : "No authorised media listed";
    onlineLibrarySelect.append(placeholder);

    for (const entry of onlineLibraryEntries) {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = `${entry.title} [${String(entry.format).toUpperCase()}]`;
      onlineLibrarySelect.append(option);
    }

    onlineLibraryStatus.textContent = onlineLibraryEntries.length ? `${onlineLibraryEntries.length} READY` : "EMPTY";
    if (onlineLibraryLoad) onlineLibraryLoad.disabled = true;
  } catch (error) {
    onlineLibraryEntries = [];
    onlineLibrarySelect.replaceChildren(new Option("Library unavailable", ""));
    onlineLibraryStatus.textContent = "UNAVAILABLE";
    if (onlineLibraryLoad) onlineLibraryLoad.disabled = true;
  }
}

async function loadOnlineLibraryEntry() {
  const id = onlineLibrarySelect?.value || "";
  const entry = onlineLibraryEntries.find((item) => item.id === id);
  if (!entry) return;

  if (onlineLibraryLoad) onlineLibraryLoad.disabled = true;
  if (onlineLibraryStatus) onlineLibraryStatus.textContent = "FETCHING";

  try {
    let bytes;
    if (entry.dataBase64) {
      bytes = decodeLibraryBase64(entry.dataBase64);
    } else {
      const url = new URL(entry.url, window.location.href);
      const response = await fetch(url.href, {
        cache: "no-store",
        credentials: url.origin === window.location.origin ? "same-origin" : "omit",
        mode: "cors",
      });
      if (!response.ok) throw new Error(`Library download failed (HTTP ${response.status}).`);
      bytes = new Uint8Array(await response.arrayBuffer());
    }

    const type = String(entry.format).toLowerCase();
    const filename = entry.filename || `${entry.title.replace(/[^a-z0-9._-]+/gi, "-") || "ccg-media"}.${type}`;
    await queueMedia({ name: filename, type, bytes }, { freshBoot: true });
    if (onlineLibraryStatus) onlineLibraryStatus.textContent = "READY";
  } catch (error) {
    if (onlineLibraryStatus) onlineLibraryStatus.textContent = "ERROR";
    if (stageNote) stageNote.textContent = error?.message || "The Online Library item could not be loaded.";
  } finally {
    if (onlineLibraryLoad) onlineLibraryLoad.disabled = !onlineLibrarySelect?.value;
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

onlineLibrarySelect?.addEventListener("change", () => {
  if (onlineLibraryLoad) onlineLibraryLoad.disabled = !onlineLibrarySelect.value;
});
onlineLibraryLoad?.addEventListener("click", () => { void loadOnlineLibraryEntry(); });
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
    applyJoystickPort2();
    if (inputStatus) inputStatus.textContent = "TOUCH // PORT 2";
    try { button.setPointerCapture?.(event.pointerId); } catch {}
  };
  const release = (event) => {
    event.preventDefault();
    touchHeldMask &= ~mask;
    touchJoyByte = 0xFF & ~touchHeldMask;
    applyJoystickPort2();
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

// Once the required ROM bank is present, the emulator should behave like a
// switched-on C64: boot the real firmware immediately and arrive at BASIC READY.
// First-time visitors without ROMs still see the local setup/status canvas.
if (initial.allRequiredReady && typeof SharedArrayBuffer !== "undefined") {
  void powerOn();
}
// Do not interrupt first-time visitors with a firmware modal. They can choose
// media immediately; setup is requested only when the selected media needs booting.

window.addEventListener("pagehide", () => {
  releaseAllInput();
  stopFrameLoop();
});
