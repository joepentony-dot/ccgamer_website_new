#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const app = read("js/ccg-c64/app.js");
const css = read("resources/css/ccg-c64-emulator.css");
const html = read("emulator/c64/index.html");
const ciaSource = read("js/ccg-c64/core/cia.js");
const { KEY_MAP, CHAR_MAP, CIA } = await import("data:text/javascript," + encodeURIComponent(ciaSource));

assert(html.includes("DRAG &amp; DROP A GAME HERE — AUTO START"), "The screen must advertise drag-and-drop auto-start");
assert(html.includes("id=\"ccg-c64-drop-instructions\""), "The drop instructions must be accessible");
assert(html.includes("aria-describedby=\"ccg-c64-drop-instructions\""), "The display must reference drop instructions");
assert(html.includes("<strong>MAX</strong>"), "The Warp Load button must advertise MAX");
assert(css.includes("position: relative;"), "Drop overlay must be anchored to the screen");
assert(css.includes("visibility: hidden;") &&
  css.includes(".ccg-c64-screen-stage.is-dragover .ccg-c64-drop-hint"),
  "Drop hint must be hidden during play and visible only during a drag");
assert(html.includes("data-joystick-swap"), "Port swapping must have a visible button");
assert(html.includes("data-joystick-port"), "Port selection must be visible");
assert(html.includes("data-keyboard-joystick"), "Keyboard joystick switch must be visible");
assert(css.includes(".ccg-c64-joystick-actions"), "Port and keyboard joystick controls must stay compact");
assert(html.includes("data-emulator-speed"), "Actual PAL speed must be measurable");
assert(!html.includes(">SOURCE</a>"), "Prominent source navigation must be omitted");
assert(html.includes('href="/emulator/c64/legal.html"'), "GPL source access must remain available");
assert(app.includes("function fitScreenToStage()") && app.includes("new ResizeObserver(fitScreenToStage)"),
  "FIT must respond to measured display area and browser resize");
assert(app.includes("const fullscreenTarget = touchLayout") &&
       app.includes('document.querySelector(".ccg-c64-console") || screenStage') &&
       app.includes("await fullscreenTarget.requestFullscreen"),
  "Fullscreen must retain picture-only desktop mode while including touch controls on mobile");
assert(css.includes(".ccg-c64-screen-stage:fullscreen") &&
  css.includes("height: 100dvh !important") &&
  css.includes(".ccg-c64-workspace.is-display-expanded"),
  "Fullscreen must fill the viewport and SIZE must expand the screen independently of controls");
assert(app.includes("function beginAutomaticWarp(") && app.includes("function finishAutomaticWarp()"),
  "Media auto-start must enable maximum warp and restore real-time PAL speed");
assert(app.includes("beginAutomaticWarp(200)"),
  "CRT cartridge must receive a bounded fast-boot window");
assert(css.includes("grid-template-areas:"), "Desktop control deck must declare explicit areas");
assert(css.includes('"vault vault vault vault vault vault"'), "Vault controls must be available without collapsing");
assert(css.includes("grid-template-columns: repeat(5, minmax(0, 1fr))"), "Ten primary actions must fit in two rows");
for (const hook of [
  "data-machine-power", "data-machine-reset", "data-machine-pause", "data-warp-load",
  "data-crt-toggle", "data-size-toggle", "data-fullscreen", "data-load-media",
  "data-audio-toggle", "data-load-disk", "data-drive-mode", "data-load-tape",
  "data-tape-play", "data-tape-stop", "data-tape-rewind", "data-load-cartridge",
  "data-eject-cartridge", "data-vault-save", "data-vault-load", "data-vault-clear",
  "data-open-setup", "data-clear-roms", "data-online-library-search",
]) assert(html.includes(hook), "A required C64 control has disappeared: " + hook);

const first = app.indexOf("const heldMatrixKeys = new Map();");
const last = app.indexOf("function pollGamepad()", first);
assert(first >= 0 && last > first, "Keyboard handler block must be present");
const keys = new Map();
const keyId = (col, row) => col + ":" + row;
const actualCIA = new CIA(1);
const cia1 = {
  setKey(col, row, down) {
    if (down) keys.set(keyId(col, row), true);
    else keys.delete(keyId(col, row));
    actualCIA.setKey(col, row, down);
  },
  isKeyDown(col, row) { return actualCIA.isKeyDown(col, row); },
};
const canvas = { closest: () => null };
const button = { closest: (selector) => selector.includes("button") ? button : null };
const machine = {
  cia1, joyPort1: 0xff, joyPort2: 0xff,
  setRestoreNmiLine(value) { this.restore = value; },
};
const context = vm.createContext({
  KEY_MAP, CHAR_MAP, machine, running: true, screen: canvas,
  document: { activeElement: canvas }, setup: { hidden: true },
  gamepadJoyByte: 0xff, touchJoyByte: 0xff, touchHeldMask: 0,
  inputStatus: { textContent: "" },
  keyboardJoystickEnabled: false, keyboardJoystickKeys: new Set(),
  keyboardPriorityUntil: 0,
  KEYBOARD_JOYSTICK_MASKS: {
    ArrowUp: 1, KeyW: 1, ArrowDown: 2, KeyS: 2,
    ArrowLeft: 4, KeyA: 4, ArrowRight: 8, KeyD: 8,
    Space: 16, ControlLeft: 16, ControlRight: 16,
  },
  performance: { now: () => 1000 },
  applyJoystickInput() {},
});
vm.runInContext(app.slice(first, last) + "\nglobalThis.dispatch = handleC64Key; globalThis.release = releaseAllInput;", context);
function event(code, key, opts = {}) {
  const value = {
    code, key, target: opts.target || canvas,
    shiftKey: Boolean(opts.shiftKey), ctrlKey: Boolean(opts.ctrlKey),
    altKey: Boolean(opts.altKey), metaKey: Boolean(opts.metaKey),
    repeat: Boolean(opts.repeat),
    getModifierState: (modifier) => modifier === "AltGraph" && Boolean(opts.altGraph),
    prevented: false,
    preventDefault() { this.prevented = true; },
  };
  return value;
}
function down(code, key, opts = {}) {
  const ev = event(code, key, opts);
  context.dispatch(ev, true);
  return ev;
}
function up(code, key, opts = {}) {
  const ev = event(code, key, opts);
  context.dispatch(ev, false);
  return ev;
}
function keyTest(code, key, col, row) {
  const press = down(code, key);
  assert(keys.has(keyId(col, row)), code + " must press the C64 matrix");
  assert(press.prevented, code + " must not trigger the browser");
  const release = up(code, key);
  assert(!keys.has(keyId(col, row)), code + " must release the C64 matrix");
  assert(release.prevented, code + " release must reach emulator");
}
keyTest("Enter", "Enter", 0, 1);
keyTest("Space", " ", 7, 4);
keyTest("F1", "F1", 0, 4);
keyTest("F3", "F3", 0, 5);
keyTest("F5", "F5", 0, 6);
keyTest("F7", "F7", 0, 3);
keyTest("ArrowRight", "ArrowRight", 0, 2);
keyTest("ArrowDown", "ArrowDown", 0, 7);
keyTest("KeyA", "a", 1, 2);
keyTest("KeyS", "s", 1, 5);
actualCIA.portADir = 0xff;
actualCIA.portA = 0xff & ~(1 << 1);
down("KeyS", "s");
assert.equal(actualCIA.read(0x01) & (1 << 5), 0,
  "A game selecting CIA column 1 must see physical S on row 5");
up("KeyS", "s");
assert.notEqual(actualCIA.read(0x01) & (1 << 5), 0,
  "CIA column/row must release after S keyup");

// F2/F4/F6/F8 are shifted physical C64 F1/F3/F5/F7.
for (const [code, col, row] of [
  ["F2", 0, 4], ["F4", 0, 5], ["F6", 0, 6], ["F8", 0, 3],
]) {
  const shiftedDown = down(code, code);
  assert(shiftedDown.prevented, code + " must not activate a browser shortcut");
  assert(keys.has(keyId(col, row)) && keys.has(keyId(1, 7)), code + " must shift the C64 function key");
  up(code, code);
  assert(!keys.has(keyId(col, row)) && !keys.has(keyId(1, 7)), code + " release must clear both keys");
}

// UK host Shift+8 must produce the * matrix key with C64 SHIFT suppressed.
down("ShiftLeft", "Shift", { shiftKey: true });
assert(keys.has(keyId(1, 7)));
down("Digit8", "*", { shiftKey: true });
assert(keys.has(keyId(6, 1)), "Shift+8 must press the C64 unshifted asterisk");
assert(!keys.has(keyId(1, 7)), "C64 Shift must be temporarily released for asterisk");
up("Digit8", "*", { shiftKey: true });
assert(!keys.has(keyId(6, 1)) && keys.has(keyId(1, 7)), "Asterisk release must restore physical Shift");
up("ShiftLeft", "Shift");
assert(!keys.has(keyId(1, 7)));

// F12 emulates RESTORE; normal inputs should not activate while a form has focus.
down("F12", "F12"); assert.equal(machine.restore, true);
up("F12", "F12"); assert.equal(machine.restore, false);
context.document.activeElement = button;
const start = down("KeyS", "s", { target: button });
assert(start.prevented && keys.has(keyId(1, 5)),
  "S must start the game even while a toolbar button holds focus");
up("KeyS", "s", { target: button });
assert(!keys.has(keyId(1, 5)), "S must release while button holds focus");
const fn = down("F1", "F1", { target: button });
assert(fn.prevented && keys.has(keyId(0, 4)), "F1 must reach the game while button holds focus");
up("F1", "F1", { target: button });
const blocked = down("Space", " ", { target: button });
assert(!blocked.prevented && !keys.has(keyId(7, 4)), "Toolbar buttons must keep native keyboard operation");
const hiddenFileInput = {
  tagName: "INPUT", type: "file",
  closest(selector) { return selector.includes("input") ? this : null; },
};
context.document.activeElement = hiddenFileInput;
const afterLoad = down("KeyS", "s", { target: hiddenFileInput });
assert(afterLoad.prevented && keys.has(keyId(1, 5)),
  "Hidden file chooser must not block S after loading a disk");
up("KeyS", "s", { target: hiddenFileInput });
const textField = {
  tagName: "INPUT", type: "text",
  closest(selector) { return selector.includes("input") ? this : null; },
};
context.document.activeElement = textField;
const insideTextField = down("KeyS", "s", { target: textField });
assert(!insideTextField.prevented && !keys.has(keyId(1, 5)),
  "Visible text input must retain its native keyboard");
context.document.activeElement = canvas;
context.setup.hidden = false;
assert(!down("F1", "F1").prevented, "ROM setup must keep keyboard input");
context.setup.hidden = true;

// A key held while focus moves must not become permanently stuck.
down("Space", " ");
context.release();
assert.equal(keys.size, 0, "Leaving gameplay must release all held C64 keys");
assert.equal(machine.restore, false);

// Warp should execute multiple frames in each budgeted browser tick, while
// ordinary emulation remains one PAL frame per PAL interval.
const frameStart = app.indexOf("function frameLoop(now) {");
const frameEnd = app.indexOf("function powerOff()", frameStart);
assert(frameStart >= 0 && frameEnd > frameStart, "Frame loop must be present");
let runs = 0;
let ticks = 0;
const frameContext = vm.createContext({
  machine: { runFrame() { runs++; } }, running: true, paused: false,
  warpLoadActive: true, automaticWarpActive: false, automaticWarpFramesRemaining: 0,
  lastFrameTime: 0, frameAccumulator: 0,
  PAL_FRAME_MS: 1000 / 50.125,
  WARP_FRAME_BUDGET_MS: 12, WARP_MAX_FRAMES_PER_TICK: 1024,
  performance: { now: () => ticks++ * 0.5 },
  pollGamepad() {}, serviceAutoStart() {}, blitMachine() {},
  autoStartSteps: null, requestAnimationFrame: () => 1,
  frameHandle: 0, speedSampleTime: 0, speedSampleFrames: 0,
  emulatorSpeedStatus: { textContent: "", title: "" },
});
vm.runInContext(app.slice(frameStart, frameEnd) + "\nglobalThis.runTick = frameLoop;", frameContext);
frameContext.runTick(1000);
assert(runs > 4, "MAX Warp must exceed the old four-frame behaviour on a fast device");
assert(runs <= 1024, "MAX Warp must not run an unbounded browser task");
const warpRuns = runs;
frameContext.warpLoadActive = false;
frameContext.lastFrameTime = 1000;
frameContext.runTick(1020);
assert.equal(runs - warpRuns, 1, "Normal mode must retain near-50Hz PAL speed");


// The user's gamepad and touch bytes must reach exactly the selected C64 port
// without interfering with the other port. Switching must be reversible.
const joystickStart = app.indexOf("function updateJoystickUi() {");
const joystickEnd = app.indexOf("function updateDriveModeUi(", joystickStart);
assert(joystickStart >= 0 && joystickEnd > joystickStart, "Joystick switch code must exist");
let joystickUpdates = 0;
const joystickButton = {
  title: "", listeners: new Map(),
  setAttribute() {},
  addEventListener(type, listener) { this.listeners.set(type, listener); },
};
const joystickStatus = { textContent: "" };
const joystickMachine = {
  joyPort1: 255, joyPort2: 255,
  _updateLightpen() { joystickUpdates++; },
};
const joystickStorage = new Map();
let timeNow = 5000;
const keyboardModeButton = {
  textContent: "", pressed: "", listeners: {},
  setAttribute(name, value) { this[name] = value; },
  addEventListener(type, handler) { this.listeners[type] = handler; },
};
const joystickContext = vm.createContext({
  joystickPort: 2, joystickPortIndicator: joystickStatus,
  joystickSwapButton: joystickButton, keyboardJoystickButton: keyboardModeButton,
  machine: joystickMachine, keyboardJoystickEnabled: false,
  keyboardJoystickKeys: new Set(), keyboardPriorityUntil: 0,
  KEYBOARD_JOYSTICK_MASKS: {
    ArrowUp: 1, KeyW: 1, ArrowDown: 2, KeyS: 2,
    ArrowLeft: 4, KeyA: 4, ArrowRight: 8, KeyD: 8,
    Space: 16, ControlLeft: 16, ControlRight: 16,
  },
  heldMatrixKeys: new Map(), shiftLeftPhysical: false, shiftRightPhysical: false,
  performance: { now: () => timeNow },
  gamepadJoyByte: 0xef, touchJoyByte: 0xfe,
  localStorage: {
    setItem(key, value) { joystickStorage.set(key, value); },
  },
  inputStatus: { textContent: "" },
  screen: { focus() {} },
});
vm.runInContext(app.slice(joystickStart, joystickEnd) +
  "\nglobalThis.routeJoystick = applyJoystickInput; globalThis.swapPort = swapJoystickPort;",
  joystickContext);
joystickContext.routeJoystick();
assert.equal(joystickMachine.joyPort1, 255);
assert.equal(joystickMachine.joyPort2, 0xee);
joystickContext.swapPort();
assert.equal(joystickMachine.joyPort1, 0xee, "Selected port 1 must receive combined joystick inputs");
assert.equal(joystickMachine.joyPort2, 255, "Unselected port 2 must be idle");
assert.equal(joystickStatus.textContent, "PORT 1");
assert.equal(joystickStorage.get("ccg.emulator.c64.joystickPort"), "1");
joystickContext.swapPort();
assert.equal(joystickMachine.joyPort1, 255);
assert.equal(joystickMachine.joyPort2, 0xee);
assert(joystickUpdates >= 3, "Port 1 lightpen pin must be updated when joystick swaps");

// A gamepad held down or firing must never mask a physical S key or its
// CIA column while the player types. Gamepad resumes after a quiet interval.
joystickContext.heldMatrixKeys.set("KeyS", { col: 1, row: 5 });
joystickContext.routeJoystick();
assert.equal(joystickMachine.joyPort2, 255, "Held keyboard S must neutralize connected gamepad");
joystickContext.heldMatrixKeys.delete("KeyS");
joystickContext.keyboardPriorityUntil = 6000;
joystickContext.routeJoystick();
assert.equal(joystickMachine.joyPort2, 255, "Keyboard priority must persist briefly after release");
timeNow = 6100;
joystickContext.routeJoystick();
assert.equal(joystickMachine.joyPort2, 0xee, "Gamepad resumes after keyboard inactivity");

// Keyboard joystick is optional and routes WASD/arrows/SPACE as active-low
// joystick bits to whichever port the player has chosen.
keyboardModeButton.listeners.click();
assert.equal(keyboardModeButton.textContent, "KEYBOARD JOY: ON");
assert.equal(joystickStorage.get("ccg.emulator.c64.keyboardJoystick"), "1");
joystickContext.keyboardJoystickKeys.add("KeyW");
joystickContext.keyboardJoystickKeys.add("Space");
joystickContext.routeJoystick();
assert.equal(joystickMachine.joyPort2, 0xee, "Keyboard W+SPACE must provide up+fire");
joystickContext.keyboardJoystickKeys.delete("Space");
joystickContext.routeJoystick();
assert.equal(joystickMachine.joyPort2, 0xfe, "Keyboard joystick key release must drop fire");
joystickContext.swapPort();
joystickContext.routeJoystick();
assert.equal(joystickMachine.joyPort1, 0xfe, "Keyboard joystick must follow port swapping");
assert.equal(joystickMachine.joyPort2, 255);
joystickContext.keyboardJoystickKeys.clear();
keyboardModeButton.listeners.click();
assert.equal(keyboardModeButton.textContent, "KEYBOARD JOY: OFF");

// FIT must size against the actual screen stage rather than a guessed vh
// offset, and restore the CSS width on mobile.
const fitStart = app.indexOf("function fitScreenToStage() {");
const fitEnd = app.indexOf("function toggleScreenSize()", fitStart);
assert(fitStart >= 0 && fitEnd > fitStart, "Measured FIT calculator missing");
const fitStage = { clientWidth: 700, clientHeight: 240, classList: { toggle() {} } };
const bezel = { style: { width: "" } };
let desktop = true;
const fitContext = vm.createContext({
  screenStage: fitStage, screenBezel: bezel, displayExpanded: false,
  document: { fullscreenElement: null },
  window: {
    matchMedia() { return { matches: desktop }; },
    getComputedStyle() {
      return { paddingLeft: "10px", paddingRight: "10px",
        paddingTop: "10px", paddingBottom: "10px" };
    },
  },
  sizeButton: { querySelector: () => ({ textContent: "" }) },
});
vm.runInContext(app.slice(fitStart, fitEnd) + "\nglobalThis.fitNow = fitScreenToStage;", fitContext);
fitContext.fitNow();
assert.equal(bezel.style.width, "310px", "Short desktop stage must constrain bezel by height");
fitStage.clientHeight = 680;
fitContext.fitNow();
assert.equal(bezel.style.width, "680px", "Wide stage must constrain bezel by available width");
desktop = false;
fitContext.fitNow();
assert.equal(bezel.style.width, "", "Mobile must restore responsive CSS width");

// Fullscreen overrides mobile sizing and uses both viewport dimensions.
fitContext.document.fullscreenElement = fitStage;
fitStage.clientWidth = 1920;
fitStage.clientHeight = 1080;
fitContext.fitNow();
assert.equal(bezel.style.width, "1496px",
  "Fullscreen C64 canvas must nearly fill viewport height without distortion");

// Automatic game launches warp at MAX and return to real-time playback only
// after the staged LOAD/RUN sequence has finished.
const autoStartBegin = app.indexOf("function finishAutomaticWarp() {");
const autoStartEnd = app.indexOf("async function prepareFreshGameSession()", autoStartBegin);
assert(autoStartBegin >= 0 && autoStartEnd > autoStartBegin, "Automatic warp helpers missing");
const speedTransitions = [];
const autoContext = vm.createContext({
  automaticWarpActive: false, automaticWarpFramesRemaining: 0,
  warpLoadActive: false, autoStartSteps: null, autoStartTypeRest: "",
  autoStartSawBusy: false, autoStartBudget: 0,
  machine: { bufferKeyboardText: (text) => text.length },
  running: true, paused: false,
  basicReady() { return true; },
  setWarpLoad(on) { speedTransitions.push(on); autoContext.warpLoadActive = on; },
  stageNote: { textContent: "" },
});
vm.runInContext(app.slice(autoStartBegin, autoStartEnd) +
  "\nglobalThis.enqueue = queueAutoStart; globalThis.advance = serviceAutoStart;", autoContext);
autoContext.enqueue([{ ready: true }, { type: "RUN\\r" }]);
assert.equal(speedTransitions.at(-1), true, "Auto-start must enable maximum warp");
autoContext.advance();
assert.equal(autoContext.warpLoadActive, true, "Waiting for RUN must remain accelerated");
autoContext.advance();
assert.equal(autoContext.warpLoadActive, false, "RUN completion must restore 1x speed");
assert.equal(speedTransitions.at(-1), false, "Automatic warp must restore normal SID timing");

console.log("C64 F1-F8, CIA keyboard, automatic MAX Warp, responsive expanded FIT and fullscreen tests passed.");
