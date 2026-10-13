#!/usr/bin/env node
"use strict";

// Android and iPhone controls must not open the text selection toolbar from
// long presses. Keep text editing/search and desktop native behaviour intact.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("resources/css/ccg-c64-emulator.css");
const app = read("js/ccg-c64/app.js");
const html = read("emulator/c64/index.html");

const cssStart = css.indexOf("/* Phones/tablets: emulator buttons are controls");
const cssEnd = css.indexOf("/* Header", cssStart);
assert.ok(cssStart >= 0 && cssEnd > cssStart, "Mobile-only selection guard CSS must exist");
const style = css.slice(cssStart, cssEnd);
for (const selector of [
  "@media (pointer: coarse)",
  "body.ccg-c64-lab-body button,",
  "body.ccg-c64-lab-body button *,",
  "body.ccg-c64-lab-body summary,",
  "body.ccg-c64-lab-body summary *",
]) {
  assert.ok(style.includes(selector), "Missing scoped touch-selection guard: " + selector);
}
for (const declaration of [
  "-webkit-user-select: none;",
  "user-select: none;",
  "-webkit-touch-callout: none;",
]) {
  assert.ok(style.includes(declaration), "Missing mobile selection suppression: " + declaration);
}
assert.doesNotMatch(style, /touch-action\s*:/, "Never override established D-pad/touch-action behaviours");
assert.doesNotMatch(style, /\b(?:input|textarea|select)\s*[,{}]/,
  "Real form fields must keep native text editing and selection");
assert.match(css, /\.ccg-c64-touch-dpad button,[\s\S]*?touch-action: none;/,
  "D-pad must keep touch-action none");
assert.match(html, /data-online-library-search/, "Game search must remain available");

const start = app.indexOf("// BEGIN C64 MOBILE BUTTON SELECTION GUARD");
const end = app.indexOf("// END C64 MOBILE BUTTON SELECTION GUARD", start);
assert.ok(start >= 0 && end > start, "Mobile-only JavaScript selection guard must exist");
const snippet = app.slice(start, end);
assert.doesNotMatch(snippet, /(?:touchstart|touchend|pointerdown|pointerup|click)/,
  "Selection guard must not change native game button press events");

function harness(coarse) {
  const listeners = new Map();
  vm.runInNewContext(snippet, {
    mobilePlayMedia: { matches: coarse },
    document: {
      addEventListener(name, listener, capture) {
        assert.equal(capture, true, "The guard must intercept browser callouts in capture phase");
        listeners.set(name, listener);
      },
    },
  });
  function target(kind, onEmulatorPage = true, nested = false) {
    let control;
    control = {
      nodeType: 1,
      closest(selector) {
        if (selector === "button, summary") return kind === "button" || kind === "summary" ? control : null;
        if (selector === "body.ccg-c64-lab-body") return onEmulatorPage ? { tagName: "BODY" } : null;
        return null;
      },
    };
    if (!nested) return control;
    return {
      nodeType: 1,
      closest(selector) {
        return selector === "button, summary" ? control : null;
      },
    };
  }
  function fire(name, element) {
    let prevented = 0;
    listeners.get(name)?.({
      target: element,
      preventDefault() { prevented += 1; },
    });
    return prevented;
  }
  return { listeners, target, fire };
}

test("Android/iPhone: FIRE, JUMP, mobile menu and virtual-key long press do not select text", () => {
  const h = harness(true);
  for (const event of ["selectstart", "contextmenu"]) {
    for (const control of ["button", "summary"]) {
      assert.equal(h.fire(event, h.target(control)), 1, event + " blocked on " + control);
      assert.equal(h.fire(event, h.target(control, true, true)), 1, event + " blocked on nested label");
    }
  }
});

test("Game search and real native inputs remain selectable/editable", () => {
  const h = harness(true);
  for (const kind of ["input", "textarea", "select", "div", "p"]) {
    for (const event of ["selectstart", "contextmenu"]) {
      assert.equal(h.fire(event, h.target(kind)), 0, "Do not intercept " + kind + " " + event);
    }
  }
});

test("Controls elsewhere on website are not intercepted by emulator-specific guard", () => {
  const h = harness(true);
  assert.equal(h.fire("selectstart", h.target("button", false)), 0);
  assert.equal(h.fire("contextmenu", h.target("summary", false)), 0);
});

test("Desktop with a precise pointer retains its original browser event behaviour", () => {
  const h = harness(false);
  assert.equal(h.listeners.size, 0, "Do not install mobile handlers on desktop");
});
