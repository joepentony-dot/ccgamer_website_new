#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normaliseHtml } = require("../scripts/normalize-public-header-shell.js");
const html = fs.readFileSync("emulator/c64/index.html", "utf8");
const source = fs.readFileSync("js/ccg-c64/header-drawer.js", "utf8");
const staged = normaliseHtml(html, {
  root: process.cwd(),
  relativePath: "emulator/c64/index.html"
}).html;

assert.match(staged, /data-ccg-nav-toggle/, "Deployment must insert the canonical CCG hamburger");
assert.match(staged, /data-ccg-nav-drawer/, "Deployment must insert the canonical drawer");
assert.match(staged, /js\/ccg-c64\/header-drawer\.js/, "Published page must load the C64 drawer controller");
assert.doesNotMatch(html, /\/js\/ccg-global\.js/, "Do not introduce C64 gameplay input changes through global scripts");

let doc;
class FakeElement {
  constructor(type = "div") {
    this.type = type;
    this.dataset = {};
    this.children = [];
    this.attrs = {};
    this.listeners = {};
    this.className = "";
    this.classList = {
      values: new Set(),
      add: (...names) => names.forEach(name => this.classList.values.add(name)),
      contains: name => this.classList.values.has(name),
      toggle: (name, on) => {
        if (on) this.classList.values.add(name);
        else this.classList.values.delete(name);
      }
    };
  }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name] || null; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  fire(type, options = {}) {
    const event = { target: this, key: "", shiftKey: false, prevented: false,
      preventDefault() { this.prevented = true; }, ...options };
    for (const handler of this.listeners[type] || []) handler(event);
    return event;
  }
  focus() { doc.activeElement = this; }
  replaceChildren(...children) { this.children = children; }
  appendChild(child) { this.children.push(child); return child; }
  insertBefore(child, before) {
    const index = this.children.indexOf(before);
    this.children.splice(index < 0 ? this.children.length : index, 0, child);
  }
  cloneNode() { const next = new FakeElement(this.type); next.href = this.href; next.textContent = this.textContent; return next; }
  closest(selector) {
    if (selector === "[data-ccg-drawer-close]" && this.isClose) return this;
    if (selector === "a[href]" && this.type === "a") return this;
    return null;
  }
  querySelector(selector) { return this.selectors?.[selector] || null; }
  querySelectorAll(selector) {
    if (selector === "a[href]") return this.links || [];
    if (selector === "a[href], button:not([disabled])") {
      const nodes = [closeButton];
      for (const section of [drawerPrimary, drawerSecondary]) nodes.push(...section.children.filter(node => node.type === "a"));
      return nodes;
    }
    return [];
  }
}

const header = new FakeElement();
const toggle = new FakeElement("button");
const nav = new FakeElement("nav");
const drawer = new FakeElement();
const primary = new FakeElement();
const secondary = new FakeElement();
const drawerPrimary = new FakeElement();
const drawerSecondary = new FakeElement();
const closeButton = new FakeElement("button");
closeButton.isClose = true;
const backdrop = new FakeElement();
backdrop.isClose = true;
const makeLink = (href) => { const e = new FakeElement("a"); e.href = href; return e; };
primary.links = [makeLink("/home.html"), makeLink("/games/")];
secondary.links = [makeLink("/emulation.html")];
header.selectors = {
  "[data-ccg-nav-toggle]": toggle,
  "[data-ccg-nav-drawer]": drawer,
  ".ccg-nav": nav
};
nav.selectors = {
  "[data-ccg-nav-primary]": primary,
  "[data-ccg-nav-secondary]": secondary
};
drawer.selectors = {
  "[data-ccg-drawer-primary]": drawerPrimary,
  "[data-ccg-drawer-secondary]": drawerSecondary,
  "[data-ccg-drawer-close]": closeButton
};
const mobileHandlers = {};
const mobile = { matches: true, addEventListener(type, handler) { mobileHandlers[type] = handler; } };
const window = { matchMedia: () => mobile, addEventListener() {} };
doc = {
  readyState: "complete", body: new FakeElement(),
  activeElement: null,
  listeners: {},
  querySelector(selector) { return selector === "[data-ccg-header]" ? header : null; },
  createElement(type) { return new FakeElement(type); },
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
  fire(type, event) { for (const handler of this.listeners[type] || []) handler(event); }
};
vm.runInNewContext(source, { document: doc, window, Element: FakeElement });
assert.equal(toggle.dataset.ccgC64DrawerBound, "true", "Bridge must attach to the header toggle");
assert.equal(toggle.getAttribute("aria-controls"), drawer.id);

toggle.fire("click");
assert.equal(toggle.getAttribute("aria-expanded"), "true");
assert.equal(drawer.getAttribute("aria-hidden"), "false");
assert(header.classList.contains("ccg-header--nav-open"), "Drawer open state must reach shared CSS");
assert(doc.body.classList.contains("ccg-body--locked"), "Open drawer must lock background scrolling");
assert.equal(drawerPrimary.children.filter(x => x.type === "a").length, 2, "Primary links must be present");
assert.equal(drawerSecondary.children.filter(x => x.type === "a").length, 2, "Secondary and merch links must be present");

drawer.fire("click", { target: closeButton });
assert.equal(drawer.getAttribute("aria-hidden"), "true", "Close button must dismiss drawer");
assert.equal(doc.activeElement, toggle, "Closing returns focus to hamburger");

toggle.fire("click");
drawer.fire("click", { target: backdrop });
assert.equal(drawer.getAttribute("aria-hidden"), "true", "Backdrop must dismiss drawer");

toggle.fire("click");
const escape = { key: "Escape", prevented: false, preventDefault() { this.prevented = true; } };
doc.fire("keydown", escape);
assert(escape.prevented && drawer.getAttribute("aria-hidden") === "true", "Escape closes the menu");

const gameplayKey = { key: "ArrowLeft", prevented: false, preventDefault() { this.prevented = true; } };
doc.fire("keydown", gameplayKey);
assert.equal(gameplayKey.prevented, false, "Menu bridge must leave closed-menu C64 keys alone");

toggle.fire("click");
mobile.matches = false;
mobileHandlers.change();
assert.equal(drawer.getAttribute("aria-hidden"), "true", "Viewport changes must close the drawer");

console.log("PASS deployed C64 header menu: open, links, close, backdrop, Escape, resize and gameplay isolation.");
