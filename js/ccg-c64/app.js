import { ROMVault, ROM_SPEC, REQUIRED_ROM_KEYS, pickViceRoms } from "./rom-vault.js";
import { C64Machine } from "./core/machine.js";
import { KEY_MAP, CHAR_MAP } from "./core/cia.js";
import { D64, d64Variant } from "./core/media/d64.js";

const vault = new ROMVault();
const setup = document.querySelector("[data-rom-setup]");
const finishSetup = document.querySelector("[data-finish-setup]");
const romSummary = document.querySelector("[data-rom-summary]");
const viceFolder = document.getElementById("ccg-vice-folder");
const viceMessage = document.querySelector("[data-vice-message]");
const machineState = document.querySelector("[data-machine-state]");
const screen = document.getElementById("ccg-c64-screen");
const fullscreenButton = document.querySelector("[data-fullscreen]");
const powerButton = document.querySelector("[data-machine-power]");
const resetButton = document.querySelector("[data-machine-reset]");
const pauseButton = document.querySelector("[data-machine-pause]");
const loadMediaButton = document.querySelector("[data-load-media]");
const prgInput = document.getElementById("ccg-c64-prg-input");
const loadDiskButton = document.querySelector("[data-load-disk]");
const diskInput = document.getElementById("ccg-c64-disk-input");
const diskSlotStatus = document.querySelector("[data-disk-slot-status]");
const stageNote = document.querySelector("[data-stage-note]");
const inputStatus = document.querySelector("[data-input-status]");

const PAL_FRAME_MS = 1000 / 50.125;
let machine = null;
let running = false;
let paused = false;
let frameImage = null;
let frameHandle = 0;
let lastFrameTime = 0;
let frameAccumulator = 0;


const heldMatrixKeys = new Map();
let shiftLeftPhysical = false;
let shiftRightPhysical = false;
let syntheticShiftCount = 0;
let gamepadConnected = false;

function syncShiftKeys() {
  if (!machine) return;
  machine.cia1.setKey(1, 7, shiftLeftPhysical || syntheticShiftCount > 0);
  machine.cia1.setKey(6, 4, shiftRightPhysical);
}

function releaseAllInput() {
  if (machine) {
    for (const held of heldMatrixKeys.values()) {
      machine.cia1.setKey(held.col, held.row, false);
    }
    machine.joyPort1 = 0xFF;
    machine.joyPort2 = 0xFF;
    machine.setRestoreNmiLine(false);
  }
  heldMatrixKeys.clear();
  shiftLeftPhysical = false;
  shiftRightPhysical = false;
  syntheticShiftCount = 0;
  syncShiftKeys();
}

function eventMatrixBinding(event) {
  const charBinding = event.key && event.key.length === 1 ? CHAR_MAP[event.key] : null;
  if (charBinding) {
    return {
      col: charBinding.col,
      row: charBinding.row,
      syntheticShift: Boolean(charBinding.shift),
    };
  }

  const physical = KEY_MAP[event.code] || KEY_MAP[event.key];
  if (!physical) return null;
  return { col: physical[0], row: physical[1], syntheticShift: false };
}

function handleC64Key(event, pressed) {
  if (!running || !machine || document.activeElement !== screen) return;

  if (event.code === "F12") {
    event.preventDefault();
    machine.setRestoreNmiLine(pressed);
    return;
  }

  if (event.code === "ShiftLeft") {
    event.preventDefault();
    shiftLeftPhysical = pressed;
    syncShiftKeys();
    return;
  }

  if (event.code === "ShiftRight") {
    event.preventDefault();
    shiftRightPhysical = pressed;
    syncShiftKeys();
    return;
  }

  const heldKey = `${event.code}|${event.key}`;
  if (pressed) {
    if (event.repeat || heldMatrixKeys.has(heldKey)) {
      if (heldMatrixKeys.has(heldKey)) event.preventDefault();
      return;
    }

    const binding = eventMatrixBinding(event);
    if (!binding) return;
    event.preventDefault();
    machine.cia1.setKey(binding.col, binding.row, true);
    if (binding.syntheticShift) {
      syntheticShiftCount += 1;
      syncShiftKeys();
    }
    heldMatrixKeys.set(heldKey, binding);
    return;
  }

  const binding = heldMatrixKeys.get(heldKey);
  if (!binding) return;
  event.preventDefault();
  machine.cia1.setKey(binding.col, binding.row, false);
  if (binding.syntheticShift) {
    syntheticShiftCount = Math.max(0, syntheticShiftCount - 1);
    syncShiftKeys();
  }
  heldMatrixKeys.delete(heldKey);
}

function pollGamepad() {
  if (!machine || !running) return;
  const pads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
  const pad = Array.from(pads || []).find((entry) => entry && entry.connected);

  if (!pad) {
    machine.joyPort2 = 0xFF;
    if (gamepadConnected) {
      gamepadConnected = false;
      if (inputStatus) inputStatus.textContent = "KEYBOARD READY";
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
  machine.joyPort2 = byte;

  if (!gamepadConnected) {
    gamepadConnected = true;
    if (inputStatus) inputStatus.textContent = "GAMEPAD // PORT 2";
  }
}

function drawStatus(snapshot, message = null) {
  if (!screen) return;
  const ctx = screen.getContext("2d");
  if (!ctx) return;

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
          "FIRST BOOT CHECK",
          "",
          `REQUIRED ROMS: ${snapshot.requiredReady}/3`,
          "",
          "OPEN ROM CONTROL TO CONTINUE."
        ];

  lines.forEach((line, index) => ctx.fillText(line, 52, 92 + index * 20));
}

function setControlState(snapshot) {
  const canBoot = snapshot.allRequiredReady && typeof SharedArrayBuffer !== "undefined";
  if (powerButton) powerButton.disabled = !canBoot;
  if (resetButton) resetButton.disabled = !running;
  if (pauseButton) pauseButton.disabled = !running;
  if (loadMediaButton) loadMediaButton.disabled = !running;
  if (loadDiskButton) loadDiskButton.disabled = !running;

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
        ? "ROM BANK VERIFIED // READY TO BOOT"
        : "WAITING FOR ROM CHECK";
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
  const ctx = screen.getContext("2d");
  if (!ctx) return;
  if (!frameImage || frameImage.data.buffer !== machine.vic2.frameBuffer.buffer) {
    frameImage = new ImageData(machine.vic2.frameBuffer, screen.width, screen.height);
  }
  ctx.putImageData(frameImage, 0, 0);
}

function frameLoop(now) {
  if (!running || !machine) return;
  pollGamepad();
  if (!lastFrameTime) lastFrameTime = now;
  const delta = Math.min(100, Math.max(0, now - lastFrameTime));
  lastFrameTime = now;

  if (!paused) {
    frameAccumulator += delta;
    let frames = 0;
    while (frameAccumulator >= PAL_FRAME_MS && frames < 3) {
      machine.runFrame();
      frameAccumulator -= PAL_FRAME_MS;
      frames += 1;
    }
    if (frames) blitMachine();
  }

  frameHandle = requestAnimationFrame(frameLoop);
}

function powerOff() {
  releaseAllInput();
  running = false;
  paused = false;
  stopFrameLoop();
  machine = null;
  frameImage = null;
  if (machineState) machineState.textContent = "POWERED OFF // ROM BANK RETAINED";
  if (stageNote) stageNote.textContent = "Machine powered off. Your validated ROMs remain stored locally in this browser.";
  render(vault.snapshot());
}

function powerOn() {
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
    if (driveRom) {
      machine.attachDrive(driveRom);
      machine.setTrueDrive(true);
    } else {
      machine.setTrueDrive(false);
    }

    running = true;
    paused = false;
    frameImage = null;
    frameAccumulator = 0;
    lastFrameTime = 0;
    if (machineState) machineState.textContent = "C64 CORE RUNNING // VIDEO + INPUT ACTIVE";
    if (inputStatus) inputStatus.textContent = "KEYBOARD READY";
    if (stageNote) stageNote.textContent = "Live machine/video core active. SID output and complete physical input/media routing are the next integration gates.";
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
  machine.reset();
  paused = false;
  frameAccumulator = 0;
  if (machineState) machineState.textContent = "C64 RESET // RUNNING";
  setControlState(vault.snapshot());
}

function togglePause() {
  if (!machine || !running) return;
  paused = !paused;
  frameAccumulator = 0;
  lastFrameTime = 0;
  if (machineState) machineState.textContent = paused ? "C64 PAUSED" : "C64 CORE RUNNING // VIDEO ACTIVE";
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

if (viceFolder) {
  const canPickFolders = "webkitdirectory" in document.createElement("input");
  if (!canPickFolders) {
    viceFolder.closest(".ccg-c64-setup-step")?.setAttribute("hidden", "");
  }

  viceFolder.addEventListener("change", async () => {
    const files = [...(viceFolder.files || [])];
    viceFolder.value = "";
    if (!files.length) return;

    const root = files[0].webkitRelativePath?.split("/")[0] || "selected folder";
    const found = pickViceRoms(files);
    const loaded = [];

    for (const [key, file] of Object.entries(found)) {
      try {
        await vault.installFile(key, file);
        loaded.push(ROM_SPEC[key].label);
      } catch {}
    }

    const snapshot = vault.snapshot();
    render(snapshot);
    if (viceMessage) {
      viceMessage.textContent = loaded.length
        ? `Accepted from ${root}: ${loaded.join(", ")}.`
        : `No recognised C64 ROM set was found in ${root}.`;
    }
  });
}

finishSetup?.addEventListener("click", () => {
  if (!vault.snapshot().allRequiredReady) return;
  hideSetup();
  screen?.focus();
});

powerButton?.addEventListener("click", powerOn);
resetButton?.addEventListener("click", resetMachine);
pauseButton?.addEventListener("click", togglePause);

loadMediaButton?.addEventListener("click", () => {
  if (!running) return;
  prgInput?.click();
});

prgInput?.addEventListener("change", async () => {
  const file = prgInput.files?.[0];
  prgInput.value = "";
  if (!file || !machine || !running) return;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 3) throw new Error("That PRG is too small to contain a C64 load address.");
    machine.loadPRG(bytes);
    machine.injectRun();
    if (machineState) machineState.textContent = `PRG STARTED // ${file.name.toUpperCase()}`;
  } catch (error) {
    if (stageNote) stageNote.textContent = error?.message || "The PRG could not be started.";
  }
});

window.addEventListener("keydown", (event) => handleC64Key(event, true));
window.addEventListener("keyup", (event) => handleC64Key(event, false));
window.addEventListener("blur", releaseAllInput);


loadDiskButton?.addEventListener("click", () => {
  if (!running) return;
  diskInput?.click();
});

diskInput?.addEventListener("change", async () => {
  const file = diskInput.files?.[0];
  diskInput.value = "";
  if (!file || !machine || !running) return;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const variant = d64Variant(bytes.length);
    if (!variant || variant.kind !== "d64") {
      throw new Error("This first disk bay pass accepts standard D64 images only.");
    }

    const disk = new D64(bytes);
    machine.setD64(disk);

    // The first CCG disk route deliberately uses the core's virtual-drive
    // fast-load path so LOAD/RUN is deterministic before the later advanced
    // true-drive controls are exposed in the Omega interface.
    machine.setTrueDrive(false);
    machine.injectLoadAndRun();

    if (diskSlotStatus) {
      diskSlotStatus.textContent = disk.diskName
        ? `${disk.diskName} // ${file.name}`
        : file.name;
    }
    if (machineState) machineState.textContent = `D64 MOUNTED // ${file.name.toUpperCase()}`;
    if (stageNote) stageNote.textContent = "Disk mounted in Drive 8 and LOAD/RUN queued through the fast-load path. Advanced true-drive controls remain a later media-bay pass.";
    screen?.focus();
  } catch (error) {
    if (stageNote) stageNote.textContent = error?.message || "The disk image could not be mounted.";
  }
});

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
if (!initial.allRequiredReady) showSetup();

window.addEventListener("pagehide", () => {
  releaseAllInput();
  stopFrameLoop();
});
