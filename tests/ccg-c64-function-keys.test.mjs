#!/usr/bin/env node
"use strict";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { CIA, KEY_MAP } from "../js/ccg-c64/core/cia.js";

const html = fs.readFileSync("emulator/c64/index.html", "utf8");
const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
const css = fs.readFileSync("resources/css/ccg-c64-emulator.css", "utf8");
const names = ["F1", "F3", "F5", "F7"];
const rows = [4, 5, 6, 3];
const cia = new CIA(1);
cia.write(0x02, 0xff); // drive selected CIA keyboard columns as outputs
cia.write(0x03, 0x00); // keyboard rows are inputs
cia.write(0x00, 0xfe); // select keyboard column 0, active low
for (let i = 0; i < names.length; i++) {
  const [col, row] = KEY_MAP[names[i]];
  assert.equal(col, 0);
  assert.equal(row, rows[i]);
  assert(html.includes(`data-c64-fkey="${names[i]}"`), `${names[i]} touchscreen button missing`);
  cia.setKey(col, row, true);
  assert.equal(cia.read(1) & (1 << row), 0, `${names[i]} must drive CIA keyboard matrix low`);
  cia.setKey(col, row, false);
  assert.notEqual(cia.read(1) & (1 << row), 0, `${names[i]} must release CIA keyboard matrix`);
}
assert(css.includes("touch-action: none;"), "Touch buttons must not trigger page gestures");

class FakeButton {
  constructor(name) {
    this.name = name;
    this.listeners = {};
    this.attributes = { "data-c64-fkey": name };
    this.pressed = false;
    this.classList = {
      add: () => { this.pressed = true; },
      remove: () => { this.pressed = false; },
    };
  }
  getAttribute(key) { return this.attributes[key]; }
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  dispatch(name) {
    const event = { pointerId: 1, preventDefault() {} };
    for (const callback of this.listeners[name] || []) callback(event);
  }
  setPointerCapture() {}
}
const buttons = names.map(name => new FakeButton(name));
const start = app.indexOf("// On phones, make short taps long enough");
const end = app.indexOf("void refreshVaultStatus();", start);
assert(start >= 0 && end > start, "Touch function-key handlers must be installed");
let now = 1000;
let nextTimer = 0;
let gamepadSamples = 0;
const timers = new Map();
const ctx = vm.createContext({
  document: { querySelectorAll: selector => {
    assert.equal(selector, "[data-c64-fkey]");
    return buttons;
  } },
  KEY_MAP, machine: { cia1: cia }, running: true, paused: false,
  setup: { hidden: true }, inputStatus: { textContent: "" },
  performance: { now: () => now }, keyboardPriorityUntil: 0,
  applyJoystickInput() {}, pollGamepad() { gamepadSamples++; },
  touchFunctionKeyHolds: new Map(), heldMatrixKeys: new Map(),
  setTimeout: fn => { const id = ++nextTimer; timers.set(id, fn); return id; },
  clearTimeout: id => timers.delete(id),
});
vm.runInContext(app.slice(start, end), ctx);
const f3 = buttons[1];
f3.dispatch("pointerdown");
assert.equal(gamepadSamples, 1, "F3 must sample controller on the same input event");
assert.equal(cia.read(1) & (1 << 5), 0, "F3 pointerdown must reach CIA matrix");
f3.dispatch("pointerup");
assert.equal(cia.read(1) & (1 << 5), 0, "Quick tap must stay down long enough to scan");
now += 130;
for (const [id, callback] of [...timers]) { timers.delete(id); callback(); }
assert.notEqual(cia.read(1) & (1 << 5), 0, "F3 must release after a tap");

const f5 = buttons[2];
f5.dispatch("pointerdown");
assert.equal(cia.read(1) & (1 << 6), 0);
f5.dispatch("pointercancel");
now += 130;
for (const [id, callback] of [...timers]) { timers.delete(id); callback(); }
assert.notEqual(cia.read(1) & (1 << 6), 0, "Cancelled F5 must not remain stuck");

const f7 = buttons[3];
f7.dispatch("pointerdown");
ctx.heldMatrixKeys.set("F7", {col: 0, row: 3});
now += 130;
f7.dispatch("pointerup");
assert.equal(cia.read(1) & (1 << 3), 0, "Physical F7 hold must survive touch release");
ctx.heldMatrixKeys.clear();
cia.setKey(0, 3, false);
assert.equal(cia.read(1), 0xff, "All function keys must be released");
console.log("PASS: C64 physical function-key matrix and mobile pointer press/tap/cancel/release");
