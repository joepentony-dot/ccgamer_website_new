import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("js/ccg-global.js", "utf8");

test("header height measurement is deferred past the current mutation batch", () => {
  const fn = source.match(/function setHeaderHeightVar\(\) \{[\s\S]*?\n    \}/)?.[0] || "";
  assert.match(source, /let headerHeightFrame = 0/);
  assert.match(source, /let lastHeaderHeight = -1/);
  assert.match(fn, /requestAnimationFrame/);
  assert.match(fn, /if \(headerHeightFrame\) return/);
  assert.match(fn, /getBoundingClientRect\(\)\.height/);
  assert.match(fn, /if \(h === lastHeaderHeight\) return/);
  assert.match(fn, /style\.setProperty\("--ccg-header-height"/);
});

test("mobile hardening schedules measurement after its style writes", () => {
  const fn = source.match(/function syncMobileHardening\(\) \{[\s\S]*?\n    \}/)?.[0] || "";
  const containIndex = fn.indexOf("containHeaderOnMobile()");
  const measureIndex = fn.indexOf("setHeaderHeightVar()");
  assert.ok(containIndex >= 0 && measureIndex > containIndex);
  assert.doesNotMatch(fn, /getBoundingClientRect/);
});
