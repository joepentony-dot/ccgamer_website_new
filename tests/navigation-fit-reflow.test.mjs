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
