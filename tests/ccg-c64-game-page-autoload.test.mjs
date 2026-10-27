#!/usr/bin/env node
"use strict";

// Execute the real game-library initialiser with browser-like URL and catalogue
// fixtures. A game-page CTA launches once; normal searches still require LOAD.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { preferSelectedCartridges, selectVerifiedExactCrtEdition, findVerifiedExactCrtEdition } from "../js/ccg-c64/game-catalog.js";

const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
const begin = app.indexOf("async function initialiseOnlineLibrary() {");
const end = app.indexOf("async function loadSelectedLibraryEntry()", begin);
assert(begin >= 0 && end > begin, "Game-library initialiser was renamed");
const code = app.slice(begin, end) + "\nglobalThis.initialise = initialiseOnlineLibrary;";

async function initialiseFor(query, options = {}) {
  const selected = [];
  const starts = [];
  let refreshes = 0;
  const game = Object.freeze({
    id: "owner-crt-more-sanxion",
    title: "Sanxion",
    format: "crt",
    approved: true,
    license: "Owner-attested C64 cartridge",
    url: "/emulator/c64/media/cartridge-replacements/sanxion.crt",
  });
  const context = vm.createContext({
    window: { location: { search: query } },
    URLSearchParams,
    gamePageAutoloadConsumed: false,
    onlineLibraryGrid: {},
    onlineLibraryStatus: { textContent: "" },
    onlineLibrarySearch: { value: "" },
    onlineLibraryEntries: [],
    onlineLibraryPanel: { hidden: true },
    onlineLibraryRetryButton: { hidden: true },
    onlineLibraryCount: { textContent: "" },
    controlsDeck: { classList: { toggle() {} } },
    SUPPORTED_MEDIA_TYPES: new Set(["crt", "prg", "d64"]),
    ADDITIONAL_CRT_CATALOG_URL: "/emulator/c64/media/cartridge-replacements/active.json",
    PACK_CATALOG_URL: "/emulator/c64/media/blast/catalog.json",
    ARCHIVE_READY_URL: "/emulator/c64/media/prg-archive/ready.json",
    console: { warn() {} },
    refreshOnlineLibrarySuggestions() {},
    selectOnlineLibraryEntry(id, focusLoadButton) { selected.push({ id, focusLoadButton }); },
    loadSelectedLibraryEntry() { starts.push(selected.at(-1)?.id); return Promise.resolve(); },
    updateSelectedLibraryGame() {},
    catalogueBrowser: { refresh() { refreshes++; } },
    preferSelectedCartridges,
    selectVerifiedExactCrtEdition,
    findVerifiedExactCrtEdition,
    stageNote: { textContent: "" },
    fetch: async url => url === "/emulator/c64/library.json"
      ? { ok: true, json: async () => ({ entries: options.entries || [game] }) }
      : { ok: false, status: 404 },
  });
  vm.runInContext(code, context);
  await context.initialise();
  if (options.retry) await context.initialise();
  return { selected, starts, context, refreshes };
}

test("game-page CTA automatically starts the exact approved cartridge once", async () => {
  const r = await initialiseFor("?game=owner-crt-more-sanxion&autoplay=1", { retry: true });
  assert.deepEqual(r.selected.map(x => x.id),
    ["owner-crt-more-sanxion", "owner-crt-more-sanxion"]);
  assert.equal(r.selected[0].focusLoadButton, false);
  assert.deepEqual(r.starts, ["owner-crt-more-sanxion"]);
  assert.equal(r.context.gamePageAutoloadConsumed, true);
  assert.match(r.context.stageNote.textContent, /Starting Sanxion automatically/);
  assert.equal(r.refreshes, 2);
});


test("real autoload selection preserves Domark 1988 edition rather than an older same-title CRT", async () => {
  const parker = Object.freeze({
    id: "owner-crt-star-wars", title: "Star Wars", format: "crt",
    approved: true, license: "Owner-attested C64 cartridge",
    url: "/emulator/c64/media/cartridge-replacements/star-wars.crt",
    bytes: 16464, sha256: "0".repeat(64),
  });
  const domark = Object.freeze({
    id: "owner-crt-more-starwars-1e41e83051d1", title: "Star Wars", format: "crt",
    approved: true, license: "Owner-attested C64 cartridge",
    url: "/emulator/c64/media/cartridge-replacements/starwars-1e41e83051d1.crt",
    bytes: 65728,
    sha256: "1e41e83051d1646a236f886ffb89294584f0f64496824b43e1479f9477bdc3e3",
  });
  const ordinary = await initialiseFor("", { entries: [parker, domark] });
  assert.equal(ordinary.context.onlineLibraryEntries.length, 1);
  assert.equal(ordinary.context.onlineLibraryEntries[0].id, parker.id,
    "Ordinary catalogue must retain its earlier preferred edition");
  assert.equal(ordinary.starts.length, 0);
  const gamePage = await initialiseFor("?game=" + domark.id + "&autoplay=1",
    { entries: [parker, domark] });
  assert.deepEqual(gamePage.selected.map(entry => entry.id), [domark.id]);
  assert.deepEqual(gamePage.starts, [domark.id]);
  assert.equal(gamePage.context.onlineLibraryEntries.length, 1);
  assert.equal(gamePage.context.onlineLibraryEntries[0].sha256, domark.sha256);
  assert.equal(gamePage.context.gamePageAutoloadConsumed, true);
  const tampered = await initialiseFor("?game=" + domark.id + "&autoplay=1",
    { entries: [parker, { ...domark, sha256: "f".repeat(64) }] });
  assert.equal(tampered.selected.length, 0,
    "Changed Domark digest must never silently select the older edition");
  assert.equal(tampered.starts.length, 0);
  assert.equal(tampered.context.gamePageAutoloadConsumed, false);
  const absent = await initialiseFor("?game=" + domark.id + "&autoplay=1",
    { entries: [parker] });
  assert.equal(absent.selected.length, 0);
  assert.equal(absent.starts.length, 0);
  const changedSoleEdition = await initialiseFor("?game=" + domark.id + "&autoplay=1",
    { entries: [{ ...domark, sha256: "f".repeat(64) }] });
  assert.equal(changedSoleEdition.selected.length, 0,
    "The only visible Star Wars entry must not bypass the reviewed digest");
  assert.equal(changedSoleEdition.starts.length, 0);
  const changedFirstEdition = await initialiseFor("?game=" + domark.id + "&autoplay=1",
    { entries: [{ ...domark, sha256: "f".repeat(64) }, parker] });
  assert.equal(changedFirstEdition.selected.length, 0,
    "An invalid Domark edition already in first position must not autostart");
  assert.equal(changedFirstEdition.starts.length, 0);
});


test("legacy game deep links and ordinary browsing never launch automatically", async () => {
  for (const query of ["", "?game=owner-crt-more-sanxion",
    "?game=owner-crt-more-sanxion&autoplay=0",
    "?game=owner-crt-more-sanxion&autoplay=yes"]) {
    const r = await initialiseFor(query);
    assert.equal(r.starts.length, 0, query);
    if (query.includes("game=")) {
      assert.deepEqual(r.selected.map(x => x.id), ["owner-crt-more-sanxion"]);
      assert.match(r.context.stageNote.textContent, /Press LOAD to play/);
    } else {
      assert.equal(r.selected.length, 0);
    }
  }
});

test("invalid, missing and unapproved game identifiers cannot autostart", async () => {
  for (const query of ["?game=unknown&autoplay=1",
    "?autoplay=1", "?game=../../sanxion&autoplay=1",
    "?game=%3Cscript%3E&autoplay=1"]) {
    const r = await initialiseFor(query);
    assert.equal(r.starts.length, 0, query);
    assert.equal(r.selected.length, 0, query);
    assert.equal(r.context.gamePageAutoloadConsumed, false);
  }
});

test("the automatic launch still uses firmware gating and SHA-verified media", () => {
  assert.match(app, /if \(typeof hostedFirmwareReadyPromise !== "undefined" && hostedFirmwareReadyPromise\) \{\s*await hostedFirmwareReadyPromise;/);
  assert.match(app, /const queued = await queueMedia\(/);
  assert.match(app, /\}, \{ freshBoot: true \}\);/);
  assert.match(app, /Cartridge SHA-256 mismatch/);
  assert.match(app, /Downloaded C64 game pack failed its integrity check|loadPackedGameBytes/);
});
