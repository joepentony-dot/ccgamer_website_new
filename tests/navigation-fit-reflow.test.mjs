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

const bridgeCss = fs.readFileSync("resources/css/ccg-nav-labelled-bridge.css", "utf8");
const globalNav = fs.readFileSync("js/ccg-global.js", "utf8");
const homePage = fs.readFileSync("home.html", "utf8");
const responsiveBrowserAudit = fs.readFileSync("scripts/audit-responsive-browser.js", "utf8");

test("tablets always retain a visible Menu control through the drawer breakpoint", () => {
  assert.match(globalNav, /matchMedia\("\(max-width: 1199px\)"\)/);
  assert.match(bridgeCss, /@media \(max-width: 1199px\)/);
  assert.match(bridgeCss, /\.ccg-header \.ccg-nav-toggle\s*\{[^}]*display:\s*inline-flex\s*!important/);
  assert.match(bridgeCss, /\.ccg-header \.ccg-nav-toggle\s*\{[^}]*visibility:\s*visible\s*!important/);
  assert.match(bridgeCss, /\.ccg-header \.ccg-nav\s*\{[^}]*display:\s*none\s*!important/);
  assert.doesNotMatch(bridgeCss, /\.ccg-header \.ccg-nav-toggle\s*\{[^}]*display:\s*none/);
  assert.doesNotMatch(bridgeCss, /@media \(min-width:\s*1200px\)/);
});

test("tablet header keeps the existing two-row drawer layout and working links", () => {
  assert.match(bridgeCss, /@media \(min-width: 901px\) and \(max-width: 1199px\)/);
  assert.match(bridgeCss, /"brand toggle"[\s\S]*?"actions actions"/);
  assert.match(homePage, /data-ccg-nav-toggle/);
  assert.match(homePage, /data-ccg-nav-drawer/);
  assert.match(homePage, /data-ccg-drawer-primary/);
  assert.match(homePage, /data-ccg-drawer-secondary/);
  assert.match(globalNav, /const buildDrawer = \(\) =>/);
  assert.match(globalNav, /toggle\.addEventListener\("click"/);
  assert.match(globalNav, /drawer\?\.setAttribute\("aria-hidden", "false"\)/);
  assert.match(responsiveBrowserAudit, /1024, height:/);
});
