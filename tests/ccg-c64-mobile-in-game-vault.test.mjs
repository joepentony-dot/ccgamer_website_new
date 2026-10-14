#!/usr/bin/env node
"use strict";
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync("emulator/c64/index.html", "utf8");
const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
const css = fs.readFileSync("resources/css/ccg-c64-emulator.css", "utf8");

test("mobile playbar has pause, save and load without removing existing controls", () => {
  for (const selector of [
    "data-mobile-exit-game", "data-mobile-zoom-toggle",
    "data-mobile-keyboard-toggle", "data-mobile-pause",
    "data-mobile-save-state", "data-mobile-load-state",
    "data-mobile-vault-panel", "data-mobile-vault-slots",
    "data-mobile-vault-message", "data-mobile-vault-close",
    "data-mobile-crt-mode", "data-mobile-warp-load",
    "data-mobile-joystick-swap", "ccg-c64-touch-fire", "ccg-c64-touch-jump",
  ]) assert.ok(html.includes(selector), "Missing control: " + selector);
  assert.ok(!html.includes("data-jump-toggle"), "Mobile gameplay must not require a JUMP switch");
  assert.ok(css.includes("@media (pointer: coarse)"), "Do not affect desktop pointer layouts");
  assert.ok(css.includes(".ccg-c64-mobile-vault[hidden]"), "Modal must stay hidden when inactive");
});

test("mobile quick save/load uses existing same-game IndexedDB path", () => {
  assert.match(app, /gameVault\.loadGame\(currentSessionGame\.gameKey, slot\)/);
  assert.match(app, /vaultGameSelect\.value = "__current__"/);
  assert.match(app, /vaultSlot\.value = String\(slot\)/);
  assert.match(app, /await saveGameVaultSlot\(\)/);
  assert.match(app, /await loadGameVaultSlot\(\)/);
  assert.match(app, /existing && !window\.confirm\(/, "Occupied slots must require confirmation");
  assert.match(app, /mobileVaultAutoPaused = !paused;/, "Save menu must freeze gameplay");
  assert.match(app, /closeMobileVaultPanel\(\{ resume: mode === "save" \}\)/);
});

test("CRT selection and FIRE/JUMP are independent of disk media", () => {
  assert.match(app, /cycleCrtMode\(\)/);
  assert.match(app, /mobileCrtButton\.textContent = "CRT: "/);
  assert.match(app, /Boolean\(mobilePlayActive && mobilePlayMedia\?\.matches\)/);
  assert.match(html, /class="ccg-c64-touch-fire" data-joy-mask="16"/);
  assert.match(html, /class="ccg-c64-touch-jump" data-joy-mask="1"/);
  assert.match(app, /mobilePauseButton\?\.addEventListener\("click"/);
});
