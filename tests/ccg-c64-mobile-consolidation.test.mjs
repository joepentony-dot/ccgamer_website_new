#!/usr/bin/env node
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { KEY_MAP, CHAR_MAP } from "../js/ccg-c64/core/cia.js";

const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
const html = fs.readFileSync("emulator/c64/index.html", "utf8");
const css = fs.readFileSync("resources/css/ccg-c64-emulator.css", "utf8");
const start = app.indexOf("const mobileKeyRows = [");
const stop = app.indexOf("\nfunction syncMobileMatrixBit(", start);
assert.ok(start >= 0 && stop > start, "Existing mobile C64 keyboard owner must survive");
const { rows, binding } = Function("KEY_MAP", "CHAR_MAP",
  app.slice(start, stop) + "\nreturn { rows: mobileKeyRows, binding: mobileVirtualBinding };"
)(KEY_MAP, CHAR_MAP);

test("secondary mobile function keys are genuine shifted C64 matrix keys", () => {
  for (const [code, original] of [["F2","F1"],["F4","F3"],["F6","F5"],["F8","F7"]]) {
    const target = binding(code);
    const matrix = KEY_MAP[original];
    assert.ok(rows.some(row => row.some(([, key]) => key === code)), code + " button missing");
    assert.equal(target.col, matrix[0], code + " must use the base C64 column");
    assert.equal(target.row, matrix[1], code + " must use the base C64 row");
    assert.equal(target.shift, true, code + " must press genuine C64 shift");
  }
});

test("existing mobile keyboard, NMI, ordinary keys and app controls survive", () => {
  for (const key of ["F1","F3","F5","F7","F9","F12","Enter","Space"]) {
    assert.ok(binding(key), "Missing original input " + key);
  }
  assert.equal(binding("F12").restore, true, "RESTORE must retain NMI semantics");
  assert.match(app, /if \(held\.shift\) syncMobileMatrixBit\(1, 7\)/,
    "Shifted virtual key must hold the real CIA Shift bit");
  assert.match(app, /for \(const type of \["pointerup", "pointercancel", "lostpointercapture"\]\)/,
    "Pointer cancellation must release the keys");
  assert.match(app, /releaseMobileVirtualKeys\(\)/,
    "Closing the keyboard and reset must release its held keys");
  assert.match(html, /data-mobile-keyboard-toggle/);
  assert.match(html, /data-mobile-save-state/);
  assert.match(html, /data-mobile-load-state/);
  assert.match(html, /data-mobile-crt-mode/);
  assert.match(html, /class="ccg-c64-touch-fire" data-joy-mask="16"/);
  assert.match(html, /class="ccg-c64-touch-jump" data-joy-mask="1"/);
  assert.match(css, /\.ccg-c64-mobile-keyboard-row button/);
  assert.match(css, /\.ccg-c64-mobile-keyboard-row button\.is-pressed/);
});