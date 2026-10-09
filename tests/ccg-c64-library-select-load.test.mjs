#!/usr/bin/env node
"use strict";

// Execute the real selection and loading functions in a small browser-like
// harness. A suggestion MUST NOT launch any game until LOAD is clicked.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const app = read("js/ccg-c64/app.js");
const html = read("emulator/c64/index.html");
const css = read("resources/css/ccg-c64-emulator.css");

assert(html.includes("data-online-library-load hidden disabled"),
  "LOAD must start hidden and disabled");
assert(html.includes("LOAD</button>"), "The action must be labelled LOAD");
assert(css.includes(".ccg-c64-library-load[hidden]") &&
  css.includes(".ccg-c64-library-confirm"),
  "Hidden load button and stable confirmation row need styles");
assert(!app.includes("loadOnlineLibraryEntry("),
  "Legacy single-click game launching must be removed");

function section(from, to) {
  const start = app.indexOf(from);
  const end = app.indexOf(to, start);
  assert(start >= 0 && end > start, "Could not find C64 application functions: " + from);
  return app.slice(start, end);
}

const selectedFunctions = section("function updateSelectedLibraryGame()", "function setLibrarySuggestionsOpen(");
const loaderFunction = section("async function loadSelectedLibraryEntry()", "loadAnyMediaButton?.addEventListener(");
const inputHandlers = section('onlineLibrarySearch?.addEventListener("input"', 'onlineLibraryDiskSwapButton?.addEventListener(');

const first = { id: "bruce", title: "Bruce Lee Trilogy", format: "crt", dataBase64: "AA==" };
const second = { id: "paradroid", title: "Paradroid", format: "d64", dataBase64: "AA==" };
let queueCount = 0;
let lastQueued;
let focusCount = 0;
let refreshCount = 0;
let activeGameProfile = null;
let popupVisible = false;
const searchListeners = {};
const listListeners = {};
const docListeners = {};
const loadListeners = {};
const search = {
  value: "",
  focus() {},
  addEventListener(name, fn) { searchListeners[name] = fn; },
};
const loadButton = {
  hidden: true,
  disabled: true,
  textContent: "LOAD",
  focus() { focusCount++; },
  addEventListener(name, fn) { loadListeners[name] = fn; },
};
const searchWrap = {
  contains() { return false; },
  addEventListener() {},
};

const context = vm.createContext({
  onlineLibraryEntries: [first, second],
  selectedLibraryEntryId: null,
  onlineLibraryLoadingGame: false,
  onlineLibrarySearch: search,
  onlineLibraryCount: { textContent: "" },
  onlineLibraryLoadButton: loadButton,
  onlineLibraryStatus: { textContent: "" },
  onlineLibrarySuggestions: { hidden: true },
  onlineLibraryGrid: { addEventListener(name, fn) { listListeners[name] = fn; } },
  onlineLibrarySearchWrap: searchWrap,
  visibleLibrarySuggestions: [],
  activeLibrarySuggestionIndex: -1,
  document: { addEventListener(name, fn) { docListeners[name] = fn; } },
  stageNote: { textContent: "" },
  onlineLibraryPackCache: new Map(),
  onlineLibraryDiskIndex: 0,
  activeLibraryEntryId: null,
  pendingMedia: null,
  decodeLibraryBase64() { return Uint8Array.from([0, 8, 1]); },
  setLibrarySuggestionsOpen(value) {
    popupVisible = value;
    context.onlineLibrarySuggestions.hidden = !value;
  },
  refreshOnlineLibrarySuggestions() {
    refreshCount++;
    context.onlineLibraryCount.textContent = "Select a game, then click LOAD.";
  },
  updateOnlineDiskUi() {},
  setActiveControlGame(entry) { activeGameProfile = entry; },
  async queueMedia(media, opts) {
    queueCount++;
    lastQueued = { media, opts };
    return true;
  },
});
vm.runInContext(selectedFunctions + loaderFunction + inputHandlers +
  "\nglobalThis.select = selectOnlineLibraryEntry;" +
  "\nglobalThis.load = loadSelectedLibraryEntry;" +
  "\nglobalThis.sync = updateSelectedLibraryGame;", context);

context.sync();
assert.equal(loadButton.hidden, true, "LOAD must be invisible before selecting");
assert.equal(loadButton.disabled, true, "LOAD must be disabled before selecting");
await context.load();
assert.equal(queueCount, 0, "Loading without a selection must do nothing");

// Pointer selection via the real suggestion click handler.
listListeners.click({ target: { closest() { return { dataset: { playGame: first.id } }; } } });
assert.equal(queueCount, 0, "Selecting a suggestion must never mount game media");
assert.equal(search.value, first.title);
assert.equal(context.selectedLibraryEntryId, first.id);
assert.equal(loadButton.hidden, false);
assert.equal(loadButton.disabled, false);
assert.equal(loadButton.textContent, "LOAD");
assert(context.onlineLibraryCount.textContent.includes(first.title));
assert.equal(popupVisible, false, "Selecting should dismiss the suggestion overlay");
assert.equal(focusCount, 1, "LOAD should receive focus after selection");

// Typing anything again invalidates the previous selection and hides LOAD.
search.value = "Para";
searchListeners.input();
assert.equal(context.selectedLibraryEntryId, null);
assert.equal(loadButton.hidden, true);
assert.equal(loadButton.disabled, true);
await context.load();
assert.equal(queueCount, 0, "Edited search must not launch the former selection");

// Enter in the search suggestion list selects only. It must not load.
context.visibleLibrarySuggestions = [second];
search.value = "Parad";
context.onlineLibrarySuggestions.hidden = false;
let prevented = false;
searchListeners.keydown({ key: "Enter", preventDefault() { prevented = true; } });
assert.equal(prevented, true);
assert.equal(context.selectedLibraryEntryId, second.id);
assert.equal(queueCount, 0, "Enter on a suggestion must not load the game");
assert.equal(loadButton.hidden, false);
assert.equal(search.value, second.title);

// Only the explicit LOAD click may start the selected media.
assert.equal(typeof loadListeners.click, "function");
loadListeners.click();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(queueCount, 1, "LOAD click must start exactly one game");
assert.equal(lastQueued.media.type, "d64");
assert.equal(lastQueued.media.name, "Paradroid.d64");
assert.equal(lastQueued.opts.freshBoot, true, "New game must use fresh auto-boot");
assert.equal(context.activeLibraryEntryId, second.id);
assert.equal(activeGameProfile?.id, second.id, "Only a loaded game may activate its mobile control profile");
assert.equal(context.onlineLibraryStatus.textContent, "GAME STARTED");
assert.equal(loadButton.disabled, false, "LOAD should be available again after loading");
assert(refreshCount >= 3);

console.log("C64 typeahead selection, invalidation, keyboard selection and explicit LOAD tests passed.");
