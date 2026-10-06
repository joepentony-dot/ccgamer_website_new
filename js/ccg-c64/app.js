import { ROMVault, ROM_SPEC, REQUIRED_ROM_KEYS, pickViceRoms } from "./rom-vault.js";
import { C64Machine } from "./core/machine.js";

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
const stageNote = document.querySelector("[data-stage-note]");

const PAL_FRAME_MS = 1000 / 50.125;
let machine = null;
let running = false;
let paused = false;
let frameImage = null;
let frameHandle = 0;
let lastFrameTime = 0;
let frameAccumulator = 0;

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
    if (machineState) machineState.textContent = "C64 CORE RUNNING // VIDEO ACTIVE";
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

window.addEventListener("pagehide", stopFrameLoop);
