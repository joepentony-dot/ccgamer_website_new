#!/usr/bin/env node
"use strict";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { KEY_MAP } from "../js/ccg-c64/core/cia.js";

const html = fs.readFileSync("emulator/c64/index.html", "utf8");
const css = fs.readFileSync("resources/css/ccg-c64-emulator.css", "utf8");
const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");

// The emulator and its 1883 game catalogue must remain unchanged.
assert(app.includes('const vault = new ROMVault()'));
assert(!app.includes("readBundledOpenRoms"), "No experimental replacement firmware");
assert(html.includes('data-online-library-load hidden disabled'), "Select then LOAD must remain explicit");
assert(html.includes('data-joy-mask="16"'), "FIRE must remain accessible");
for (const code of ["F1", "F3", "F5", "F7"]) {
  assert(html.includes(`data-c64-fkey="${code}"`), `Always-accessible ${code} missing`);
}
for (const code of ["F2","F4","F6","F8","Enter","Space","F9","F12","KeyS","KeyY","KeyN"]) {
  assert(html.includes(`data-c64-virtual-key="${code}"`), `Additional C64 ${code} missing`);
}
assert(html.includes('data-touch-extra-keys'), "Other keys must fit a collapsed panel");
assert(html.includes('data-mobile-fullscreen-exit hidden'), "Fullscreen needs a visible exit");
assert(css.includes(".ccg-c64-console.is-mobile-theater"), "Fallback fullscreen must preserve touch play");
assert(css.includes(".ccg-c64-console > .ccg-c64-panel--library"), "Game library must sit below screen");
assert(css.includes(".ccg-c64-console:fullscreen > .ccg-c64-panel--library"),
  "Fullscreen must hide the game-search form");
assert(app.includes('mobileLibraryViewport.addEventListener("change", positionMobileGameLibrary)'),
  "Switching to desktop must restore the original library panel");
assert(app.includes('screenStage.insertAdjacentElement("afterend", onlineLibraryPanel)'),
  "On phones game search must appear immediately beneath the picture");
assert(app.includes('libraryDesktopPosition.parentNode.insertBefore(onlineLibraryPanel'),
  "Desktop library must return to original panel grid");
assert(app.includes('onlineLibrarySearch?.blur()') &&
       app.includes('screenStage?.scrollIntoView?.({ block: "start", behavior: "smooth" })'),
  "Loading a selected game on a phone should return to the C64 display");
assert(css.includes("ccg-c64-library-suggestions.is-drop-up"), "Search must flip when keyboard blocks results");

// Actually trigger touch pointer events. The secondary key route must use
// physical C64 key identities (including shifted F2/F4/F6/F8) and must release.
class FakeButton {
  constructor(code) {
    this.code = code;
    this.listeners = {};
    this.pressed = false;
    this.classList = {
      add: () => { this.pressed = true; },
      remove: () => { this.pressed = false; },
    };
  }
  getAttribute(name) { assert.equal(name, "data-c64-virtual-key"); return this.code; }
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  dispatch(name, detail = 1) {
    for (const fn of this.listeners[name] || [])
      fn({ preventDefault() {}, pointerId: 1, detail });
  }
  setPointerCapture() {}
}
const keys = ["F2","F4","F6","F8","Enter","Space","F9","F12","KeyS"];
const buttons = keys.map(code => new FakeButton(code));
let clock = 1000, timerId = 0;
const timers = new Map(), events = [];
const holds = new Map();
const context = {
  document: { querySelectorAll(sel) { assert.equal(sel, "[data-c64-virtual-key]"); return buttons; } },
  touchVirtualKeyHolds: holds,
  running: true, paused: false, machine: {}, setup: { hidden: true },
  screen: {}, performance: { now: () => clock },
  setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
  clearTimeout(id) { timers.delete(id); },
  handleC64Key(event, pressed) { events.push([event.code, pressed, event.ccgVirtual]); }
};
const start = app.indexOf("// Secondary mobile keys share");
const end = app.indexOf("function syncMobileFullscreenUi()", start);
assert(start !== -1 && end > start, "Touch virtual keyboard source not found");
vm.runInNewContext(app.slice(start, end), vm.createContext(context));

for (const button of buttons) {
  button.dispatch("pointerdown");
  assert(button.pressed, `${button.code} should be held`);
  button.dispatch("pointerup");
  assert(button.pressed, "Rapid taps must survive a C64 keyboard scan");
  clock += 140;
  for (const [id, fn] of [...timers]) { timers.delete(id); fn(); }
  assert(!button.pressed, `${button.code} must release`);
}
for (const code of keys) {
  assert(events.some(([key, pressed, virtual]) => key === code && pressed && virtual), `${code} keydown missing`);
  assert(events.some(([key, pressed, virtual]) => key === code && !pressed && virtual), `${code} keyup missing`);
}
for (const shifted of ["F2","F4","F6","F8"]) {
  const oddCode = "F" + (Number(shifted.slice(1)) - 1);
  assert(KEY_MAP[oddCode], `${shifted} must have a real shifted C64 matrix key`);
}
buttons[0].dispatch("pointerdown");
buttons[0].dispatch("pointercancel");
clock += 140;
for (const [id, fn] of [...timers]) { timers.delete(id); fn(); }
assert(!buttons[0].pressed, "Cancelled touch must not stick");
console.log("PASS C64 phone game library priority, ROM isolation, touch keys, fullscreen and virtual key release");
