#!/usr/bin/env node
"use strict";

// Regression protection for the mobile eight-way C64 joystick.
// Execute the actual pointer handlers in a controlled event environment.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const html = read("emulator/c64/index.html");
const css = read("resources/css/ccg-c64-emulator.css");
const app = read("js/ccg-c64/app.js");
const masks = [5, 1, 9, 4, 8, 6, 2, 10];
const expected = [[5, 1, 9], [4, 0, 8], [6, 2, 10]];

const section = html.match(/<div class="ccg-c64-touch-dpad"[^>]*>([\s\S]*?)<\/div>/);
assert(section, "Mobile joystick must be present");
assert.deepEqual([...section[1].matchAll(/data-joy-mask="(\d+)"/g)].map(m => +m[1]),
  masks, "Eight joystick directions must occupy the correct 3×3 positions");
assert(css.includes(".ccg-c64-touch-dpad button.is-pressed"),
  "Held directions must visibly highlight");
assert(css.includes(".ccg-c64-touch-dpad .ccg-c64-touch-diagonal"),
  "Diagonal styling must remain scoped to the C64 touch pad");
assert(html.includes('class="ccg-c64-touch-fire" data-joy-mask="16"'),
  "Independent FIRE action must be preserved");
assert(html.includes('class="ccg-c64-touch-jump" data-joy-mask="1"'),
  "Independent JUMP action must be preserved");
assert(app.includes("if (touchDpad?.contains(button)) continue;"),
  "Directional buttons must not receive conflicting legacy pointer handlers");

const from = app.indexOf("// Mobile D-pad: one captured pointer");
const to = app.indexOf('for (const button of document.querySelectorAll("[data-joy-mask]"))', from);
assert(from !== -1 && to > from, "Eight-way joystick source section must exist");

const listeners = new Map();
const visual = new Map();
const touchPad = {
  querySelectorAll() {
    return masks.map(mask => ({
      dataset: { joyMask: String(mask) },
      classList: {
        toggle(name, on) { if (name === "is-pressed") visual.set(mask, on); },
        remove(name) { if (name === "is-pressed") visual.set(mask, false); },
      },
      setAttribute() {},
    }));
  },
  addEventListener(type, fn) {
    const callbacks = listeners.get(type) || [];
    callbacks.push(fn);
    listeners.set(type, callbacks);
  },
  getBoundingClientRect() {
    return { left: 20, top: 40, right: 320, bottom: 340, width: 300, height: 300 };
  },
  setPointerCapture() {},
};
const holds = new Map();
const fireButton = {};
let syncs = 0;
const context = vm.createContext({
  document: { querySelector: selector => selector === ".ccg-c64-touch-dpad" ? touchPad : null },
  touchHeldButtons: holds,
  syncTouchJoystick() { syncs++; },
  inputStatus: { textContent: "" },
  joystickPort: 2,
  gamepadConnected: false,
  touchHeldMask: 0,
});
vm.runInContext(app.slice(from, to) +
  "\nglobalThis.getMaskAt = touchDpadMaskAt; globalThis.resetPad = resetTouchDpadUi;", context);

for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
  const actual = context.getMaskAt(20 + col * 100 + 50, 40 + row * 100 + 50);
  assert.equal(actual, expected[row][col], "Incorrect C64 direction mask at cell " + row + "," + col);
}
assert.equal(context.getMaskAt(-1, -1), 0, "Outside control must be neutral");
function event(type, x, y, pointerId = 11) {
  const evt = { pointerId, pointerType: "touch", clientX: x, clientY: y,
    preventDefault() {} };
  for (const callback of listeners.get(type) || []) callback(evt);
}
function expectMask(mask) {
  assert.equal(holds.get(touchPad)?.mask || 0, mask);
  for (const [direction, active] of visual) assert.equal(active, direction === mask);
}

// Single-thumb diagonal directions and dragging without lifting.
event("pointerdown", 70, 90);
expectMask(5);
assert(visual.get(5), "Active diagonal must illuminate");
event("pointermove", 170, 90);
expectMask(1);
event("pointermove", 270, 290);
expectMask(10);
event("pointermove", 170, 190);
expectMask(0);
event("pointermove", 70, 290);
expectMask(6);

// A second finger must not steal the D-pad; independent FIRE must survive movement/release.
event("pointerdown", 270, 90, 12);
expectMask(6);
holds.set(fireButton, { mask: 16, pointerId: 12 });
event("pointerup", 70, 290);
expectMask(0);
assert.equal(holds.get(fireButton).mask, 16, "Releasing the pad must not release FIRE");
holds.delete(fireButton);

// Capture loss, cancellation, power-off reset, outside-zone neutralisation.
event("pointerdown", 270, 90);
expectMask(9);
event("pointercancel", 270, 90);
expectMask(0);
event("pointerdown", 270, 190);
expectMask(8);
event("lostpointercapture", 270, 190);
expectMask(0);
event("pointerdown", 70, 190);
expectMask(4);
event("pointermove", 500, 500);
expectMask(0);
event("pointermove", 270, 290);
expectMask(10);
context.resetPad();
assert([...visual.values()].every(active => !active), "Reset must clear all pressed styling");
assert(syncs >= 10, "Touch input must synchronise with the actual joystick pipeline");
console.log("Eight-way mobile joystick regression tests passed.");
