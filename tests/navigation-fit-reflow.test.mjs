import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("js/ccg-nav-fit.js", "utf8");
const css = fs.readFileSync("resources/css/ccg-nav-fit.css", "utf8");

test("desktop nav fitting reuses one header bounds measurement", () => {
  assert.match(source, /function measureFitBounds\(header\)/);
  assert.match(source, /const fitBounds = measureFitBounds\(header\)/);
  assert.match(source, /isOverflowing\(nav, fitBounds\)/);
  assert.doesNotMatch(source, /function availableWidth\(header\)/);
  assert.doesNotMatch(source, /isOverflowing\(header, nav\)/);
});

test("runtime no longer toggles redundant compact and tight density classes", () => {
  assert.doesNotMatch(source, /classList\.add\("ccg-nav--fit-compact"\)/);
  assert.doesNotMatch(source, /classList\.add\("ccg-nav--fit-tight"\)/);
  assert.match(css, /FIRST-FRAME DESKTOP DENSITY CONTRACT/);
  assert.match(css, /--ccg-nav-control-size/);
});

test("streamlined desktop nav preserves every destination in More and avoids menu clipping", () => {
  assert.match(source, /STREAMLINED_MORE_LABELS = new Set/);
  assert.match(source, /PINNED_MORE_LABELS\.has\(label\) \|\| STREAMLINED_MORE_LABELS\.has\(label\)/);
  for (const href of ["/emulator/c64/", "/videos/"]) {
    assert.ok(source.includes('"' + href + '"'), "Missing direct More route " + href);
  }
  assert.match(css, /\.ccg-nav \.ccg-nav__list--secondary\s*\{\s*display:\s*none\s*!important/);
  assert.match(css, /max-height:\s*min\(70vh, 560px\)/);
  assert.match(css, /overflow-y:\s*auto\s*!important/);
});
