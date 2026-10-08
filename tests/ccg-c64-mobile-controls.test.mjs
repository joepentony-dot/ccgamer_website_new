#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const html = read("emulator/c64/index.html");
const css = read("resources/css/ccg-c64-emulator.css");
const app = read("js/ccg-c64/app.js");

const expected = [
  "Enter", "Space", "F9", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8",
  "Digit1", "Digit2", "Digit3", "Digit4", "KeyS", "KeyY", "KeyN", "F12",
];
for (const code of expected) {
  assert(html.includes('data-c64-virtual-key="' + code + '"'), "Missing mobile C64 key " + code);
}
assert(html.includes("data-mobile-fullscreen") && html.includes("data-mobile-fullscreen-exit"),
  "Mobile play and exit buttons must be accessible in the console");
assert(html.includes("ccg-c64-touch-controls") && html.includes('data-joy-mask="16"'),
  "Touch joystick and FIRE must remain part of the fullscreen-capable console");
assert(css.includes("@media (pointer: coarse)") &&
  css.includes("body.ccg-c64-mobile-playing") &&
  css.includes(".ccg-c64-console.is-mobile-theater") &&
  css.includes(".ccg-c64-console:fullscreen"),
  "Both mobile fullscreen strategies must keep the joystick and keyboard in view");
assert(css.includes("(orientation: landscape)") &&
  css.includes("grid-template-areas: \"game pad\" \"keys pad\""),
  "Mobile landscape must devote a distinct playable area to the C64 picture");
assert(css.includes("font-size: 16px") &&
  css.includes(".ccg-c64-library-suggestions.is-drop-up"),
  "iOS search zoom and virtual-keyboard suggestion clipping must be addressed");
assert(app.includes("window.visualViewport?.addEventListener(\"resize\"") &&
  app.includes("positionLibrarySuggestions()"),
  "Suggestions must reposition when the phone keyboard changes the visible viewport");
assert(app.includes("document.fullscreenElement !== mobileGameConsole") &&
  app.includes('document.fullscreenElement !== screenStage'),
  "Touch fullscreen must fit the game aspect ratio without changing desktop fullscreen");

function slice(from, to) {
  const start = app.indexOf(from);
  const end = app.indexOf(to, start);
  assert(start >= 0 && end > start, "Missing C64 runtime code " + from);
  return app.slice(start, end);
}

// Real virtual button handlers must send press AND release through the existing
// C64 CIA route. Touches must not turn into extra generated click presses.
const virtualSection = slice('for (const button of document.querySelectorAll("[data-c64-virtual-key]")) {',
  'function syncMobileFullscreenUi() {');
const observed = [];
function fakeKey(code) {
  const handlers = new Map();
  return {
    code, handlers, classList: {
      add() {}, remove() {}
    },
    getAttribute(name) { assert.equal(name, "data-c64-virtual-key"); return code; },
    addEventListener(name, fn) { handlers.set(name, fn); },
    setPointerCapture() {},
  };
}
const buttons = ["F2", "F9", "Enter", "Space", "F12"].map(fakeKey);
const touch = vm.createContext({
  document: { querySelectorAll() { return buttons; } },
  screen: { tagName: "CANVAS" },
  handleC64Key(ev, pressed) {
    observed.push({ code: ev.code, pressed, virtual: ev.ccgVirtual, key: ev.key });
  },
});
vm.runInContext(virtualSection, touch);
for (const button of buttons) {
  const pointer = { pointerId: 1, preventDefault() {} };
  button.handlers.get("pointerdown")(pointer);
  button.handlers.get("pointerup")(pointer);
  button.handlers.get("click")({ detail: 1 }); // no duplicate native click
}
assert.equal(observed.length, 10);
for (let i = 0; i < observed.length; i += 2) {
  assert.deepEqual([observed[i].code, observed[i].pressed, observed[i].virtual],
    [buttons[i / 2].code, true, true]);
  assert.deepEqual([observed[i + 1].code, observed[i + 1].pressed, observed[i + 1].virtual],
    [buttons[i / 2].code, false, true]);
}
buttons[0].handlers.get("click")({ detail: 0 }); // assistive keyboard activation
assert.equal(observed.length, 12);
assert.equal(observed[10].code, "F2");
assert.equal(observed[11].pressed, false);

// Safari fallback must be reversible and cannot trap users in fullscreen.
const fullSection = slice("function syncMobileFullscreenUi() {",
  'mobileFullscreenButton?.addEventListener("click",');
function classList() {
  const values = new Set();
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    contains(value) { return values.has(value); },
    toggle(value, enabled) { if (enabled) values.add(value); else values.delete(value); },
  };
}
const gameConsole = {
  classList: classList(),
  async requestFullscreen() { throw Error("iPhone unsupported"); },
};
const doc = {
  fullscreenElement: null,
  body: { classList: classList() },
  async exitFullscreen() { this.fullscreenElement = null; },
};
const btn = { textContent: "" };
const exitBtn = { hidden: true };
let fitted = 0;
const ctx = vm.createContext({
  mobileGameConsole: gameConsole,
  mobileFullscreenExit: exitBtn,
  mobileFullscreenButton: btn,
  document: doc,
  requestAnimationFrame(callback) { callback(); },
  fitScreenToStage() { fitted++; },
});
vm.runInContext(fullSection + "\nglobalThis.toggleMobile = toggleMobileFullscreen;", ctx);
await ctx.toggleMobile();
assert(gameConsole.classList.contains("is-mobile-theater"));
assert(doc.body.classList.contains("ccg-c64-mobile-playing"));
assert.equal(exitBtn.hidden, false);
assert.equal(btn.textContent, "EXIT FULLSCREEN");
await ctx.toggleMobile();
assert(!gameConsole.classList.contains("is-mobile-theater"));
assert(!doc.body.classList.contains("ccg-c64-mobile-playing"));
assert.equal(exitBtn.hidden, true);
assert(fitted >= 2, "Opening and exiting must refit the game picture");

console.log("PASS C64 mobile keys, touch release, fullscreen fallback/exit, landscape and search UX contracts");
