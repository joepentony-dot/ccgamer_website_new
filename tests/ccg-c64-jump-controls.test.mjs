#!/usr/bin/env node
"use strict";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  combinedTouchMask, controlGameKey, defaultJumpEnabled, jumpProfileForGame,
} from "../js/ccg-c64/mobile-controls.js";

const html = fs.readFileSync("emulator/c64/index.html", "utf8");
const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
const css = fs.readFileSync("resources/css/ccg-c64-emulator.css", "utf8");

// Documented UP-to-jump titles, documented non-jump controls, and unverified
// games must have distinct profiles without scanning opaque C64 media bytes.
assert.equal(jumpProfileForGame({ title: "Bruce Lee Trilogy" }), "up-jump");
assert.equal(jumpProfileForGame({ title: "Bruce Lee II" }), "up-jump");
assert.equal(jumpProfileForGame({ title: "Kung-Fu Master" }), "up-jump");
assert.equal(jumpProfileForGame({ title: "Paradroid" }), "other");
assert.equal(defaultJumpEnabled({ title: "Uridium" }), false);
assert.equal(jumpProfileForGame({ title: "Some Unknown Title" }), "unverified");
assert.equal(defaultJumpEnabled({ title: "Some Unknown Title" }), true);
assert.notEqual(controlGameKey({id: "a",title: "Game"}),controlGameKey({id: "b",title: "Game"}));
assert.equal(controlGameKey({title: "Game.D64"}),controlGameKey({title: "Game"}));

// Simulate the actual pointer-ownership cases used for the D-pad and JUMP.
// Releasing one of two UP touches must not drop the other's UP direction.
const held = new Map();
held.set(11, {mask:1,button:"D-pad UP"});
held.set(22, {mask:1,button:"JUMP"});
held.set(33, {mask:8,button:"RIGHT"});
held.set(44, {mask:16,button:"FIRE"});
assert.equal(combinedTouchMask(held), 25);
held.delete(11);
assert.equal(combinedTouchMask(held), 25);
held.delete(22);
assert.equal(combinedTouchMask(held), 24);
held.delete(33);
held.delete(44);
assert.equal(combinedTouchMask(held), 0);

assert.match(html, /class="ccg-c64-touch-jump" data-joy-mask="1"/);
assert.match(html, /class="ccg-c64-touch-fire" data-joy-mask="16"/);
assert.match(html, /<details class="ccg-c64-touch-extras">/);
assert.match(html, /data-jump-toggle/);
assert.match(html, /data-jump-auto/);
for (const key of ["F1","F3","F5","F7"]) {
  assert(html.includes(`data-c64-fkey="${key}"`));
}
assert(app.includes("touchPointerHolds.set(event.pointerId, { button, mask })"));
assert(app.includes("touchPointerHolds.delete(event.pointerId)"));
assert(app.includes("touchPointerHolds.clear()"));
assert(app.includes("combinedTouchMask(touchPointerHolds)"));
assert(app.includes('button.addEventListener("pointercancel", release)'));
assert(app.includes('button.addEventListener("lostpointercapture", release)'));
assert(app.includes("setActiveControlGame(entry)"));
assert(app.includes('id: "local:" + file.name'));
assert(app.includes('localStorage.setItem(JUMP_OVERRIDES_KEY, JSON.stringify(jumpOverrides))'));
assert(css.includes(".ccg-c64-touch-jump[hidden]"));
assert(css.includes(".ccg-c64-console:fullscreen .ccg-c64-touch-actions"));
assert(css.includes(".ccg-c64-touch-extras .ccg-c64-touch-fkeys"));
console.log("PASS: C64 UP-as-JUMP profiles, saved per-game controls, multi-touch and mobile responsive source contracts.");
