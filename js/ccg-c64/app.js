import { ROMVault, ROM_SPEC, REQUIRED_ROM_KEYS, pickViceRoms } from "./rom-vault.js";

const vault = new ROMVault();
const setup = document.querySelector("[data-rom-setup]");
const finishSetup = document.querySelector("[data-finish-setup]");
const romSummary = document.querySelector("[data-rom-summary]");
const viceFolder = document.getElementById("ccg-vice-folder");
const viceMessage = document.querySelector("[data-vice-message]");
const machineState = document.querySelector("[data-machine-state]");
const screen = document.getElementById("ccg-c64-screen");
const fullscreenButton = document.querySelector("[data-fullscreen]");

function drawStatus(snapshot) {
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

  const lines = snapshot.allRequiredReady
    ? [
        "ROM BANK VERIFIED.",
        "",
        "MACHINE CORE CONNECTION",
        "IS THE NEXT BUILD STAGE.",
        "",
        "YOUR ROMS ARE STORED LOCALLY."
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
  if (machineState) {
    machineState.textContent = snapshot.allRequiredReady
      ? "ROM BANK VERIFIED // CORE WIRING PENDING"
      : "WAITING FOR ROM CHECK";
  }

  drawStatus(snapshot);
}

function showSetup() {
  if (!setup) return;
  setup.hidden = false;
  document.body.style.overflow = "hidden";
}

function hideSetup() {
  if (!setup) return;
  setup.hidden = true;
  document.body.style.overflow = "";
}

for (const button of document.querySelectorAll("[data-open-setup]")) {
  button.addEventListener("click", showSetup);
}

document.querySelector("[data-clear-roms]")?.addEventListener("click", () => {
  if (!window.confirm("Clear the locally stored C64 ROMs from this browser?")) return;
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
