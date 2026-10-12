#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(root, "js/ccg-c64/app.js"), "utf8");
const start = app.indexOf("const iosLibraryTouch = ");
const end = app.indexOf('onlineLibraryLoadButton?.addEventListener("click"', start);
const focusStart = app.indexOf('onlineLibrarySearchWrap?.addEventListener("focusout"', end);
const focusEnd = app.indexOf('document.addEventListener("pointerdown"', focusStart);
assert.ok(start >= 0 && end > start && focusStart > end && focusEnd > focusStart);
const tapCode = app.slice(start, end) + "\n" + app.slice(focusStart, focusEnd);
assert.match(app, /function selectOnlineLibraryEntry\(id, focusLoadButton = true\)/);
assert.match(app, /if \(focusLoadButton\) onlineLibraryLoadButton\?\.focus\(\)/);

function harness({ ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4) AppleWebKit/605.1.15", platform = "iPhone", points = 5 } = {}) {
  const listeners = {};
  const selection = [];
  const closes = [];
  const button = { textContent: "LOAD & AUTO START", attrs: {}, setAttribute(key, value) { this.attrs[key] = value; } };
  const grid = {
    addEventListener(name, handler, options) {
      (listeners[name] ||= []).push({ handler, options });
    }
  };
  const wrap = {
    addEventListener: grid.addEventListener,
    contains(target) { return target?.inside === true; }
  };
  const context = {
    navigator: { userAgent: ua, platform, maxTouchPoints: points },
    onlineLibraryGrid: grid,
    loadAnyMediaButton: button,
    onlineLibrarySearchWrap: wrap,
    selectOnlineLibraryEntry: (...args) => selection.push(args),
    setLibrarySuggestionsOpen: (open) => closes.push(open),
    Math, Array,
  };
  vm.runInNewContext(tapCode, context, { filename: "ccg-c64-ios-game-selection.js" });
  function fire(name, data) {
    for (const item of listeners[name] || []) item.handler(data);
  }
  function option(id = "bruce-lee-trilogy") {
    return {
      closest: selector => selector === "[data-play-game]" ? { dataset: { playGame: id }, disabled: false } : null
    };
  }
  function touch(identifier, x, y) { return { identifier, clientX: x, clientY: y }; }
  return { listeners, selection, closes, button, fire, option, touch };
}

test("iPhone touch selects game even when focusout happens before touchend/click", () => {
  const h = harness();
  const target = h.option();
  h.fire("touchstart", { touches: [h.touch(9, 30, 40)], target });
  h.fire("focusout", { relatedTarget: null });
  assert.equal(h.closes.length, 0, "Safari input blur must not hide the dropdown during touch");
  let prevented = false;
  h.fire("touchend", {
    changedTouches: [h.touch(9, 33, 42)],
    target,
    preventDefault() { prevented = true; }
  });
  assert.equal(prevented, true, "Safari's later synthetic click must be suppressed");
  assert.equal(h.selection.length, 1);
  assert.equal(h.selection[0][0], "bruce-lee-trilogy");
  assert.equal(h.selection[0][1], false, "iPhone must not scroll to LOAD by synthetic focus");
});

test("iPhone early blur after pointerdown does not dismiss the dropdown", () => {
  const h = harness(), target = h.option();
  h.fire("pointerdown", { pointerType: "touch", target });
  h.fire("focusout", { relatedTarget: null });
  assert.equal(h.closes.length, 0);
  h.fire("touchstart", { touches: [h.touch(9, 30, 40)], target });
  h.fire("touchend", { changedTouches: [h.touch(9, 30, 40)], target, preventDefault() {} });
  assert.equal(h.selection.length, 1);
});

test("Scrolling iPhone suggestions never selects a game", () => {
  const h = harness(), target = h.option();
  h.fire("touchstart", { touches: [h.touch(8, 30, 40)], target });
  h.fire("touchmove", { touches: [h.touch(8, 30, 100)] });
  h.fire("touchend", {
    changedTouches: [h.touch(8, 30, 100)],
    target,
    preventDefault() { throw new Error("Scrolling must not be prevented"); }
  });
  assert.equal(h.selection.length, 0);
});

test("A cancelled iPhone touch never selects a game", () => {
  const h = harness(), target = h.option();
  h.fire("touchstart", { touches: [h.touch(8, 30, 40)], target });
  h.fire("touchcancel", {});
  h.fire("touchend", { changedTouches: [h.touch(8, 30, 40)], target, preventDefault() {} });
  assert.equal(h.selection.length, 0);
});

test("Mismatched and multi-finger iPhone touches cannot select", () => {
  const h = harness(), target = h.option();
  h.fire("touchstart", { touches: [h.touch(8, 30, 40), h.touch(9, 40, 40)], target });
  h.fire("touchend", { changedTouches: [h.touch(8, 30, 40)], target, preventDefault() {} });
  assert.equal(h.selection.length, 0);
  h.fire("touchstart", { touches: [h.touch(8, 30, 40)], target });
  h.fire("touchend", { changedTouches: [h.touch(8, 30, 40)], target: h.option("paradroid"), preventDefault() {} });
  assert.equal(h.selection.length, 0);
});

test("Android Chrome keeps its unchanged click path and original file button", () => {
  const h = harness({ ua: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120", platform: "Linux armv8", points: 5 });
  assert.ok(!h.listeners.touchstart, "Android must not install the iOS override");
  assert.equal(h.button.textContent, "LOAD & AUTO START");
  assert.equal(h.selection.length, 0);
  assert.match(app, /onlineLibraryGrid\?\.addEventListener\("click", \(event\) => \{/);
  assert.match(app, /if \(id\) selectOnlineLibraryEntry\(id\);/);
});

test("Windows desktop retains selection click path and existing file picker", () => {
  const h = harness({ ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120", platform: "Win32", points: 0 });
  assert.ok(!h.listeners.touchstart);
  assert.equal(h.button.textContent, "LOAD & AUTO START");
});

test("Desktop-mode iPadOS also receives the touch fix", () => {
  const h = harness({ ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15", platform: "MacIntel", points: 5 });
  assert.ok(h.listeners.touchstart);
  assert.equal(h.button.textContent, "OPEN LOCAL GAME FILE");
});
