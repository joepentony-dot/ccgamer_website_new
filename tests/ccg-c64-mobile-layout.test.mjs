#!/usr/bin/env node
"use strict";
import assert from "node:assert/strict";
import fs from "node:fs";
const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
const css = fs.readFileSync("resources/css/ccg-c64-emulator.css", "utf8");
const html = fs.readFileSync("emulator/c64/index.html", "utf8");

assert(html.includes('name="viewport"'), "Mobile viewport metadata required");
assert(html.includes('class="ccg-c64-touch-controls"'), "Mobile joystick must remain present");
assert(html.includes('data-online-library-load'), "Select-then-LOAD control must survive");
assert(html.includes('data-online-library-disk-swap'), "Disk swap must remain available");
assert(app.includes('"(max-width: 760px)"') && app.includes('"(pointer: coarse)"'),
  "Fullscreen must detect narrow or coarse-touch devices");
assert(app.includes('document.querySelector(".ccg-c64-console") || screenStage'),
  "Mobile fullscreen must include the console and touch joystick");
assert(app.includes('else await screenStage.requestFullscreen') === false,
  "The old screen-only fullscreen path must not be used for all devices");
assert(app.includes("const fullscreenTarget = touchLayout") &&
  app.includes("await fullscreenTarget.requestFullscreen"),
  "Desktop must keep its original screen-stage fullscreen target");
assert(css.includes(".ccg-c64-console:fullscreen .ccg-c64-touch-controls"),
  "Mobile fullscreen must show touch direction and fire controls");
assert(css.includes(".ccg-c64-library-suggestions") && css.includes("z-index: 90"),
  "Mobile autocomplete must float over the lower controls");
assert(css.includes('font-size: 16px;'), "Search input must avoid mobile browser text zoom");
assert(css.includes("(pointer: coarse) and (orientation: landscape) and (max-width: 1100px)"),
  "Landscape phones with wide CSS viewports must be supported");
assert(css.includes("env(safe-area-inset-bottom)"), "Mobile safe areas must be respected");
assert(css.includes("grid-template-columns: minmax(0, 1fr) minmax(176px, 33%)"),
  "Landscape fullscreen must keep the picture and on-screen controls side by side");
assert(css.includes(".ccg-c64-screen-stage:fullscreen"),
  "Existing desktop fullscreen picture must be preserved");
assert(css.includes("min-height: 44px"), "Touch controls must have accessible tap targets");
assert(app.includes("function positionOnlineLibraryForViewport()"),
  "Mobile layout must move the existing game library beneath the display");
assert(app.includes('screenStage.insertAdjacentElement("afterend", onlineLibraryPanel)'),
  "The library must appear directly after the C64 screen without scrolling past controls");
assert(app.includes("libraryDesktopAnchor.parentNode.insertBefore(onlineLibraryPanel"),
  "The original desktop library position must be restored on wider screens");
assert(app.includes('mobileLibraryMedia.addEventListener("change", positionOnlineLibraryForViewport)'),
  "Switching between portrait/landscape and desktop layouts must reflow the same library");
assert(css.includes(".ccg-c64-console:fullscreen > .ccg-c64-panel--library"),
  "The library must not cover touch-gameplay fullscreen");
assert(css.includes(".ccg-c64-console > .ccg-c64-screen-foot") &&
       css.includes(".ccg-c64-console > .ccg-c64-stage-note"),
  "Mobile should not require scrolling past drag-drop instructions to find games");
console.log("PASS C64 phone portrait/landscape and touch fullscreen responsive source contracts.");
