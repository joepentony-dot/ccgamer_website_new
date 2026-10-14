import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
const html = fs.readFileSync("emulator/c64/index.html", "utf8");
const css = fs.readFileSync("resources/css/ccg-c64-emulator.css", "utf8");

test("the phone search uses the existing C64 game library, not a second selector", () => {
  assert(html.includes('class="ccg-c64-panel ccg-c64-panel--library"'));
  assert(app.includes('screenStage.insertAdjacentElement("afterend", onlineLibraryPanel)'));
  assert(app.includes('libraryDesktopAnchor.parentNode.insertBefore('));
  assert(css.includes('.ccg-c64-console > .ccg-c64-panel--library'));
  assert(css.includes('.ccg-c64-console > .ccg-c64-panel--library[hidden]'));
  assert(css.includes('.ccg-c64-console:fullscreen > .ccg-c64-panel--library'));
  assert(css.includes('font-size: 16px;'));
  assert(app.includes('vault.importBundle(bundle)'), "The just-merged phone ROM transfer must remain installed");
  assert.equal((html.match(/data-online-library-load/g) || []).length, 1,
    "There must be exactly one select-then-LOAD button");
});

class Element {
  constructor(name) { this.name = name; this.parentNode = null; this.children = []; this.parent = null; }
  appendChild(el) {
    if (el.parentNode) el.parentNode.children.splice(el.parentNode.children.indexOf(el), 1);
    el.parentNode = this; this.children.push(el); return el;
  }
  insertBefore(el, sibling) {
    if (el.parentNode) el.parentNode.children.splice(el.parentNode.children.indexOf(el), 1);
    el.parentNode = this;
    const i = sibling === null ? this.children.length : this.children.indexOf(sibling);
    if (i < 0) throw Error("Missing anchor");
    this.children.splice(i, 0, el);
    return el;
  }
  insertAdjacentElement(where, el) {
    assert.equal(where, "afterend");
    const at = this.parentNode.children.indexOf(this);
    const next = this.parentNode.children[at + 1] ?? null;
    return this.parentNode.insertBefore(el, next);
  }
  closest(selector) { assert.equal(selector, ".ccg-c64-console"); return this.parentNode; }
  get nextSibling() {
    const siblings = this.parentNode?.children || [];
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }
}

test("portrait / landscape move the original panel under the picture, desktop restores it", () => {
  const console = new Element("console");
  const stage = new Element("stage");
  const caption = new Element("caption");
  const deck = new Element("deck");
  const before = new Element("quickload");
  const library = new Element("library");
  const after = new Element("controls");
  console.appendChild(stage); console.appendChild(caption);
  deck.appendChild(before); deck.appendChild(library); deck.appendChild(after);
  let onPhone = true, change;
  const sourceStart = app.indexOf('const libraryDesktopAnchor = document.createComment(');
  const sourceEnd = app.indexOf('const PAL_FRAME_MS', sourceStart);
  assert(sourceStart !== -1 && sourceEnd > sourceStart, "Phone layout source missing");
  const context = vm.createContext({
    onlineLibraryPanel: library, screenStage: stage, controlsDeck: deck,
    document: { createComment() { return new Element("desktop anchor"); } },
    window: { matchMedia() { return {
      get matches() { return onPhone; },
      addEventListener(name, cb) { assert.equal(name, "change"); change = cb; }
    }; } },
  });
  vm.runInContext(app.slice(sourceStart, sourceEnd), context);
  assert.equal(console.children[1], library, "On phone search is immediately below the screen");
  assert.equal(console.children[2], caption);
  assert.equal(deck.children.some(x => x === library), false);
  onPhone = false; change();
  assert.equal(deck.children.indexOf(library), 2, "On desktop the SAME library returns to the original slot");
  assert.equal(console.children.includes(library), false);
  onPhone = true; change();
  assert.equal(console.children[1], library);
});
