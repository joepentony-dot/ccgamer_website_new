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
const { KEY_MAP, CHAR_MAP } = await import("data:text/javascript," + encodeURIComponent(ciaSource));

assert(html.includes("DRAG &amp; DROP A GAME HERE — AUTO START"), "The screen must advertise drag-and-drop auto-start");
assert(html.includes("id=\"ccg-c64-drop-instructions\""), "The drop instructions must be accessible");
assert(html.includes("aria-describedby=\"ccg-c64-drop-instructions\""), "The display must reference drop instructions");
assert(html.includes("<strong>MAX</strong>"), "The Warp Load button must advertise MAX");
assert(css.includes("position: relative;"), "Drop overlay must be anchored to the screen");
assert(css.includes("grid-template-areas:"), "Desktop control deck must declare explicit areas");
assert(css.includes('"vault vault vault vault vault vault"'), "Vault controls must be available without collapsing");
assert(css.includes("grid-template-columns: repeat(5, minmax(0, 1fr))"), "Ten primary actions must fit in two rows");
for (const hook of [
  "data-machine-power", "data-machine-reset", "data-machine-pause", "data-warp-load",
  "data-crt-toggle", "data-size-toggle", "data-fullscreen", "data-load-media",
  "data-audio-toggle", "data-load-disk", "data-drive-mode", "data-load-tape",
  "data-tape-play", "data-tape-stop", "data-tape-rewind", "data-load-cartridge",
  "data-eject-cartridge", "data-vault-save", "data-vault-load", "data-vault-clear",
  "data-open-setup", "data-clear-roms", "data-online-library-select",
]) assert(html.includes(hook), "A required C64 control has disappeared: " + hook);

const first = app.indexOf("const heldMatrixKeys = new Map();");
const last = app.indexOf("function pollGamepad()", first);
assert(first >= 0 && last > first, "Keyboard handler block must be present");
const keys = new Map();
const keyId = (col, row) => col + ":" + row;
const cia1 = {
  setKey(col, row, down) { if (down) keys.set(keyId(col, row), true); else keys.delete(keyId(col, row)); },
  isKeyDown(col, row) { return keys.has(keyId(col, row)); },
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

// F2/F4/F6/F8 are shifted physical C64 F1/F3/F5/F7.
for (const [code, col, row] of [
  ["F2", 0, 4], ["F4", 0, 5], ["F6", 0, 6], ["F8", 0, 3],
]) {
  down(code, code);
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
const blocked = down("Space", " ", { target: button });
assert(!blocked.prevented && !keys.has(keyId(7, 4)), "Toolbar buttons must keep native keyboard operation");
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
  warpLoadActive: true, lastFrameTime: 0, frameAccumulator: 0,
  PAL_FRAME_MS: 1000 / 50.125,
  WARP_FRAME_BUDGET_MS: 12, WARP_MAX_FRAMES_PER_TICK: 1024,
  performance: { now: () => ticks++ * 0.5 },
  pollGamepad() {}, serviceAutoStart() {}, blitMachine() {},
  autoStartSteps: null, requestAnimationFrame: () => 1,
  frameHandle: 0,
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

console.log("C64 keyboard, VICE keys, Shift+8, toolbar focus, drag target and MAX Warp tests passed.");
