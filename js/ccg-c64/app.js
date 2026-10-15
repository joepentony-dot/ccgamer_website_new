import { ROMVault, ROM_SPEC, REQUIRED_ROM_KEYS, pickRomFiles } from "./rom-vault.js";
import { HOSTED_ROM_VERSION, fetchVerifiedHostedROMs, installHostedROMs } from "./hosted-roms.js";
import { C64Machine } from "./core/machine.js?ccg_rev=20261011_ios_silent_fallback_v1";
import { KEY_MAP, CHAR_MAP } from "./core/cia.js";
import { D64, d64Variant } from "./core/media/d64.js";
import { G64, isG64 } from "./core/media/g64.js";
import { GameVault, encodeGameVaultBackup, decodeGameVaultBackup } from "./game-vault.js";
import { mountCatalogueBrowser } from "./catalogue-browser.js";
import { extractFirstT64Program } from "./t64.js";
import { WebGLPresenter } from "./core/webgl-presenter.js";
import { CRT_MODES, presetParams } from "./core/crt-params.js";
import {
  PACK_ROOT, PACK_CATALOG_URL, ARCHIVE_PACK_ROOT, ARCHIVE_CATALOG_URL,
  ARCHIVE_READY_URL, ADDITIONAL_CRT_CATALOG_URL, parseAdditionalCrtCatalog,
  parsePackedCatalog, suggestCatalogGames, loadPackedGameBytes,
  preferSelectedCartridges, catalogGameIdentity,
} from "./game-catalog.js";

// Safari privacy settings can deny localStorage, even though the page and
// emulator engine are otherwise usable. Preserve normal persistent storage
// wherever available; use session-only memory if reads/writes are blocked.
const localStorage = (() => {
  try {
    const store = window.localStorage;
    const probe = "__ccg_c64_storage_probe__";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    const cache = new Map();
    return {
      getItem(key) { return cache.has(String(key)) ? cache.get(String(key)) : null; },
      setItem(key, value) { cache.set(String(key), String(value)); },
      removeItem(key) { cache.delete(String(key)); },
    };
  }
})();
const vault = new ROMVault(localStorage);
const gameVault = new GameVault();
const setup = document.querySelector("[data-rom-setup]");
const finishSetup = document.querySelector("[data-finish-setup]");
const romSummary = document.querySelector("[data-rom-summary]");
const romSetInput = document.getElementById("ccg-rom-set");
const romSetMessage = document.querySelector("[data-rom-set-message]");
const romExportButton = document.querySelector("[data-rom-export]");
const romImportInput = document.querySelector("[data-rom-import]");
const romTransferStatus = document.querySelector("[data-rom-transfer-status]");
const closeSetupButton = document.querySelector("[data-close-setup]");
const loadAnyMediaButton = document.querySelector("[data-load-any-media]");
const anyMediaInput = document.getElementById("ccg-c64-any-media-input");
const mediaDropzone = document.querySelector("[data-media-dropzone]");
const onlineLibraryPanel = document.querySelector(".ccg-c64-panel--library");
const controlsDeck = document.querySelector(".ccg-c64-control-stack");
const onlineLibrarySearch = document.querySelector("[data-online-library-search]");
const onlineLibraryGrid = document.querySelector("[data-online-library-grid]");
const onlineLibrarySuggestions = document.querySelector("[data-online-library-suggestions]");
const onlineLibrarySearchWrap = document.querySelector("[data-library-search-wrap]");
const onlineLibraryCount = document.querySelector("[data-library-result-count]");
const onlineLibraryMatchCount = document.querySelector("[data-library-match-count]");
const onlineLibraryRetryButton = document.querySelector("[data-online-library-retry]");
const onlineLibraryLoadButton = document.querySelector("[data-online-library-load]");
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
const mobileWarpLoadButton = document.querySelector("[data-mobile-warp-load]");
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
const vaultGameSelect = document.querySelector("[data-vault-game]");
const vaultExportButton = document.querySelector("[data-vault-export]");
const vaultImportButton = document.querySelector("[data-vault-import]");
const vaultBackupInput = document.querySelector("[data-vault-backup-input]");
const vaultSlot = document.querySelector("[data-vault-slot]");
const vaultSaveButton = document.querySelector("[data-vault-save]");
const vaultLoadButton = document.querySelector("[data-vault-load]");
const vaultClearButton = document.querySelector("[data-vault-clear]");
const vaultStatus = document.querySelector("[data-vault-status]");
const vaultStorageNotice = document.querySelector("[data-vault-storage-notice]");
const vaultRetryButton = document.querySelector("[data-vault-retry]");
const vaultFeedback = document.querySelector("[data-vault-feedback]");
const warpHint = document.querySelector("[data-warp-hint]");
const playHelp = document.querySelector("[data-play-help]");
const stageNote = document.querySelector("[data-stage-note]");
const inputStatus = document.querySelector("[data-input-status]");
const joystickSwapButton = document.querySelector("[data-joystick-swap]");
const mobileJoystickSwapButton = document.querySelector("[data-mobile-joystick-swap]");
const keyboardJoystickButton = document.querySelector("[data-keyboard-joystick]");
const joystickPortIndicator = document.querySelector("[data-joystick-port]");
const emulatorSpeedStatus = document.querySelector("[data-emulator-speed]");
const audioStatus = document.querySelector("[data-audio-status]");
const audioButton = document.querySelector("[data-audio-toggle]");
const crtButton = document.querySelector("[data-crt-toggle]");
const sizeButton = document.querySelector("[data-size-toggle]");
const screenStage = document.querySelector(".ccg-c64-screen-stage");
const screenBezel = document.querySelector(".ccg-c64-screen-bezel");
const workspace = document.querySelector(".ccg-c64-workspace");

/* Mobile/tablet gameplay: a viewport-filling console, with the screen above
   uninterrupted touch controls. Desktop pointer/fine layouts never enter. */
const mobilePlayConsole = document.querySelector(".ccg-c64-console");
const mobilePlaybar = document.querySelector("[data-mobile-playbar]");
const mobileGameActions = document.querySelector("[data-mobile-game-actions]");
const mobilePauseButton = document.querySelector("[data-mobile-pause]");
const mobileSaveStateButton = document.querySelector("[data-mobile-save-state]");
const mobileLoadStateButton = document.querySelector("[data-mobile-load-state]");
const mobileCrtButton = document.querySelector("[data-mobile-crt-mode]");
const mobileVaultPanel = document.querySelector("[data-mobile-vault-panel]");
const mobileVaultTitle = document.querySelector("[data-mobile-vault-title]");
const mobileVaultHelp = document.querySelector("[data-mobile-vault-help]");
const mobileVaultSlots = document.querySelector("[data-mobile-vault-slots]");
const mobileVaultMessage = document.querySelector("[data-mobile-vault-message]");
const mobileVaultClose = document.querySelector("[data-mobile-vault-close]");
let mobileVaultAutoPaused = false;
let mobileVaultRequestId = 0;
const mobileExitButton = document.querySelector("[data-mobile-exit-game]");
const mobilePlayTitle = document.querySelector("[data-mobile-play-title]");
const mobileZoomButton = document.querySelector("[data-mobile-zoom-toggle]");
const MOBILE_ZOOM_STORAGE_KEY = "ccg.emulator.c64.mobileZoom.v1";
let mobileZoomEnabled = (() => {
  try { return localStorage.getItem(MOBILE_ZOOM_STORAGE_KEY) === "1"; }
  catch { return false; }
})();
const mobileKeyboardToggle = document.querySelector("[data-mobile-keyboard-toggle]");
const mobileKeyboardClose = document.querySelector("[data-mobile-keyboard-close]");
const mobileKeyboardPanel = document.querySelector("[id='ccg-c64-mobile-keyboard']");
const mobileKeyboardKeys = document.querySelector("[data-mobile-keyboard-keys]");
const mobilePlayMedia = window.matchMedia?.("(pointer: coarse)");

// Mobile-only safety net for Safari's long-press callout and Android's
// text-selection menu on buttons. Never suppress text selection in the
// search field, actual inputs, dropdowns, or ordinary page content.
// Capture handlers do not alter pointerdown/up, click or touch gestures.
// BEGIN C64 MOBILE BUTTON SELECTION GUARD
if (mobilePlayMedia?.matches) {
  const suppressMobileControlSelection = (event) => {
    const element = event.target?.nodeType === 1
      ? event.target : event.target?.parentElement;
    const control = element?.closest?.("button, summary");
    if (control?.closest?.("body.ccg-c64-lab-body")) event.preventDefault();
  };
  document.addEventListener?.("selectstart", suppressMobileControlSelection, true);
  document.addEventListener?.("contextmenu", suppressMobileControlSelection, true);
}
// END C64 MOBILE BUTTON SELECTION GUARD

let mobilePlayActive = false;
const mobileVirtualHeld = new Map();
const MIN_MOBILE_KEY_MS = 105;

const mobileKeyRows = [
  [["RESTORE", "F12"], ["F1", "F1"], ["F3", "F3"], ["F5", "F5"],
    ["F7", "F7"], ["RUN/STOP", "F9"], ["CLR/HOME", "F11"]],
  [["F2", "F2"], ["F4", "F4"], ["F6", "F6"], ["F8", "F8"]],
  [["1", "Digit1"], ["2", "Digit2"], ["3", "Digit3"], ["4", "Digit4"],
    ["5", "Digit5"], ["6", "Digit6"], ["7", "Digit7"], ["8", "Digit8"],
    ["9", "Digit9"], ["0", "Digit0"], ["DEL", "Backspace"]],
  [..."QWERTYUIOP".split("").map(k => [k, "Key" + k]),
    ["@", "@"], ["+", "+"]],
  [..."ASDFGHJKL".split("").map(k => [k, "Key" + k]),
    [":", ":"], [";", ";"], ["RETURN", "Enter"]],
  [["SHIFT", "ShiftLeft"], ..."ZXCVBNM".split("").map(k => [k, "Key" + k]),
    [",", ","], [".", "."], ["/", "/"], ["SHIFT", "ShiftRight"]],
  [["CTRL", "ControlLeft"], ["C=", "F10"], ["-", "-"], ["*", "*"],
    ["SPACE", "Space"], ["LEFT", "ArrowLeft"], ["UP", "ArrowUp"],
    ["DOWN", "ArrowDown"], ["RIGHT", "ArrowRight"]]
];

function mobileVirtualBinding(code) {
  if (code === "F12") return { restore: true };
  const shiftedFn = { F2: "F1", F4: "F3", F6: "F5", F8: "F7" }[code];
  if (shiftedFn) {
    const key = KEY_MAP[shiftedFn];
    return key ? { col: key[0], row: key[1], shift: true } : null;
  }
  if (code === "ArrowLeft") return { col: 0, row: 2, shift: true };
  if (code === "ArrowUp") return { col: 0, row: 7, shift: true };
  const physical = KEY_MAP[code];
  if (physical) return { col: physical[0], row: physical[1], shift: false };
  const character = CHAR_MAP[code];
  if (character) return { col: character.col, row: character.row, shift: character.shift };
  return null;
}

function syncMobileMatrixBit(col, row) {
  if (!machine) return;
  const held = [...mobileVirtualHeld.values()].some(k =>
    (k.col === col && k.row === row) || (col === 1 && row === 7 && k.shift)) ||
    [...heldMatrixKeys.values()].some(k => k.col === col && k.row === row) ||
    [...touchFunctionKeyHolds.values()].some(k => k.col === col && k.row === row) ||
    (col === 1 && row === 7 && shiftLeftPhysical) ||
    (col === 6 && row === 4 && shiftRightPhysical);
  machine.cia1.setKey(col, row, held);
}

function releaseMobileVirtualKeys() {
  if (!mobileVirtualHeld.size) return;
  const released = [...mobileVirtualHeld.values()];
  for (const held of released) if (held.timer) clearTimeout(held.timer);
  mobileVirtualHeld.clear();
  if (machine) {
    for (const held of released) {
      if (held.restore) machine.setRestoreNmiLine(false);
      else syncMobileMatrixBit(held.col, held.row);
    }
    syncMobileMatrixBit(1, 7);
  }
  for (const button of mobileKeyboardKeys?.querySelectorAll("button.is-pressed") || []) {
    button.classList.remove("is-pressed");
  }
}

function setMobileKeyboardOpen(open) {
  const active = Boolean(open && mobilePlayActive);
  if (!active) releaseMobileVirtualKeys();
  if (mobileKeyboardPanel) mobileKeyboardPanel.hidden = !active;
  mobileKeyboardToggle?.setAttribute("aria-expanded", String(active));
  mobileKeyboardToggle?.setAttribute("aria-pressed", String(active));
  if (mobileKeyboardToggle) mobileKeyboardToggle.textContent = active ? "HIDE KEYS" : "KEYBOARD";
}

function syncMobileZoom() {
  // Optical zoom only: the actual 384×272 PAL canvas and input matrix
  // stay untouched. The existing bezel clips the outer C64 border.
  const zooming = Boolean(mobilePlayActive && mobilePlayMedia?.matches && mobileZoomEnabled);
  mobilePlayConsole?.classList.toggle("is-mobile-zoomed", zooming);
  mobileZoomButton?.setAttribute("aria-pressed", String(zooming));
  mobileZoomButton?.setAttribute("aria-label", zooming
    ? "Disable mobile game zoom"
    : "Enable mobile game zoom");
  if (mobileZoomButton) mobileZoomButton.textContent = zooming ? "ZOOM: ON" : "ZOOM: OFF";
}

function toggleMobileZoom() {
  if (!mobilePlayActive || !mobilePlayMedia?.matches) return;
  mobileZoomEnabled = !mobileZoomEnabled;
  try { localStorage.setItem(MOBILE_ZOOM_STORAGE_KEY, mobileZoomEnabled ? "1" : "0"); }
  catch { /* Storage can be restricted in private browsing. */ }
  syncMobileZoom();
}

function setMobilePlaying(active, label = "") {
  const enabled = Boolean(active && mobilePlayMedia?.matches && mobilePlayConsole);
  // Leaving the mobile library search focused can leave iOS/Android in a
  // scrolled, keyboard-height visual viewport just as fixed gameplay starts.
  // Blur only native form inputs; the screen itself is focused without scroll.
  if (enabled) {
    const focused = document.activeElement;
    if (/^(INPUT|TEXTAREA|SELECT)$/i.test(focused?.tagName || "")) focused.blur?.();
  }
  if (!enabled && mobileVaultPanel && !mobileVaultPanel.hidden) closeMobileVaultPanel();
  mobilePlayActive = enabled;
  // In the immersive mobile view FIRE and UP-to-jump must always be available,
  // regardless of an older per-game toggle preference.
  if (typeof configureJump === "function") configureJump(currentJumpGameId);
  mobilePlayConsole?.classList.toggle("is-mobile-playing", enabled);
  document.body?.classList.toggle("is-mobile-playing", enabled);
  if (mobilePlaybar) mobilePlaybar.hidden = !enabled;
  if (mobileGameActions) mobileGameActions.hidden = !enabled;
  if (enabled && typeof setControlState === "function" && typeof vault !== "undefined") {
    setControlState(vault.snapshot());
  }
  if (mobilePlayTitle && enabled) mobilePlayTitle.textContent = label || "C64 GAMEPLAY";
  syncMobileZoom();
  if (!enabled) setMobileKeyboardOpen(false);
  requestAnimationFrame(() => {
    if (enabled && mobilePlayActive) {
      // The fixed console occupies the visual game viewport at the top.
      // Reset any earlier search-results scroll before measuring FIT, without
      // smooth scrolling or focusing the canvas into an arbitrary position.
      window.scrollTo?.({ top: 0, left: 0, behavior: "instant" });
      screen?.focus?.({ preventScroll: true });
    }
    fitScreenToStage();
  });
}

function enterMobilePlayMode(name = "") {
  setMobilePlaying(true, name);
}

function exitMobilePlayMode() {
  setMobilePlaying(false);
  if (document.fullscreenElement && document.exitFullscreen) {
    void document.exitFullscreen().catch(() => {});
  }
  // EXIT GAME stops the current game, but leaves downloaded catalogue, firmware
  // and saved vault slots intact for the next LOAD.
  if (running) powerOff();
  window.scrollTo?.({ top: 0, behavior: "instant" });
}

mobileExitButton?.addEventListener("click", exitMobilePlayMode);
mobileZoomButton?.addEventListener("click", toggleMobileZoom);
syncMobileZoom();
mobileKeyboardToggle?.addEventListener("click", () =>
  setMobileKeyboardOpen(Boolean(mobileKeyboardPanel?.hidden)));
mobileKeyboardClose?.addEventListener("click", () => setMobileKeyboardOpen(false));
mobilePlayMedia?.addEventListener?.("change", () => {
  if (!mobilePlayMedia.matches && mobilePlayActive) setMobilePlaying(false);
});

// Use the real CIA keyboard matrix, including SHIFT and RESTORE. Button presses
// never synthesise DOM KeyboardEvents, so Android/iOS keyboards cannot interrupt
// the joystick; pointer capture supports simultaneous multi-touch keys.
if (mobileKeyboardKeys) {
  for (const rowKeys of mobileKeyRows) {
    const row = document.createElement("div");
    row.className = "ccg-c64-mobile-keyboard-row";
    for (const [label, code] of rowKeys) {
      if (!mobileVirtualBinding(code)) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("data-c64-vkey", code);
      button.setAttribute("aria-label", "C64 " + label);
      row.appendChild(button);
      const release = (event, force = false) => {
        event?.preventDefault?.();
        const held = mobileVirtualHeld.get(button);
        if (!held || (!force && event?.pointerId != null && event.pointerId !== held.pointerId)) return;
        const remaining = MIN_MOBILE_KEY_MS - (performance.now() - held.started);
        if (!force && remaining > 0) {
          if (!held.timer) held.timer = setTimeout(() => release(null, true), remaining);
          return;
        }
        if (held.timer) clearTimeout(held.timer);
        mobileVirtualHeld.delete(button);
        button.classList.remove("is-pressed");
        if (!machine) return;
        if (held.restore) machine.setRestoreNmiLine(false);
        else {
          syncMobileMatrixBit(held.col, held.row);
          if (held.shift) syncMobileMatrixBit(1, 7);
        }
      };
      button.addEventListener("pointerdown", event => {
        event.preventDefault();
        if (!mobilePlayActive || !running || !machine || paused ||
            setup?.hidden === false || mobileVirtualHeld.has(button)) return;
        const binding = mobileVirtualBinding(code);
        const held = { ...binding, started: performance.now(), pointerId: event.pointerId, timer: null };
        mobileVirtualHeld.set(button, held);
        pollGamepad();
        if (held.restore) machine.setRestoreNmiLine(true);
        else {
          if (held.shift) syncMobileMatrixBit(1, 7);
          machine.cia1.setKey(held.col, held.row, true);
        }
        button.classList.add("is-pressed");
        try { button.setPointerCapture?.(event.pointerId); } catch {}
      });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
        button.addEventListener(type, event => release(event));
      }
      button.addEventListener("contextmenu", event => event.preventDefault());
    }
    mobileKeyboardKeys.appendChild(row);
  }
}


// The same searchable game library belongs immediately below the C64 display
// on phones. Keep its original position and all existing listeners on desktop.
const libraryDesktopAnchor = document.createComment("Desktop C64 game library");
if (onlineLibraryPanel?.parentNode) {
  onlineLibraryPanel.parentNode.insertBefore(libraryDesktopAnchor, onlineLibraryPanel);
}
const phoneLibraryLayout = window.matchMedia(
  "(max-width: 760px), (pointer: coarse) and (orientation: landscape) and (max-width: 1100px)"
);
function arrangePhoneLibrary() {
  if (!screenStage || !onlineLibraryPanel || !controlsDeck) return;
  const consolePanel = screenStage.closest(".ccg-c64-console");
  if (phoneLibraryLayout.matches && consolePanel) {
    if (onlineLibraryPanel.parentNode !== consolePanel) {
      screenStage.insertAdjacentElement("afterend", onlineLibraryPanel);
    }
  } else if (libraryDesktopAnchor.parentNode &&
             onlineLibraryPanel.parentNode !== controlsDeck) {
    libraryDesktopAnchor.parentNode.insertBefore(
      onlineLibraryPanel, libraryDesktopAnchor.nextSibling
    );
  }
}
arrangePhoneLibrary();
// Safari versions before MediaQueryList.addEventListener need addListener.
if (typeof phoneLibraryLayout.addEventListener === "function") {
  phoneLibraryLayout.addEventListener("change", arrangePhoneLibrary);
} else if (typeof phoneLibraryLayout.addListener === "function") {
  phoneLibraryLayout.addListener(arrangePhoneLibrary);
}

const PAL_FRAME_MS = 1000 / 50.125;
// Turbo uses all emulation time available in each animation tick, rather than a fixed 4x cap.
// Keep a little time for rendering, real keyboard events and browser accessibility.
const WARP_FRAME_BUDGET_MS = 12;
const WARP_MAX_FRAMES_PER_TICK = 1024;
// After RUN the first loader may still have stages to fetch. Do not mistake
// "RUN typed" for "game ready". These are emulated PAL frames, not wall time.
const AUTO_WARP_POST_RUN_MIN_FRAMES = 300;   // observe six seconds after RUN
const AUTO_WARP_POST_RUN_QUIET_FRAMES = 125; // finish only after 2.5 quiet seconds
const AUTO_WARP_POST_RUN_MAX_FRAMES = 12000; // four-minute safety cap

let machine = null;
let running = false;
let paused = false;
let warpLoadActive = false;
let automaticWarpActive = false;
let automaticWarpFramesRemaining = 0;
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
let currentSessionGame = { gameKey: "session:basic", gameTitle: "C64 BASIC" };
let vaultStatusVersion = 0;
let knownVaultGames = [];
let knownLegacySlots = [];
let vaultListingVersion = 0;
let joystickPort = localStorage.getItem("ccg.emulator.c64.joystickPort") === "1" ? 1 : 2;
let keyboardJoystickEnabled = localStorage.getItem("ccg.emulator.c64.keyboardJoystick") === "1";
const keyboardJoystickKeys = new Set();
const KEYBOARD_JOYSTICK_MASKS = Object.freeze({
  ArrowUp: 1, KeyW: 1, ArrowDown: 2, KeyS: 2,
  ArrowLeft: 4, KeyA: 4, ArrowRight: 8, KeyD: 8,
  Space: 16, ControlLeft: 16, ControlRight: 16,
});
let gamepadJoyByte = 0xFF;
let touchJoyByte = 0xFF;
let touchHeldMask = 0;
const touchHeldButtons = new Map();
const jumpToggle = document.querySelector("[data-jump-toggle]");
const jumpButton = document.querySelector(".ccg-c64-touch-jump");
const actionDeck = document.querySelector(".ccg-c64-touch-actions");
const JUMP_PREF_KEY = "ccg.emulator.c64.jumpProfiles.v1";
// Add entries only when UP-to-jump has been verified for that exact game.
const VERIFIED_JUMP_UP_GAMES = Object.freeze({});
let currentJumpGameId = null;
let jumpEnabled = false;
function readJumpPreferences() {
  try {
    const result = JSON.parse(localStorage.getItem(JUMP_PREF_KEY) || "{}");
    return result && typeof result === "object" && !Array.isArray(result) ? result : {};
  } catch { return {}; }
}
function syncTouchJoystick() {
  touchHeldMask = 0;
  for (const value of touchHeldButtons.values()) touchHeldMask |= value.mask;
  touchJoyByte = 0xFF & ~touchHeldMask;
  // Re-sample physical gamepad alongside each touch edge, not one RAF later.
  pollGamepad();
  applyJoystickInput();
}
function configureJump(gameId) {
  currentJumpGameId = gameId || null;
  const saved = readJumpPreferences();
  jumpEnabled = Boolean(mobilePlayActive && mobilePlayMedia?.matches) ||
    (currentJumpGameId && typeof saved[currentJumpGameId] === "boolean"
      ? saved[currentJumpGameId] : VERIFIED_JUMP_UP_GAMES[currentJumpGameId] === true);
  if (!jumpEnabled && jumpButton) {
    touchHeldButtons.delete(jumpButton);
    syncTouchJoystick();
  }
  if (jumpButton) jumpButton.hidden = !jumpEnabled;
  actionDeck?.classList.toggle("has-jump", jumpEnabled);
  if (jumpToggle) {
    jumpToggle.textContent = `JUMP: ${jumpEnabled ? "ON" : "OFF"}`;
    jumpToggle.setAttribute("aria-pressed", String(jumpEnabled));
  }
}
jumpToggle?.addEventListener("click", () => {
  const next = !jumpEnabled;
  if (currentJumpGameId) {
    const saved = readJumpPreferences();
    saved[currentJumpGameId] = next;
    try { localStorage.setItem(JUMP_PREF_KEY, JSON.stringify(saved)); } catch {}
  }
  if (!currentJumpGameId) {
    jumpEnabled = next;
    if (!next && jumpButton) { touchHeldButtons.delete(jumpButton); syncTouchJoystick(); }
    if (jumpButton) jumpButton.hidden = !next;
    actionDeck?.classList.toggle("has-jump", next);
    if (jumpToggle) { jumpToggle.textContent = `JUMP: ${next ? "ON" : "OFF"}`; jumpToggle.setAttribute("aria-pressed", String(next)); }
  } else configureJump(currentJumpGameId);
});
let pendingMedia = null;
let hostedFirmwareReadyPromise = null;
let onlineLibraryEntries = [];
let visibleLibrarySuggestions = [];
let activeLibrarySuggestionIndex = -1;
let selectedLibraryEntryId = null;
let onlineLibraryLoadingGame = false;
// One automatic launch per emulator navigation; library retries never reboot a game.
let gamePageAutoloadConsumed = false;
const onlineLibraryPackCache = new Map();
let autoStartSteps = null;
let autoStartTypeRest = "";
let autoStartSawBusy = false;
let autoStartBudget = 0;
let autoWarpFrameCount = 0;
let autoWarpPostRunStart = null;
let autoWarpLastActivity = 0;
let autoWarpObservedLoads = 0;
let autoWarpLoadEvents = 0;
let autoWarpTrackedMachine = null;
let autoWarpPreviousLoadTrap = null;
let crtMode = localStorage.getItem("ccg.emulator.c64.crtMode") || "tube";
if (!CRT_MODES.includes(crtMode)) crtMode = "tube";
let displayExpanded = ["2x", "expanded"].includes(localStorage.getItem("ccg.emulator.c64.size"));

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
  const names = { on: "SCANLINES", tube: "TUBE", bw: "B&W", arcade: "ARCADE", hum: "HUM", off: "OFF" };
  if (mobileCrtButton) {
    mobileCrtButton.textContent = "CRT: " + (names[crtMode] || crtMode.toUpperCase());
    mobileCrtButton.setAttribute("aria-label",
      "CRT display " + (names[crtMode] || crtMode) + ". Tap to change effect.");
  }
}

function cycleCrtMode() {
  const index = Math.max(0, CRT_MODES.indexOf(crtMode));
  crtMode = CRT_MODES[(index + 1) % CRT_MODES.length];
  localStorage.setItem("ccg.emulator.c64.crtMode", crtMode);
  applyCrtMode();
}

function fitScreenToStage() {
  if (!screenStage || !screenBezel) return;
  // Use every available pixel in fullscreen regardless of desktop breakpoints.
  // In the page, mobile layouts still size naturally from the canvas ratio.
  if (!(typeof mobilePlayActive !== "undefined" && mobilePlayActive) &&
      document.fullscreenElement !== screenStage &&
      !window.matchMedia?.("(min-width: 960px)")?.matches) {
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
  const bezelWidth = Math.floor(Math.min(availableWidth, availableHeight * ratio));
  screenBezel.style.width = `${Math.max(1, bezelWidth)}px`;
}

function applyScreenSize() {
  workspace?.classList.toggle("is-display-expanded", displayExpanded);
  const strong = sizeButton?.querySelector("strong");
  if (strong) strong.textContent = displayExpanded ? "NORMAL" : "EXPAND";
  sizeButton?.setAttribute("aria-pressed", displayExpanded ? "true" : "false");
  fitScreenToStage();
  // Grid reflow can change the stage dimensions after the synchronous measure.
  requestAnimationFrame(fitScreenToStage);
}

function toggleScreenSize() {
  displayExpanded = !displayExpanded;
  localStorage.setItem("ccg.emulator.c64.size", displayExpanded ? "expanded" : "fit");
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
  if (!machine.sidShared) {
    updateAudioUi("SILENT COMPATIBILITY MODE");
    return false;
  }
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

// iOS Safari normally requires a real screen tap before starting or resuming Web Audio.
// Keep desktop autoplay behaviour, but recover the SID graph on a later gesture.
document.addEventListener("pointerdown", () => {
  if (sidNode && machine?.sidShared && audioContext?.state === "suspended") {
    void audioContext.resume().then(() => updateAudioUi(audioMuted ? "MUTED" : "SID ACTIVE")).catch(() => {});
  }
}, { passive: true });

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
  for (const button of [joystickSwapButton, mobileJoystickSwapButton]) {
    if (!button) continue;
    button.setAttribute("aria-label", `Swap joystick to C64 port ${joystickPort === 2 ? 1 : 2}`);
    button.title = `Currently using C64 joystick port ${joystickPort}. Click to switch to port ${joystickPort === 2 ? 1 : 2}.`;
  }
  if (mobileJoystickSwapButton) {
    mobileJoystickSwapButton.textContent = `SWAP JOYSTICK · PORT ${joystickPort}`;
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
  // Active-low bits are held joystick directions/fire. Combine the live
  // gamepad, touchscreen and optional keyboard-joystick state every frame;
  // physical C64 keyboard keys use the separate CIA matrix without muting
  // a gamepad direction (e.g. run right while SPACE drops a bomb).
  const byte = gamepadJoyByte & touchJoyByte & keyboardJoystickByte();
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
mobileJoystickSwapButton?.addEventListener("click", swapJoystickPort);
keyboardJoystickButton?.addEventListener("click", () => {
  keyboardJoystickEnabled = !keyboardJoystickEnabled;
  keyboardJoystickKeys.clear();
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
  if (vaultSaveButton) vaultSaveButton.disabled = !active ||
    (vaultGameSelect?.value !== "__current__" && vaultGameSelect?.value !== currentSessionGame.gameKey);
  // Restore availability is based on the saved slot, even when C64 power is off.
  // refreshVaultStatus() owns the RESUME SAVE disabled state.
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

// The current game is the one actually loaded, not whatever the visitor has
// typed into the catalogue search field since starting it.
function sessionForMedia(media) {
  if (media?.gameKey && media?.gameTitle) {
    return { gameKey: media.gameKey, gameTitle: media.gameTitle };
  }
  const name = String(media?.name || "C64 BASIC");
  const kind = String(media?.type || mediaTypeFromName(name) || "basic");
  // Same filename can refer to different user-supplied disks. Include a
  // content fingerprint so one local upload cannot replace another's saves.
  const bytes = media?.bytes;
  let hash = 2166136261;
  if (bytes) for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
  const fingerprint = (hash >>> 0).toString(16).padStart(8, "0");
  return {
    gameKey: "local:" + kind + ":" + name.toLowerCase() + ":" + fingerprint,
    gameTitle: name,
  };
}

function vaultSelection() {
  const selected = vaultGameSelect?.value || "__current__";
  if (selected === "__legacy__") return {
    legacy: true, gameKey: "__legacy__", gameTitle: "Original legacy saves",
  };
  if (selected === "__current__") return { ...currentSessionGame, legacy: false };
  const known = knownVaultGames.find((game) => game.gameKey === selected);
  return known
    ? { gameKey: known.gameKey, gameTitle: known.gameTitle, legacy: false }
    : { ...currentSessionGame, legacy: false };
}

async function vaultRecord(selection, slot) {
  return selection.legacy
    ? gameVault.load(slot)
    : gameVault.loadGame(selection.gameKey, slot);
}

function showVaultFeedback(message, error = false) {
  if (!vaultFeedback) return;
  vaultFeedback.textContent = message;
  vaultFeedback.classList.toggle("is-error", Boolean(error));
}

function showVaultConnectionFailure(error) {
  const blocked = error?.name === "GameVaultBlockedError";
  if (vaultStatus) vaultStatus.textContent = blocked
    ? "VAULT BUSY — ANOTHER TAB" : (error?.message || "Game Vault unavailable");
  showVaultFeedback(error?.message || "Game Vault storage unavailable.", true);
  if (vaultStorageNotice) {
    vaultStorageNotice.hidden = false;
    vaultStorageNotice.textContent = blocked
      ? "Another C64 emulator tab is holding the old save database open. Close only the other emulator tabs, then press RETRY VAULT. Your saved games are not deleted. Do not clear browser data."
      : "Game Vault could not open. Check whether your browser permits site storage, then press RETRY VAULT. Do not clear saved site data.";
  }
  if (vaultRetryButton) vaultRetryButton.hidden = false;
  if (vaultExportButton) vaultExportButton.disabled = true;
  if (vaultClearButton) vaultClearButton.disabled = true;
  if (vaultLoadButton) vaultLoadButton.disabled = true;
  if (vaultSaveButton) vaultSaveButton.disabled = true;
}

async function refreshVaultStatus() {
  if (!vaultStatus) return;
  const version = ++vaultStatusVersion;
  const selection = vaultSelection();
  const slot = currentVaultSlot();
  try {
    const record = await vaultRecord(selection, slot);
    if (version !== vaultStatusVersion) return;
    vaultStatus.textContent = record
      ? (selection.gameTitle + " // SLOT " + slot + " SAVED " +
          new Date(record.savedAt).toLocaleString())
      : (selection.gameTitle + " // SLOT " + slot + " EMPTY");
    if (vaultStorageNotice) vaultStorageNotice.hidden = true;
    if (vaultRetryButton) vaultRetryButton.hidden = true;
    if (vaultExportButton) vaultExportButton.disabled = !record;
    if (vaultClearButton) vaultClearButton.disabled = !record;
    if (vaultLoadButton) vaultLoadButton.disabled = !record;
    if (vaultSaveButton) vaultSaveButton.disabled = !running ||
      (vaultGameSelect?.value !== "__current__" &&
       vaultGameSelect?.value !== currentSessionGame.gameKey);
  } catch (error) {
    if (version !== vaultStatusVersion) return;
    showVaultConnectionFailure(error);
  }
}

async function refreshVaultGameList(prefer = null) {
  if (!vaultGameSelect) return;
  const version = ++vaultListingVersion;
  try {
    const [games, legacy] = await Promise.all([
      gameVault.listSavedGames(), gameVault.listLegacySlots(),
    ]);
    if (version !== vaultListingVersion) return;
    knownVaultGames = games;
    knownLegacySlots = legacy;
    const selected = prefer ?? vaultGameSelect.value;
    const currentOption = new Option("CURRENT GAME: " + currentSessionGame.gameTitle, "__current__");
    const options = [currentOption];
    for (const game of games) {
      options.push(new Option(game.gameTitle + " (" +
        Object.keys(game.slots).length + "/3 SLOTS)", game.gameKey));
    }
    // Even empty legacy slots remain selectable for the original restore path.
    options.push(new Option("LEGACY SLOTS (" + legacy.length + " SAVED)", "__legacy__"));
    vaultGameSelect.replaceChildren(...options);
    vaultGameSelect.value = options.some((item) => item.value === selected)
      ? selected : "__current__";
    await refreshVaultStatus();
  } catch (error) {
    if (version === vaultListingVersion) showVaultConnectionFailure(error);
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
// Buttons hold genuine CIA1 matrix keys; never synthesise browser KeyboardEvents.
const touchFunctionKeyHolds = new Map();
let shiftLeftPhysical = false;
let shiftRightPhysical = false;
let gamepadConnected = false;

function setC64Shift(left, right) {
  if (!machine) return;
  machine.cia1.setKey(1, 7, Boolean(left));
  machine.cia1.setKey(6, 4, Boolean(right));
}

// Form focus releases held C64 keys, not gamepad or touch joystick directions.
// Clearing those controller bytes while a key is pressed causes a perceptible
// one-frame movement dropout until requestAnimationFrame polls again.
function releaseKeyboardInput() {
  for (const [button, held] of touchFunctionKeyHolds) {
    if (held.timer) clearTimeout(held.timer);
    button.classList.remove("is-pressed");
    machine?.cia1.setKey(held.col, held.row, false);
  }
  touchFunctionKeyHolds.clear();
  if (machine) {
    for (const held of heldMatrixKeys.values()) {
      machine.cia1.setKey(held.col, held.row, false);
    }
    setC64Shift(false, false);
    machine.cia1.setKey(7, 2, false);
    machine.setRestoreNmiLine(false);
  }
  heldMatrixKeys.clear();
  keyboardJoystickKeys.clear();
  shiftLeftPhysical = false;
  shiftRightPhysical = false;
  if (typeof releaseMobileVirtualKeys === "function") releaseMobileVirtualKeys();
  applyJoystickInput();
}

function releaseAllInput() {
  releaseKeyboardInput();
  if (machine) {
    machine.joyPort1 = 0xFF;
    gamepadJoyByte = 0xFF;
    touchJoyByte = 0xFF;
    touchHeldMask = 0;
    touchHeldButtons.clear();
    machine.joyPort2 = 0xFF;
    machine._updateLightpen?.();
  }
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
  // If the same C64 key is also held on the touchscreen, leave it pressed.
  if (![...touchFunctionKeyHolds.values()].some(held =>
      held.col === binding.col && held.row === binding.row)) {
    machine.cia1.setKey(binding.col, binding.row, false);
  }
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
  // Sample the current pad on the SAME event turn as every physical key edge:
  // a keyboard press/release must never leave stale joystick data waiting for
  // the next animation frame, even when gameplay combines SPACE with motion.
  pollGamepad();

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

  // F1-F8 are all C64 keys: F2/F4/F6/F8 are their shifted counterparts.
  // Chrome otherwise consumes F3 (find), F5 (reload), F6 (address bar)
  // and F7 (caret browsing) before games can use them.
  if (!event.ctrlKey && !event.altKey && /^F[1-8]$/.test(event.code)) {
    event.preventDefault();
  }

  // Physical C64 keys always reach the CIA matrix. If keyboard joystick
  // mode is enabled, selected keys also add joystick bits; they must never
  // suppress an independently held gamepad/touch direction.
  const joystickMask = KEYBOARD_JOYSTICK_MASKS[event.code];
  if (joystickMask && keyboardJoystickEnabled) {
    if (pressed) keyboardJoystickKeys.add(event.code);
    else keyboardJoystickKeys.delete(event.code);
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
  const canBoot = snapshot.allRequiredReady;
  if (powerButton) powerButton.disabled = !canBoot;
  if (resetButton) resetButton.disabled = !running;
  if (pauseButton) pauseButton.disabled = !running;
  if (warpLoadButton) {
    warpLoadButton.disabled = !running || paused;
    warpLoadButton.setAttribute("aria-pressed", warpLoadActive ? "true" : "false");
    const strong = warpLoadButton.querySelector("strong");
    if (strong) strong.textContent = warpLoadActive ? "ON · MAX" : "MAX";
  }
  if (mobileWarpLoadButton) {
    mobileWarpLoadButton.disabled = !running || paused;
    mobileWarpLoadButton.setAttribute("aria-pressed", warpLoadActive ? "true" : "false");
    mobileWarpLoadButton.textContent = warpLoadActive ? "WARP: ON" : "WARP: OFF";
    mobileWarpLoadButton.setAttribute("aria-label", warpLoadActive
      ? "Turn off warp load and return to normal C64 speed"
      : "Turn on warp load at maximum C64 speed");
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
  if (typeof mobilePauseButton !== "undefined" && mobilePauseButton) {
    mobilePauseButton.disabled = !running;
    mobilePauseButton.textContent = paused ? "▶ RESUME" : "Ⅱ PAUSE";
    mobilePauseButton.setAttribute("aria-pressed", String(paused));
  }
  if (typeof mobileSaveStateButton !== "undefined" && mobileSaveStateButton) mobileSaveStateButton.disabled = !running;
  if (typeof mobileLoadStateButton !== "undefined" && mobileLoadStateButton) mobileLoadStateButton.disabled = !running;
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
  if (romExportButton) romExportButton.disabled = !snapshot.allRequiredReady;

  if (!running && machineState) {
    if (snapshot.allRequiredReady && !window.crossOriginIsolated) {
      machineState.textContent = "ROM BANK READY // SILENT COMPATIBILITY MODE";
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

function finishAutomaticWarp() {
  automaticWarpFramesRemaining = 0;
  if (!automaticWarpActive) return;
  automaticWarpActive = false;
  if (warpLoadActive) setWarpLoad(false);
}

function beginAutomaticWarp(frames = 0) {
  automaticWarpActive = true;
  automaticWarpFramesRemaining = frames;
  setWarpLoad(true);
}

function cancelAutoStart() {
  autoStartSteps = null;
  autoStartTypeRest = "";
  autoStartSawBusy = false;
  autoStartBudget = 0;
  // Remove only our own load watcher. Do not modify the machine's original
  // callback, or leave a callback attached to an abandoned machine.
  if (autoWarpTrackedMachine) {
    autoWarpTrackedMachine.onLoadTrap = autoWarpPreviousLoadTrap;
  }
  autoWarpTrackedMachine = null;
  autoWarpPreviousLoadTrap = null;
  autoWarpPostRunStart = null;
  autoWarpLoadEvents = 0;
  finishAutomaticWarp();
  if (typeof playHelp !== "undefined") playHelp?.classList.remove("is-loading");
  if (typeof warpHint !== "undefined" && warpHint) warpHint.textContent = "WARP speeds up loading. Switch it off to return to normal speed.";
}

function queueAutoStart(steps) {
  cancelAutoStart();
  autoStartSteps = steps.slice();
  autoStartTypeRest = "";
  autoStartSawBusy = false;
  autoStartBudget = 10 * 60 * 60;
  autoWarpFrameCount = 0;
  autoWarpPostRunStart = null;
  autoWarpObservedLoads = 0;
  if (machine && steps.some(step => step.postRun === "disk")) {
    autoWarpTrackedMachine = machine;
    autoWarpPreviousLoadTrap = machine.onLoadTrap;
    const previous = autoWarpPreviousLoadTrap;
    machine.onLoadTrap = (...args) => {
      autoWarpLoadEvents++;
      if (typeof previous === "function") previous(...args);
    };
  }
  beginAutomaticWarp();
  if (typeof playHelp !== "undefined") playHelp?.classList.add("is-loading");
  if (typeof warpHint !== "undefined" && warpHint) warpHint.textContent = "Game starting — WARP speeds up longer loads. Audio pauses during warp.";
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
    // Fast virtual disks can finish between consecutive auto-start ticks.
    // Their KERNAL load event is observed, but BASIC's brief busy interval
    // can be missed. Accept that completed LOAD handshake once READY returns;
    // slower disk/tape loads still take the existing busy-then-ready path.
    if (!basicReady()) autoStartSawBusy = true;
    if (basicReady() && (autoStartSawBusy || autoWarpLoadEvents > 0)) {
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
  } else if (step.postRun) {
    // BASIC returning from LOAD is only the *first* stage. RUN often starts
    // another loader. Observe live drive/tape activity before ending warp.
    if (autoWarpPostRunStart === null) {
      autoWarpPostRunStart = autoWarpFrameCount;
      autoWarpLastActivity = autoWarpFrameCount;
      autoWarpObservedLoads = autoWarpLoadEvents;
    }
    let loading = false;
    if (autoWarpObservedLoads !== autoWarpLoadEvents) {
      autoWarpObservedLoads = autoWarpLoadEvents;
      loading = true;
    }
    if (step.postRun === "disk" && machine.truedriveEnabled && machine.drive1541) {
      // Idle 1541 firmware is not a reason to prolong warp, even if the game
      // itself continues executing. Active IEC/drive traffic keeps it on.
      loading = loading || !machine.drive1541.canIdleSkip();
    }
    if (step.postRun === "tape" && machine.datasette) {
      loading = loading || (machine.datasette.motorOn &&
        machine.datasette.playPressed && !machine.datasette.atEnd);
    }
    if (loading) autoWarpLastActivity = autoWarpFrameCount;
    const elapsed = autoWarpFrameCount - autoWarpPostRunStart;
    const quiet = autoWarpFrameCount - autoWarpLastActivity;
    if (elapsed >= AUTO_WARP_POST_RUN_MAX_FRAMES) {
      autoStartSteps.shift();
      if (stageNote) stageNote.textContent =
        "Auto Warp reached its safety limit. If the game is still loading, use MAX to continue.";
    } else if (elapsed >= AUTO_WARP_POST_RUN_MIN_FRAMES &&
        quiet >= AUTO_WARP_POST_RUN_QUIET_FRAMES) {
      autoStartSteps.shift();
      if (stageNote) stageNote.textContent =
        "Auto Warp stopped after loading activity settled. If the game needs more loading, use MAX.";
    }
  } else {
    autoStartSteps.shift();
  }

  if (autoStartSteps && autoStartSteps.length === 0) cancelAutoStart();
}

// A fresh game must not inherit a previous disk, tape or cartridge.
// Keep verified firmware, the downloaded pack cache and Game Vault slots.
function clearMountedGameMedia() {
  mountedDisk = null;
  mountedDiskKey = null;
  diskSideCache.clear();
  mountedTape = null;
  mountedCartridge = null;
  currentSessionGame = { gameKey: "session:basic", gameTitle: "C64 BASIC" };
  driveMode = "fast";
  localStorage.setItem("ccg.emulator.c64.driveMode", driveMode);
  if (diskSlotStatus) diskSlotStatus.textContent = "D64 / D71 / D81 / G64";
  if (tapeSlotStatus) tapeSlotStatus.textContent = "TAP / T64";
  if (cartridgeSlotStatus) cartridgeSlotStatus.textContent = "CRT / EASYFLASH";
}

async function prepareFreshGameSession() {
  if (!machine || !running) return;
  cancelAutoStart();
  releaseAllInput();
  clearMountedGameMedia();

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
        if (autoStartSteps) autoWarpFrameCount++;
        if (autoStartSteps && (frames & 3) === 0) serviceAutoStart();
        if (automaticWarpActive && automaticWarpFramesRemaining > 0 &&
            --automaticWarpFramesRemaining === 0) finishAutomaticWarp();
      } while (warpLoadActive && frames < WARP_MAX_FRAMES_PER_TICK &&
        performance.now() - start < WARP_FRAME_BUDGET_MS);
      if (autoStartSteps) serviceAutoStart();
      frameAccumulator = 0;
    } else {
      frameAccumulator += delta;
      while (frameAccumulator >= PAL_FRAME_MS) {
        machine.runFrame();
        if (autoStartSteps) autoWarpFrameCount++;
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
  if (typeof setMobilePlaying === "function") setMobilePlaying(false);
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
    if (stageNote) stageNote.textContent = "Boot could not start: " + (error?.message || "Unknown emulator error") + ". Reload the page and try again.";
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
  // A manual click overrides automatic loading; don't switch the user's
  // chosen speed again when the remaining LOAD/RUN steps finish.
  automaticWarpActive = false;
  automaticWarpFramesRemaining = 0;
  setWarpLoad(!warpLoadActive);
}

function togglePause() {
  if (!machine || !running) return;
  paused = !paused;
  if (paused) {
    finishAutomaticWarp();
    warpLoadActive = false;
  }
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

// Download the ROM set locally on the user's own machine; no upload to CCG.
romExportButton?.addEventListener("click", () => {
  try {
    const payload = JSON.stringify(vault.exportBundle());
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "CCG-C64-My-ROM-Set.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    if (romTransferStatus) romTransferStatus.textContent =
      "ROM set saved to your device. Transfer the file privately to your phone.";
  } catch (error) {
    if (romTransferStatus) romTransferStatus.textContent =
      error?.message || "The installed ROM set could not be saved.";
  }
});

romImportInput?.addEventListener("change", async () => {
  const file = romImportInput.files?.[0];
  romImportInput.value = "";
  if (!file) return;
  try {
    if (file.size > 200000) throw new Error("That ROM transfer file is unexpectedly large.");
    const bundle = JSON.parse(await file.text());
    const snapshot = vault.importBundle(bundle);
    render(snapshot);
    if (romTransferStatus) romTransferStatus.textContent =
      "ROM transfer accepted: KERNAL, BASIC and CHARGEN are now stored on this device.";
    if (pendingMedia) {
      finishSetup?.click();
    } else {
      hideSetup();
      if (!running) await powerOn();
    }
  } catch (error) {
    if (romTransferStatus) romTransferStatus.textContent =
      error?.message || "The ROM set could not be imported.";
  }
});

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
        if (await openMediaBytes(media)) {
          currentSessionGame = sessionForMedia(media);
          void refreshVaultGameList("__current__");
        }
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
mobilePauseButton?.addEventListener("click", () => {
  if (!mobilePlayActive || !running || (mobileVaultPanel && !mobileVaultPanel.hidden)) return;
  togglePause();
  screen?.focus?.({ preventScroll: true });
});
mobileCrtButton?.addEventListener("click", () => {
  if (!mobilePlayActive) return;
  cycleCrtMode();
  screen?.focus?.({ preventScroll: true });
});
mobileSaveStateButton?.addEventListener("click", () => { void openMobileVault("save"); });
mobileLoadStateButton?.addEventListener("click", () => { void openMobileVault("load"); });
mobileVaultClose?.addEventListener("click", () => closeMobileVaultPanel());
mobileVaultPanel?.addEventListener("click", event => {
  if (event.target === mobileVaultPanel) closeMobileVaultPanel();
});
warpLoadButton?.addEventListener("click", () => { toggleWarpLoad(); screen?.focus(); });
mobileWarpLoadButton?.addEventListener("click", () => { toggleWarpLoad(); screen?.focus(); });
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
      { postRun: "disk" },
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
      { postRun: "tape" },
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
    if (stageNote) stageNote.textContent = "Cartridge inserted. Booting at maximum warp speed for four emulated seconds, then returning to normal timing.";
    beginAutomaticWarp(200);
    updateMediaControls(vault.snapshot());
    screen?.focus();
    return true;
  }

  return false;
}

async function queueMedia(media, { freshBoot = false } = {}) {
  // LOAD must wait if a first-time visitor is still receiving the verified
  // original firmware. The chosen game is only queued after it has finished.
  if (typeof hostedFirmwareReadyPromise !== "undefined" && hostedFirmwareReadyPromise) {
    await hostedFirmwareReadyPromise;
  }
  if (!media?.bytes?.length) throw new Error("The selected media file is empty.");
  const type = media.type || mediaTypeFromName(media.name);
  if (!type) throw new Error("Use PRG, D64, D71, D81, G64, TAP, T64 or CRT media.");

  pendingMedia = {
    name: media.name || `media.${type}`,
    type,
    bytes: media.bytes instanceof Uint8Array ? media.bytes.slice() : new Uint8Array(media.bytes),
    sourceKey: media.sourceKey || null,
    gameKey: media.gameKey || null,
    gameTitle: media.gameTitle || null,
  };

  if (!vault.snapshot().allRequiredReady) {
    if (stageNote) stageNote.textContent = `${pendingMedia.name} is ready. Add the three C64 system ROMs once, then it will start automatically.`;
    showSetup();
    return false;
  }

  const wasRunning = running;
  // EXIT GAME powers off the machine but intentionally retains mounted media.
  // Remove that media BEFORE powerOn() reattaches it to the new C64 instance.
  // Otherwise a previous CRT can boot again instead of the selected PRG/D64.
  if (freshBoot && !wasRunning) clearMountedGameMedia();
  if (!running) await powerOn();
  if (!running || !machine) return false;
  if (freshBoot && wasRunning) await prepareFreshGameSession();

  const queued = pendingMedia;
  pendingMedia = null;
  try {
    const loaded = await openMediaBytes(queued);
    if (loaded) {
      currentSessionGame = sessionForMedia(queued);
      void refreshVaultGameList("__current__");
    }
    if (loaded && typeof enterMobilePlayMode === "function") enterMobilePlayMode(queued.name);
    return loaded;
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

// Selecting a search result never mounts or starts media. Loading is a
// separate explicit action, so the player can verify the chosen title first.
function updateSelectedLibraryGame() {
  const selected = onlineLibraryEntries.find((item) => item.id === selectedLibraryEntryId);
  if (onlineLibraryLoadButton) {
    onlineLibraryLoadButton.hidden = !selected;
    onlineLibraryLoadButton.disabled = !selected || onlineLibraryLoadingGame;
    onlineLibraryLoadButton.textContent = onlineLibraryLoadingGame ? "LOADING..." : "LOAD";
  }
  if (selected && onlineLibraryCount) {
    onlineLibraryCount.textContent =
      `SELECTED: ${selected.title} (${String(selected.format).toUpperCase()})`;
  }
}

function selectOnlineLibraryEntry(id, focusLoadButton = true) {
  if (onlineLibraryLoadingGame) return;
  const entry = onlineLibraryEntries.find((item) => item.id === id);
  if (!entry) return;
  selectedLibraryEntryId = entry.id;
  onlineLibrarySearch.value = entry.title;
  refreshOnlineLibrarySuggestions();
  setLibrarySuggestionsOpen(false);
  updateSelectedLibraryGame();
  // iOS touch selection must not programmatically scroll/focus the button
  // during Safari's keyboard-dismissal and visual-viewport transition.
  if (focusLoadButton) onlineLibraryLoadButton?.focus();
}

function setLibrarySuggestionsOpen(open) {
  const show = Boolean(open && !onlineLibraryLoadingGame &&
    onlineLibraryEntries.length && onlineLibrarySearch?.value.trim());
  if (onlineLibrarySuggestions) onlineLibrarySuggestions.hidden = !show;
  if (onlineLibrarySearch) onlineLibrarySearch.setAttribute("aria-expanded", String(show));
  onlineLibraryPanel?.classList.toggle("is-suggesting", show);
  if (!show) {
    activeLibrarySuggestionIndex = -1;
    onlineLibrarySearch?.removeAttribute("aria-activedescendant");
  }
}

function setActiveLibrarySuggestion(index) {
  if (!visibleLibrarySuggestions.length) return;
  activeLibrarySuggestionIndex =
    Math.max(0, Math.min(index, visibleLibrarySuggestions.length - 1));
  const options = onlineLibraryGrid?.querySelectorAll("[data-play-game]") || [];
  for (let i = 0; i < options.length; i += 1) {
    const active = i === activeLibrarySuggestionIndex;
    options[i].setAttribute("aria-selected", String(active));
    options[i].classList.toggle("is-active", active);
    if (active) {
      onlineLibrarySearch?.setAttribute("aria-activedescendant", options[i].id);
      options[i].scrollIntoView?.({ block: "nearest" });
    }
  }
}

function refreshOnlineLibrarySuggestions({ open = false } = {}) {
  if (!onlineLibraryGrid || !onlineLibrarySearch) return;
  const query = onlineLibrarySearch.value.trim();
  const filtered = suggestCatalogGames(onlineLibraryEntries, query, 8);
  visibleLibrarySuggestions = filtered.games;
  activeLibrarySuggestionIndex = -1;
  onlineLibrarySearch.removeAttribute("aria-activedescendant");
  onlineLibraryGrid.replaceChildren();

  if (!query) {
    if (onlineLibraryCount) onlineLibraryCount.textContent =
      "Type a title, then select a game.";
    setLibrarySuggestionsOpen(false);
    return;
  }

  for (let i = 0; i < filtered.games.length; i += 1) {
    const entry = filtered.games[i];
    const option = document.createElement("button");
    option.type = "button";
    option.id = `ccg-c64-game-suggestion-${i}`;
    option.className = "ccg-c64-library-option";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.dataset.playGame = entry.id;
    option.disabled = onlineLibraryLoadingGame;

    const title = document.createElement("strong");
    title.textContent = entry.title;
    const format = document.createElement("span");
    format.textContent = String(entry.format).toUpperCase();
    option.append(title, format);
    onlineLibraryGrid.append(option);
  }

  if (!filtered.total) {
    const noResults = document.createElement("p");
    noResults.className = "ccg-c64-library-no-results";
    noResults.textContent = "No matching games. Try another title.";
    onlineLibraryGrid.append(noResults);
  }

  if (onlineLibraryMatchCount) onlineLibraryMatchCount.textContent =
    filtered.total > filtered.games.length
      ? `SHOWING ${filtered.games.length} OF ${filtered.total} MATCHES — KEEP TYPING`
      : `${filtered.total} MATCH${filtered.total === 1 ? "" : "ES"}`;
  if (onlineLibraryCount) onlineLibraryCount.textContent =
    filtered.total
      ? "Select a game, then click LOAD."
      : "No matches for that title.";

  setLibrarySuggestionsOpen(open);
}

async function initialiseOnlineLibrary() {
  if (!onlineLibraryGrid || !onlineLibraryStatus || !onlineLibrarySearch) return;
  onlineLibraryStatus.textContent = "SCANNING";

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

  // The extra CRT catalogue contains only owner-authorised, exact-title
  // replacement media. Its absence or corruption must NEVER hide original
  // PRG/disk entries. Each CRT's bytes are SHA-256 verified on selection.
  try {
    const crtResponse = await fetch(ADDITIONAL_CRT_CATALOG_URL, {
      cache: "no-store", credentials: "same-origin",
    });
    if (crtResponse.ok) {
      const extra = parseAdditionalCrtCatalog(await crtResponse.json());
      regular = regular.concat(extra);
    } else if (crtResponse.status !== 404) {
      throw new Error(`CRT catalogue HTTP ${crtResponse.status}`);
    }
  } catch (error) {
    console.warn("[ccg-c64] Extra CRT catalogue unavailable; original games preserved:", error);
  }

  let packed = [];
  let packedCatalogueError = null;
  try {
    const response = await fetch(PACK_CATALOG_URL, {
      cache: "no-store", credentials: "same-origin",
    });
    if (!response.ok) throw new Error(`Blast catalogue HTTP ${response.status}`);
    const data = parsePackedCatalog(await response.json());
    // Do not make the entire 1,878-title library depend on eleven simultaneous
    // HEAD requests. Some hosts/CDNs reject HEAD or report transformed lengths
    // even while a normal GET succeeds. The catalogue is already validated at
    // publication, and EACH downloaded pack and PRG is independently SHA-256
    // checked by loadPackedGameBytes before it can reach the emulator.
    const directGameKeys = new Set(regular.map((entry) =>
      `${entry.title.trim().toLocaleLowerCase()}|${String(entry.format).toLowerCase()}`));
    // The old packed Bruce Lee PRG shows a non-responsive F-key menu in our
    // emulator. The owner-supplied Bruce Lee Trilogy CRT already exists as an
    // identical SHA-256 checked direct-file entry, so show only that version.
    // Keep pack bytes and checksums untouched for every other title.
    packed = data.entries.filter((entry) =>
      entry.title.trim().toLocaleLowerCase() !== "bruce lee" &&
      !directGameKeys.has(`${entry.title.trim().toLocaleLowerCase()}|${entry.format}`));
  } catch (error) {
    packedCatalogueError = error;
    // Do not silently report only "5 READY" with no indication that the
    // additional C64 games failed to appear.
    console.warn("[ccg-c64] Blast catalogue unavailable:", error);
  }

  // The owner's optional PRG archive is activated only after all pack files
  // have been uploaded and the SHA-bound ready.json marker is published LAST.
  // An absent marker is normal: the existing Blast/direct libraries keep working.
  let archived = [];
  let archiveError = null;
  try {
    const readyResponse = await fetch(ARCHIVE_READY_URL, {
      cache: "no-store", credentials: "same-origin",
    });
    if (readyResponse.ok) {
      const ready = await readyResponse.json();
      if (ready?.version !== 1 || !Number.isInteger(ready.recordCount) ||
          !Number.isInteger(ready.packCount) || ready.recordCount < 1 ||
          ready.packCount < 1 || !/^[a-f0-9]{64}$/i.test(ready.catalogSHA256 || "")) {
        throw new Error("Invalid PRG archive activation marker.");
      }
      const archiveResponse = await fetch(ARCHIVE_CATALOG_URL, {
        cache: "no-store", credentials: "same-origin",
      });
      if (!archiveResponse.ok) {
        throw new Error(`PRG archive catalogue HTTP ${archiveResponse.status}`);
      }
      const catalogueText = await archiveResponse.text();
      if (!globalThis.crypto?.subtle) {
        throw new Error("Secure hashing is required for this PRG archive.");
      }
      const catalogueDigest = await crypto.subtle.digest(
        "SHA-256", new TextEncoder().encode(catalogueText));
      const catalogueSHA = Array.from(new Uint8Array(catalogueDigest),
        byte => byte.toString(16).padStart(2, "0")).join("");
      if (catalogueSHA !== ready.catalogSHA256.toLowerCase()) {
        throw new Error("PRG archive catalogue did not match the activation marker.");
      }
      const parsedArchive = parsePackedCatalog(
        JSON.parse(catalogueText), { packRoot: ARCHIVE_PACK_ROOT });
      if (parsedArchive.entries.length !== ready.recordCount ||
          parsedArchive.packs.length !== ready.packCount) {
        throw new Error("PRG archive record or pack counts do not match.");
      }
      const alreadyListed = new Set([...regular, ...packed].map((entry) =>
        `${entry.title.trim().toLocaleLowerCase()}|${String(entry.format).toLowerCase()}`));
      // The standalone Bruce Lee PRG remains deliberately withheld: the
      // existing tested Trilogy CRT is the supported option on all devices.
      archived = parsedArchive.entries.filter((entry) =>
        entry.title.trim().toLocaleLowerCase() !== "bruce lee" &&
        !alreadyListed.has(`${entry.title.trim().toLocaleLowerCase()}|${entry.format}`));
    } else if (readyResponse.status !== 404) {
      throw new Error(`PRG archive activation HTTP ${readyResponse.status}`);
    }
  } catch (error) {
    archiveError = error;
    console.warn("[ccg-c64] Optional PRG archive unavailable:", error);
  }

  // A single visible title index. Preserve the underlying media and previous
  // IDs for old bookmarks, but show only the approved CRT-first winner.
  onlineLibraryEntries = [...regular, ...packed, ...archived];
  const allHostedEntries = onlineLibraryEntries;
  onlineLibraryEntries = preferSelectedCartridges(allHostedEntries);
  // Only a game-page button with autoplay=1 starts the matched catalogue entry.
  // Ordinary emulator searches and legacy ?game= links still require LOAD.
  let linkedGameId = "";
  let linkedGameAutoplay = false;
  try {
    const deepLink = new URLSearchParams(window.location.search);
    linkedGameId = deepLink.get("game") || "";
    linkedGameAutoplay = deepLink.get("autoplay") === "1";
  } catch (_) { /* Invalid URL query is ignored. */ }
  // Existing game pages still use some older BLAST/PRG IDs. Resolve the
  // bookmark to the selected CRT without changing unrelated game pages.
  const validLinkedId = /^[a-z0-9][a-z0-9-]{0,100}$/.test(linkedGameId);
  const linkedOriginal = validLinkedId
    ? allHostedEntries.find(entry => entry.id === linkedGameId) : null;
  // Preserve bookmarks to directly hosted D64s retired after the matching
  // owner-selected CRT was installed. These IDs no longer occur in the
  // direct library, so they need an explicit, reviewed identity mapping.
  const retiredDirectAliases = {
    "forbidden-forest": "Forbidden Forest",
    "paradroid": "Paradroid",
    "slicks": "Slicks",
    "uridium": "Uridium",
    "rodland": "Rodland",
    "racing-destruction-set": "Racing Destruction Set",
    "katakis": "Katakis",
    "bomberland": "Bomberland",
  };
  const retiredTitle = Object.hasOwn(retiredDirectAliases, linkedGameId)
    ? retiredDirectAliases[linkedGameId] : "";
  let linkedGame = validLinkedId
    ? (onlineLibraryEntries.find(entry => entry.id === linkedGameId) ||
       (linkedOriginal && onlineLibraryEntries.find(entry =>
         catalogGameIdentity(entry.title) === catalogGameIdentity(linkedOriginal.title))) ||
       (retiredTitle && onlineLibraryEntries.find(entry =>
         entry.format === "crt" &&
         catalogGameIdentity(entry.title) === catalogGameIdentity(retiredTitle))))
    : null;
  // Packed PRG IDs are stable bookmarks. After retiring an exact-title PRG,
  // request the small SHA-audited retirement map ONLY for an unresolved legacy
  // deep link. Never fetch this extra asset on ordinary library browsing.
  if (!linkedGame && validLinkedId &&
      /^(?:blast-\\d{4}|archive-\\d{5})$/.test(linkedGameId)) {
    const source = linkedGameId.startsWith("blast-") ? "blast" : "prg-archive";
    try {
      const response = await fetch("/emulator/c64/media/" + source + "/retired-ids.json",
        { credentials: "same-origin", cache: "no-store" });
      if (response.ok) {
        const aliasData = await response.json();
        if (aliasData && aliasData.version === 1 && aliasData.source === source &&
            Number.isSafeInteger(aliasData.recordCount) &&
            aliasData.recordCount >= 0 && aliasData.recordCount <= 12000 &&
            aliasData.mappings && typeof aliasData.mappings === "object" &&
            !Array.isArray(aliasData.mappings) &&
            Object.hasOwn(aliasData.mappings, linkedGameId)) {
          const replacementId = aliasData.mappings[linkedGameId];
          if (/^owner-crt-more-[a-z0-9-]+$/.test(replacementId)) {
            linkedGame = onlineLibraryEntries.find(entry =>
              entry.id === replacementId && entry.format === "crt" &&
              entry.approved !== false) || null;
          }
        }
      }
    } catch (_) { /* A missing alias must not affect ordinary game loading. */ }
  }
  if (onlineLibraryPanel) onlineLibraryPanel.hidden = onlineLibraryEntries.length === 0;
  controlsDeck?.classList.toggle("has-online-library", onlineLibraryEntries.length > 0);
  const unavailable = [];
  if (packedCatalogueError) unavailable.push("BLAST UNAVAILABLE");
  if (archiveError) unavailable.push("ARCHIVE UNAVAILABLE");
  onlineLibraryStatus.textContent = unavailable.length
    ? `${onlineLibraryEntries.length.toLocaleString("en-GB")} READY · ${unavailable.join(" · ")}`
    : onlineLibraryEntries.length
      ? `${onlineLibraryEntries.length.toLocaleString("en-GB")} READY` : "EMPTY";
  refreshOnlineLibrarySuggestions();
  if (linkedGame) {
    selectOnlineLibraryEntry(linkedGame.id, false);
    if (stageNote) stageNote.textContent = linkedGameAutoplay
      ? `Starting ${linkedGame.title} automatically in the CCG C64 emulator...`
      : `Selected ${linkedGame.title} in the CCG C64 library. Press LOAD to play.`;
  }
  if ((packedCatalogueError || archiveError) && onlineLibraryCount) {
    onlineLibraryCount.textContent =
      "Some additional games are unavailable. Check connection and retry.";
  }
  if (onlineLibraryRetryButton) onlineLibraryRetryButton.hidden =
    !(packedCatalogueError || archiveError);
  updateSelectedLibraryGame();
  if (typeof catalogueBrowser !== "undefined") catalogueBrowser?.refresh();
  if (linkedGame && linkedGameAutoplay && !gamePageAutoloadConsumed) {
    // Use the same SHA-verified media path and firmware gate as a manual LOAD.
    // Consume before invoking: a retry cannot start this game a second time.
    gamePageAutoloadConsumed = true;
    void loadSelectedLibraryEntry();
  }
}

async function loadSelectedLibraryEntry() {
  if (onlineLibraryLoadingGame || !selectedLibraryEntryId) return;
  const entry = onlineLibraryEntries.find((item) => item.id === selectedLibraryEntryId);
  if (!entry) return;
  setLibrarySuggestionsOpen(false);
  onlineLibraryLoadingGame = true;
  if (onlineLibraryStatus) onlineLibraryStatus.textContent = "LOADING GAME";
  refreshOnlineLibrarySuggestions();
  updateSelectedLibraryGame();

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
      // Public CRT replacements are integrity-bound before the emulator sees
      // them. A corrupt or stale CDN response must never boot as the chosen
      // cartridge while the original PRG/disk archives remain intact.
      if (String(entry.format).toLowerCase() === "crt") {
        if (!/^[a-f0-9]{64}$/i.test(entry.sha256 || "") ||
            !Number.isSafeInteger(entry.bytes) || bytes.length !== entry.bytes) {
          throw new Error("Cartridge file size or catalogue metadata mismatch.");
        }
        if (!globalThis.crypto?.subtle) {
          throw new Error("Secure hashing is required for cartridge integrity.");
        }
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const hex = Array.from(new Uint8Array(digest), byte =>
          byte.toString(16).padStart(2, "0")).join("");
        if (hex !== entry.sha256.toLowerCase()) {
          throw new Error("Cartridge SHA-256 mismatch. The original game files remain preserved.");
        }
      }
    }

    const type = String(entry.format).toLowerCase();
    const filename = entry.filename || `${entry.title.replace(/[^a-z0-9._-]+/gi, "-") || "ccg-game"}.${type}`;
    const firstKey = ["d64", "d71", "d81", "g64"].includes(type)
      ? `library:${entry.id}:0` : null;
    activeLibraryEntryId = entry.id;
    configureJump(entry.id);
    activeLibraryDiskIndex = 0;
    const queued = await queueMedia({
      name: filename, type, bytes, sourceKey: firstKey,
      gameKey: "library:" + entry.id, gameTitle: entry.title,
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
    refreshOnlineLibrarySuggestions();
    updateSelectedLibraryGame();
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

window.addEventListener("keydown", (event) => handleC64Key(event, true), { capture: true });
window.addEventListener("keyup", (event) => handleC64Key(event, false), { capture: true });
window.addEventListener("blur", releaseAllInput);
document.addEventListener("focusin", (event) => {
  if (running && usesNativeKeyboard(event.target)) releaseKeyboardInput();
});
window.addEventListener("gamepadconnected", pollGamepad);
window.addEventListener("gamepaddisconnected", pollGamepad);

document.addEventListener("visibilitychange", () => {
  if (!running) return;
  if (document.hidden) {
    setAudioPaused(true);
    return;
  }
  lastFrameTime = 0;
  frameAccumulator = 0;
  if (!paused) setAudioPaused(warpLoadActive);
});

document.addEventListener("fullscreenchange", () => {
  fitScreenToStage();
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

onlineLibraryRetryButton?.addEventListener("click", () => { void initialiseOnlineLibrary(); });
onlineLibrarySearch?.addEventListener("input", () => {
  // Any edit invalidates the previous choice. The LOAD GAME button must not
  // accidentally start an old selection when the visible query has changed.
  selectedLibraryEntryId = null;
  refreshOnlineLibrarySuggestions({ open: true });
  updateSelectedLibraryGame();
});
onlineLibrarySearch?.addEventListener("focus", () => {
  refreshOnlineLibrarySuggestions({ open: true });
});
onlineLibrarySearch?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (onlineLibrarySuggestions && !onlineLibrarySuggestions.hidden) {
      event.preventDefault();
      setLibrarySuggestionsOpen(false);
    }
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if (!onlineLibrarySearch.value.trim() || onlineLibraryLoadingGame) return;
    event.preventDefault();
    if (onlineLibrarySuggestions?.hidden) refreshOnlineLibrarySuggestions({ open: true });
    if (visibleLibrarySuggestions.length) {
      const last = visibleLibrarySuggestions.length - 1;
      const next = event.key === "ArrowDown"
        ? (activeLibrarySuggestionIndex < last ? activeLibrarySuggestionIndex + 1 : 0)
        : (activeLibrarySuggestionIndex < 0 ? last : Math.max(0, activeLibrarySuggestionIndex - 1));
      setActiveLibrarySuggestion(next);
    }
    return;
  }
  if (event.key === "Enter" && onlineLibrarySuggestions &&
      !onlineLibrarySuggestions.hidden && visibleLibrarySuggestions.length) {
    event.preventDefault();
    const index = activeLibrarySuggestionIndex < 0 ? 0 : activeLibrarySuggestionIndex;
    selectOnlineLibraryEntry(visibleLibrarySuggestions[index].id);
  }
});
onlineLibraryGrid?.addEventListener("click", (event) => {
  const id = event.target.closest("[data-play-game]")?.dataset.playGame;
  if (id) selectOnlineLibraryEntry(id);
});

// On iOS Safari, tapping a suggestion can blur the search input and hide
// its popup before the synthetic click fires. A completed touch is a more
// reliable commit point. Track movement so scrolling the suggestions never
// selects a game. Android and desktop retain the existing click path.
const iosLibraryTouch = typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
let pendingIosSuggestionTouch = null;
let iosSuggestionPointerDown = false;
if (iosLibraryTouch && onlineLibraryGrid) {
  // Distinguish the website's game loader from the local file picker.
  if (loadAnyMediaButton) {
    loadAnyMediaButton.textContent = "OPEN LOCAL GAME FILE";
    loadAnyMediaButton.setAttribute("aria-label", "Open a C64 game file stored on this iPhone or iPad");
  }

  // Pointer events can precede touchstart on modern iOS. Preserve the
  // suggestion through any early blur before touchstart is delivered.
  onlineLibraryGrid.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" &&
        event.target.closest?.("[data-play-game]")) iosSuggestionPointerDown = true;
  }, { passive: true, capture: true });
  onlineLibraryGrid.addEventListener("pointercancel", () => {
    iosSuggestionPointerDown = false;
  }, { passive: true });

  onlineLibraryGrid.addEventListener("touchstart", (event) => {
    pendingIosSuggestionTouch = null;
    if (event.touches.length !== 1) return;
    const option = event.target.closest?.("[data-play-game]");
    if (!option || option.disabled) return;
    const touch = event.touches[0];
    pendingIosSuggestionTouch = {
      id: option.dataset.playGame,
      identifier: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      moved: false,
    };
  }, { passive: true });

  onlineLibraryGrid.addEventListener("touchmove", (event) => {
    if (!pendingIosSuggestionTouch) return;
    const touch = Array.from(event.touches).find((item) =>
      item.identifier === pendingIosSuggestionTouch.identifier);
    if (!touch || Math.hypot(touch.clientX - pendingIosSuggestionTouch.x,
        touch.clientY - pendingIosSuggestionTouch.y) > 12) {
      pendingIosSuggestionTouch.moved = true;
    }
  }, { passive: true });

  onlineLibraryGrid.addEventListener("touchend", (event) => {
    const pending = pendingIosSuggestionTouch;
    pendingIosSuggestionTouch = null;
    iosSuggestionPointerDown = false;
    if (!pending || pending.moved) return;
    const touch = Array.from(event.changedTouches).find((item) =>
      item.identifier === pending.identifier);
    if (!touch || Math.hypot(touch.clientX - pending.x, touch.clientY - pending.y) > 12) return;
    const option = event.target.closest?.("[data-play-game]");
    if (!option || option.dataset.playGame !== pending.id) return;
    event.preventDefault(); // Suppress a delayed Safari synthetic click.
    selectOnlineLibraryEntry(pending.id, false);
    // The user has picked a title: dismiss the iPhone's virtual keyboard
    // without moving focus to LOAD (which can shift the viewport).
    onlineLibrarySearch?.blur();
  }, { passive: false });

  onlineLibraryGrid.addEventListener("touchcancel", () => {
    pendingIosSuggestionTouch = null;
    iosSuggestionPointerDown = false;
  }, { passive: true });
}
onlineLibraryLoadButton?.addEventListener("click", () => { void loadSelectedLibraryEntry(); });
onlineLibrarySearchWrap?.addEventListener("focusout", (event) => {
  // Safari may report relatedTarget=null while a suggestion is being tapped.
  // Let the in-progress touch select before hiding the popup.
  if (pendingIosSuggestionTouch || iosSuggestionPointerDown) return;
  if (!onlineLibrarySearchWrap.contains(event.relatedTarget)) setLibrarySuggestionsOpen(false);
});
document.addEventListener("pointerdown", (event) => {
  if (!onlineLibrarySearchWrap?.contains(event.target)) setLibrarySuggestionsOpen(false);
});
onlineLibraryDiskSwapButton?.addEventListener("click", () => { void swapOnlineLibraryDisk(); });
const catalogueBrowser = mountCatalogueBrowser({
  games: () => onlineLibraryEntries,
  play(id) {
    selectOnlineLibraryEntry(id, false);
    void loadSelectedLibraryEntry();
  },
});
void initialiseOnlineLibrary();

async function saveGameVaultSlot() {
  if (!machine || !running) return false;
  if (vaultGameSelect?.value !== "__current__" &&
      vaultGameSelect?.value !== currentSessionGame.gameKey) {
    if (stageNote) stageNote.textContent =
      "Choose CURRENT GAME before saving. Other games' slots are restore-only.";
    showVaultFeedback("Choose CURRENT GAME above to save; other games and Legacy slots can only be resumed.", true);
    return false;
  }
  try {
    const slot = currentVaultSlot();
    const existing = await gameVault.loadGame(currentSessionGame.gameKey, slot);
    if (existing && !window.confirm("Overwrite " + currentSessionGame.gameTitle +
        " Slot " + slot + "? You can export a backup first.")) return false;
    captureMutableMedia();
    const record = await gameVault.saveGame(currentSessionGame.gameKey,
      currentSessionGame.gameTitle, slot, {
        format: "ccg-c64-vault",
        version: 1,
        driveMode,
        state: machine.serializeState(),
        media: {
          disk: cloneMedia(mountedDisk),
          tape: cloneMedia(mountedTape),
          cartridge: cloneMedia(mountedCartridge),
          diskKey: mountedDiskKey,
          diskSides: [...diskSideCache.entries()].map(([key, media]) =>
            ({ key, media: cloneMedia(media) })),
          libraryEntryId: activeLibraryEntryId,
          libraryDiskIndex: activeLibraryDiskIndex,
        },
      });
    if (machineState) machineState.textContent =
      "GAME VAULT // " + currentSessionGame.gameTitle + " SLOT " + slot + " SAVED";
    if (stageNote) stageNote.textContent =
      "Saved " + currentSessionGame.gameTitle + " to Slot " + slot +
      " in this browser. Export a backup for long-term safekeeping.";
    showVaultFeedback("✓ " + currentSessionGame.gameTitle + " saved to Slot " + slot +
      ". You can resume it after reloading this page.");
    await refreshVaultGameList("__current__");
    if (vaultStatus) vaultStatus.textContent =
      currentSessionGame.gameTitle + " // SLOT " + slot + " SAVED " +
      new Date(record.savedAt).toLocaleString();
    screen?.focus();
    return true;
  } catch (error) {
    if (stageNote) stageNote.textContent = error?.message || "Game Vault save failed.";
    showVaultFeedback("Save failed: " + (error?.message || "Game Vault storage unavailable."), true);
    return false;
  }
}

async function loadGameVaultSlot() {
  if (!vault.snapshot().allRequiredReady) {
    showVaultFeedback("System ROMs are needed before a saved game can resume. Open ROM SETTINGS.", true);
    showSetup();
    return false;
  }
  const selection = vaultSelection();
  const slot = currentVaultSlot();
  let stopped = false;
  let old = null;
  try {
    const record = await vaultRecord(selection, slot);
    const payload = record?.payload;
    if (!payload || payload.format !== "ccg-c64-vault") {
      throw new Error(selection.gameTitle + " Slot " + slot + " is empty.");
    }
    const driveRom = vault.getBytes("drive1541");
    if (payload.state?.drive1541 && !driveRom) {
      throw new Error("This state used True 1541 mode. Restore the optional 1541 DOS ROM first.");
    }

    // Build the replacement against its own media. Restore the previous
    // running game intact if any part of reconstruction fails.
    old = {
      machine, mountedDisk, mountedTape, mountedCartridge, driveMode,
      mountedDiskKey, activeLibraryEntryId, activeLibraryDiskIndex,
      currentSessionGame, running, diskSides: [...diskSideCache.entries()],
    };
    stopFrameLoop();
    stopped = true;
    cancelAutoStart();
    warpLoadActive = false;
    setAudioPaused(true);

    mountedDisk = cloneMedia(payload.media?.disk);
    mountedTape = cloneMedia(payload.media?.tape);
    mountedCartridge = cloneMedia(payload.media?.cartridge);
    driveMode = payload.driveMode === "true" ? "true" : "fast";
    mountedDiskKey = payload.media?.diskKey ||
      (mountedDisk ? "restored:" + mountedDisk.name : null);
    activeLibraryEntryId = payload.media?.libraryEntryId ||
      (selection.gameKey.startsWith("library:")
        ? selection.gameKey.slice("library:".length) : null);
    activeLibraryDiskIndex = payload.media?.libraryDiskIndex || 0;
    diskSideCache.clear();
    for (const item of payload.media?.diskSides || []) {
      if (typeof item?.key === "string" && item.media?.bytes) {
        diskSideCache.set(item.key, cloneMedia(item.media));
      }
    }
    if (mountedDisk && mountedDiskKey && !diskSideCache.has(mountedDiskKey)) {
      diskSideCache.set(mountedDiskKey, cloneMedia(mountedDisk));
    }

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
    await wireAudioToMachine();
    currentSessionGame = selection.legacy
      ? sessionForMedia(payload.media?.cartridge || payload.media?.disk ||
          payload.media?.tape || { name: "Legacy Slot " + slot, type: "basic" })
      : { gameKey: selection.gameKey, gameTitle: selection.gameTitle };
    localStorage.setItem("ccg.emulator.c64.driveMode", driveMode);
    applyJoystickInput();
    running = true;
    paused = false;
    frameImage = null;
    frameAccumulator = 0;
    lastFrameTime = 0;
    setAudioPaused(false);
    setControlState(vault.snapshot());
    blitMachine();
    frameHandle = requestAnimationFrame(frameLoop);
    stopped = false;
    if (machineState) machineState.textContent =
      "GAME VAULT // " + selection.gameTitle + " SLOT " + slot + " RESTORED";
    if (stageNote) stageNote.textContent =
      "Resumed " + selection.gameTitle + " from saved Slot " + slot + ".";
    showVaultFeedback("✓ " + selection.gameTitle + " restored from Slot " + slot + ".");
    updateMediaControls(vault.snapshot());
    updateOnlineDiskUi();
    await refreshVaultGameList("__current__");
    if (typeof enterMobilePlayMode === "function") {
      enterMobilePlayMode(currentSessionGame.gameTitle);
    }
    screen?.focus();
    return true;
  } catch (error) {
    if (stopped && old) {
      machine = old.machine;
      mountedDisk = old.mountedDisk;
      mountedTape = old.mountedTape;
      mountedCartridge = old.mountedCartridge;
      driveMode = old.driveMode;
      mountedDiskKey = old.mountedDiskKey;
      activeLibraryEntryId = old.activeLibraryEntryId;
      activeLibraryDiskIndex = old.activeLibraryDiskIndex;
      currentSessionGame = old.currentSessionGame;
      running = old.running;
      diskSideCache.clear();
      for (const [key, media] of old.diskSides) diskSideCache.set(key, media);
    }
    if (!frameHandle && running && machine) frameHandle = requestAnimationFrame(frameLoop);
    setAudioPaused(false);
    if (stageNote) stageNote.textContent = error?.message || "Game Vault restore failed.";
    showVaultFeedback("Restore failed: " + (error?.message || "Unknown Game Vault error."), true);
    return false;
  }
}

// The mobile shortcuts use the SAME IndexedDB vault and machine snapshot
// routines as the desktop Save / Resume panel: no competing save format.
function closeMobileVaultPanel({ resume = true } = {}) {
  ++mobileVaultRequestId;
  if (mobileVaultPanel) mobileVaultPanel.hidden = true;
  if (resume && mobileVaultAutoPaused && running && paused) togglePause();
  mobileVaultAutoPaused = false;
  if (mobilePlayActive) screen?.focus?.({ preventScroll: true });
}

async function openMobileVault(mode) {
  if (!mobilePlayActive || !running || !machine || !mobileVaultPanel ||
      !mobileVaultSlots || !["save", "load"].includes(mode)) return;
  if (!mobileVaultPanel.hidden) closeMobileVaultPanel();
  setMobileKeyboardOpen(false);
  mobileVaultAutoPaused = !paused;
  if (mobileVaultAutoPaused) togglePause();
  mobileVaultPanel.hidden = false;
  const token = ++mobileVaultRequestId;
  if (mobileVaultTitle) mobileVaultTitle.textContent =
    mode === "save" ? "SAVE GAME STATE" : "LOAD GAME STATE";
  if (mobileVaultHelp) mobileVaultHelp.textContent =
    (mode === "save" ? "Choose a slot for " : "Resume a saved slot for ") +
    currentSessionGame.gameTitle + ". Saves remain in this browser.";
  mobileVaultSlots.replaceChildren();
  if (mobileVaultMessage) mobileVaultMessage.textContent = "Checking saved slots…";
  try {
    const slots = await Promise.all([1, 2, 3].map(slot =>
      gameVault.loadGame(currentSessionGame.gameKey, slot)));
    if (token !== mobileVaultRequestId) return;
    for (let i = 0; i < slots.length; i++) {
      const slot = i + 1;
      const saved = slots[i];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ccg-c64-mobile-vault-slot";
      const title = document.createElement("strong");
      title.textContent = "SLOT " + slot + (saved ? " · SAVED" : " · EMPTY");
      const details = document.createElement("span");
      details.textContent = saved
        ? new Date(saved.savedAt).toLocaleString()
        : (mode === "save" ? "Save here" : "No saved game");
      button.append(title, details);
      button.disabled = mode === "load" && !saved;
      button.addEventListener("click", async () => {
        if (token !== mobileVaultRequestId || button.disabled) return;
        for (const other of mobileVaultSlots.querySelectorAll("button")) other.disabled = true;
        if (mobileVaultMessage) mobileVaultMessage.textContent =
          (mode === "save" ? "Saving" : "Restoring") + " Slot " + slot + "…";
        // Game Vault UI also exposes older game and Legacy selections. The
        // immersive shortcuts must ONLY operate on the currently playing game.
        if (vaultGameSelect) vaultGameSelect.value = "__current__";
        if (vaultSlot) vaultSlot.value = String(slot);
        const ok = mode === "save" ? await saveGameVaultSlot() : await loadGameVaultSlot();
        if (token !== mobileVaultRequestId) return;
        if (ok) closeMobileVaultPanel({ resume: mode === "save" });
        else {
          if (mobileVaultMessage) mobileVaultMessage.textContent =
            vaultFeedback?.textContent || "Unable to access this saved game.";
          for (const other of mobileVaultSlots.querySelectorAll("button")) {
            const index = [...mobileVaultSlots.children].indexOf(other);
            other.disabled = mode === "load" && !slots[index];
          }
        }
      });
      mobileVaultSlots.append(button);
    }
    if (mobileVaultMessage) mobileVaultMessage.textContent = mode === "save"
      ? "An occupied slot asks before overwriting. Export backups from Save / Resume."
      : "Only this game's existing saves can be resumed here.";
  } catch (error) {
    if (token !== mobileVaultRequestId) return;
    if (mobileVaultMessage) mobileVaultMessage.textContent =
      "Game Vault unavailable: " + (error?.message || "Check browser storage and retry.");
  }
}

async function exportGameVaultSlot() {
  try {
    const selection = vaultSelection();
    const slot = currentVaultSlot();
    let record = await vaultRecord(selection, slot);
    if (!record) throw new Error("This slot is empty. Save a game first.");
    if (selection.legacy) {
      record = {
        ...record, gameKey: "legacy:slot-" + slot,
        gameTitle: "Legacy Slot " + slot,
      };
    }
    const backup = encodeGameVaultBackup(record);
    const blob = new Blob([backup], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = selection.gameTitle.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) +
      "-slot-" + slot + ".ccg64save.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    if (stageNote) stageNote.textContent =
      "Backup exported for " + selection.gameTitle + " Slot " + slot +
      ". Keep the file somewhere safe.";
  } catch (error) {
    if (stageNote) stageNote.textContent = error?.message || "Backup export failed.";
  }
}

async function importGameVaultBackup(file) {
  if (!file) return;
  try {
    if (file.size > 80_000_000) throw new Error("Backup file exceeds 80 MB.");
    const backup = decodeGameVaultBackup(await file.text());
    const old = await gameVault.loadGame(backup.gameKey, backup.slot);
    if (old && !window.confirm(
      "Overwrite " + backup.gameTitle + " Slot " + backup.slot +
      " with this imported backup? The current saved state will be lost."
    )) return;
    await gameVault.saveGame(backup.gameKey, backup.gameTitle, backup.slot,
      backup.payload, backup.savedAt);
    await refreshVaultGameList(backup.gameKey);
    if (stageNote) stageNote.textContent =
      "Imported " + backup.gameTitle + " Slot " + backup.slot +
      ". Select RESTORE to resume it. No other games were changed.";
  } catch (error) {
    if (stageNote) stageNote.textContent = error?.message || "Backup import failed.";
  }
}

vaultRetryButton?.addEventListener("click", () => {
  if (vaultRetryButton.disabled) return;
  vaultRetryButton.disabled = true;
  if (vaultStatus) vaultStatus.textContent = "RECONNECTING VAULT…";
  void refreshVaultGameList().finally(() => { vaultRetryButton.disabled = false; });
});
// Returning after closing another emulator tab is an opportunity to retry.
// This does not reset the machine or touch any saved state.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && vaultRetryButton && !vaultRetryButton.hidden) {
    void refreshVaultGameList();
  }
});
vaultSaveButton?.addEventListener("click", () => { void saveGameVaultSlot(); });
vaultLoadButton?.addEventListener("click", () => { void loadGameVaultSlot(); });
vaultExportButton?.addEventListener("click", () => { void exportGameVaultSlot(); });
vaultImportButton?.addEventListener("click", () => vaultBackupInput?.click());
vaultBackupInput?.addEventListener("change", async () => {
  const file = vaultBackupInput.files?.[0];
  vaultBackupInput.value = "";
  await importGameVaultBackup(file);
});
vaultClearButton?.addEventListener("click", async () => {
  const selection = vaultSelection();
  const slot = currentVaultSlot();
  if (!window.confirm("Clear " + selection.gameTitle + " Slot " + slot +
      " from this browser? This cannot be undone without an exported backup.")) return;
  try {
    if (selection.legacy) await gameVault.clear(slot);
    else await gameVault.clearGame(selection.gameKey, slot);
    await refreshVaultGameList(vaultGameSelect?.value);
  } catch (error) {
    if (stageNote) stageNote.textContent = error?.message || "Game Vault slot could not be cleared.";
  }
});
vaultSlot?.addEventListener("change", () => { void refreshVaultStatus(); });
vaultGameSelect?.addEventListener("change", () => {
  const selection = vaultSelection();
  showVaultFeedback(selection.legacy
    ? "Original legacy saves can be resumed here. Select CURRENT GAME to save new progress."
    : selection.gameKey === currentSessionGame.gameKey
      ? "Saving uses the current running game. You can resume any available slot later."
      : "Previous saved game selected. Choose a slot and press RESUME SAVE.");
  void refreshVaultStatus();
});

for (const button of document.querySelectorAll("[data-joy-mask]")) {
  const mask = Number(button.getAttribute("data-joy-mask")) & 0x1F;
  const press = event => {
    event.preventDefault();
    if (button.hidden) return;
    touchHeldButtons.set(button, { mask, pointerId: event.pointerId });
    syncTouchJoystick();
    if (inputStatus) inputStatus.textContent = `TOUCH // PORT ${joystickPort}`;
    try { button.setPointerCapture?.(event.pointerId); } catch {}
  };
  const release = event => {
    event.preventDefault();
    const held = touchHeldButtons.get(button);
    if (!held || (event.pointerId != null && held.pointerId !== event.pointerId)) return;
    touchHeldButtons.delete(button);
    syncTouchJoystick();
    if (!touchHeldMask && inputStatus && !gamepadConnected) inputStatus.textContent = "KEYBOARD READY";
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
  button.addEventListener("contextmenu", event => event.preventDefault());
}
configureJump(null);

// On phones, make short taps long enough for the C64 keyboard scan to see them.
// Pointer capture and cancellation ensure a released F-key never remains stuck.
const MIN_TOUCH_FUNCTION_KEY_MS = 120;
for (const button of document.querySelectorAll("[data-c64-fkey]")) {
  const code = button.getAttribute("data-c64-fkey");
  const matrix = KEY_MAP[code];
  if (!matrix) continue;
  const [col, row] = matrix;

  const releaseKey = (force = false) => {
    const held = touchFunctionKeyHolds.get(button);
    if (!held) return;
    const remaining = MIN_TOUCH_FUNCTION_KEY_MS - (performance.now() - held.started);
    if (!force && remaining > 0) {
      if (!held.timer) held.timer = setTimeout(() => releaseKey(true), remaining);
      return;
    }
    if (held.timer) clearTimeout(held.timer);
    touchFunctionKeyHolds.delete(button);
    button.classList.remove("is-pressed");
    // Do not release the matrix bit while a physical keyboard holds it down.
    if (![...heldMatrixKeys.values()].some(key => key.col === col && key.row === row)) {
      machine?.cia1.setKey(col, row, false);
    }
    if (inputStatus && !touchFunctionKeyHolds.size) inputStatus.textContent = "KEYBOARD READY";
  };

  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (!running || !machine || paused || setup?.hidden === false) return;
    const prior = touchFunctionKeyHolds.get(button);
    if (prior?.timer) clearTimeout(prior.timer);
    touchFunctionKeyHolds.set(button, { col, row, started: performance.now(), timer: null });
    pollGamepad();
    machine.cia1.setKey(col, row, true);
    button.classList.add("is-pressed");
    if (inputStatus) inputStatus.textContent = `C64 ${code} // TOUCH`;
    try { button.setPointerCapture?.(event.pointerId); } catch {}
  });
  for (const eventName of ["pointerup", "pointercancel"]) {
    button.addEventListener(eventName, event => {
      event.preventDefault();
      releaseKey();
    });
  }
  button.addEventListener("lostpointercapture", () => releaseKey());
  button.addEventListener("contextmenu", event => event.preventDefault());
}

void refreshVaultGameList();

fullscreenButton?.addEventListener("click", async () => {
  if (!screenStage) return;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      // A mobile fullscreen picture alone removes the on-screen joystick.
      // Fullscreen the console instead, keeping D-pad and FIRE usable.
      const touchLayout = window.matchMedia?.("(max-width: 760px)")?.matches ||
        window.matchMedia?.("(pointer: coarse)")?.matches;
      const fullscreenTarget = touchLayout
        ? document.querySelector(".ccg-c64-console") || screenStage
        : screenStage;
      if (mobilePlayMedia?.matches && running) enterMobilePlayMode("C64 GAMEPLAY");
      await fullscreenTarget.requestFullscreen({ navigationUI: "hide" });
    }
    fitScreenToStage();
    screen?.focus();
  } catch (error) {
    if (stageNote) stageNote.textContent = "Fullscreen was blocked by the browser. Use the DISPLAY FULL button again, or check browser permissions.";
    console.warn("[ccg-c64] Fullscreen unavailable:", error);
  }
});

document.querySelector("[data-ccg-c64-year]")?.replaceChildren(String(new Date().getFullYear()));

const initial = vault.restore();
render(initial);

// All visitors, desktop and mobile, load the SAME original Commodore 64
// BASIC V2, KERNAL Rev.3 and CHARGEN from this website. Each file's SHA-256
// is verified before the original ROMVault installs anything.
async function bootWithHostedFirmware() {
  try {
    if (machineState) machineState.textContent = "STARTING COMMODORE 64";
    if (stageNote) stageNote.textContent = "Loading the original C64 BASIC, KERNAL and CHARGEN firmware...";
    const files = await fetchVerifiedHostedROMs();
    const snapshot = installHostedROMs(vault, files);
    render(snapshot);
    if (machineState) machineState.textContent = HOSTED_ROM_VERSION;
  } catch (error) {
    console.error("[ccg-c64] Original C64 firmware unavailable:", error);
    if (stageNote) stageNote.textContent =
      "Original C64 firmware could not be loaded. Reload this page, " +
      "or use SYSTEM ROMS to recover your installed files. " +
      (error?.message || "");
    render(vault.snapshot());
  }
  if (vault.snapshot().allRequiredReady && !running) {
    await powerOn();
  }
}
hostedFirmwareReadyPromise = bootWithHostedFirmware();

window.addEventListener("pagehide", () => {
  releaseAllInput();
  stopFrameLoop();
});
