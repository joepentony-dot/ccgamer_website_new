#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { parsePackedCatalog, PACK_CATALOG_URL, ARCHIVE_READY_URL } from "../js/ccg-c64/game-catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(root, "js/ccg-c64/app.js"), "utf8");
const direct = JSON.parse(fs.readFileSync(path.join(root, "emulator/c64/library.json"), "utf8"));
const blast = JSON.parse(fs.readFileSync(path.join(root, "emulator/c64/media/blast/catalog.json"), "utf8"));
const begin = app.indexOf("async function initialiseOnlineLibrary() {");
const end = app.indexOf("async function loadSelectedLibraryEntry()", begin);
assert(begin >= 0 && end > begin, "Library startup must be identifiable");
const code = app.slice(begin, end) + "\nglobalThis.startLibrary = initialiseOnlineLibrary;";

async function execute(catalogueAvailable) {
  const statuses = {};
  const fetchRequests = [];
  const context = vm.createContext({
    onlineLibraryGrid: {},
    onlineLibraryStatus: { textContent: "" },
    onlineLibrarySearch: { value: "" },
    onlineLibraryEntries: [],
    onlineLibraryPanel: { hidden: true },
    onlineLibraryRetryButton: { hidden: true },
    onlineLibraryCount: { textContent: "" },
    controlsDeck: { classList: { toggle() {} } },
    SUPPORTED_MEDIA_TYPES: new Set(["prg", "d64", "crt", "tap", "t64", "d71", "d81", "g64"]),
    PACK_CATALOG_URL,
    ARCHIVE_READY_URL,
    parsePackedCatalog,
    refreshOnlineLibrarySuggestions() { statuses.refreshed = true; },
    updateSelectedLibraryGame() { statuses.selectionUpdated = true; },
    console: { warn(...message) { statuses.warning = message; } },
    fetch: async (url, opts) => {
      fetchRequests.push({ url, opts });
      if (opts?.method === "HEAD") {
        throw new Error("HEAD denied by CDN"); // All old results would disappear.
      }
      if (url === "/emulator/c64/library.json") {
        return { ok: true, json: async () => direct };
      }
      if (url === ARCHIVE_READY_URL) {
        return { ok: false, status: 404 }; // No optional archive media is published yet.
      }
      if (url === PACK_CATALOG_URL) {
        return catalogueAvailable
          ? { ok: true, json: async () => blast }
          : { ok: false, status: 503 };
      }
      throw new Error("Unexpected URL: " + url);
    },
  });
  vm.runInContext(code, context);
  await context.startLibrary();
  return { context, statuses, fetchRequests };
}

const good = await execute(true);
assert.equal(blast.recordCount, 1878);
assert.equal(direct.entries.length, 19);
const musketeer = direct.entries.find(entry => entry.id === "musketeer");
assert(musketeer && musketeer.title === "Musketeer" && musketeer.format === "d64" &&
  musketeer.url === "/emulator/c64/media/musketeer.d64" &&
  musketeer.bytes === 174848 && musketeer.approved,
  "Musketeer must be present with its exact C64 disk location");
for (const [id, title] of [
  ["pirates", "Pirates!"], ["creatures", "Creatures"],
  ["creatures-2", "Creatures 2"], ["defender-of-the-crown", "Defender of the Crown"],
  ["curse-of-the-azure-bonds", "Curse of the Azure Bonds"],
  ["turrican-trilogy", "Turrican Trilogy"], ["tusker", "Tusker"],
  ["below-the-root", "Below the Root"], ["a-pig-quest", "A Pig Quest"],
  ["arcade-daze", "Arcade Daze"],
]) {
  const game = direct.entries.find(entry => entry.id === id);
  assert(game && game.title === title && game.format === "crt" &&
    game.url === "/emulator/c64/media/" + id + ".crt" && game.approved,
    "Verified EasyFlash title must remain published at its exact local URL: " + id);
}
assert.equal(good.context.onlineLibraryEntries.length, 1896,
  "All approved titles except the withdrawn Bruce Lee PRG must appear even if HEAD is unavailable");
assert.equal(good.context.onlineLibraryStatus.textContent, "1,896 READY");
assert.equal(good.context.onlineLibraryRetryButton.hidden, true);
assert.equal(good.context.onlineLibraryPanel.hidden, false);
assert.equal(good.fetchRequests.length, 3, "Two library catalogues plus one optional activation probe are fetched at startup");
assert.equal(good.fetchRequests.filter(r => r.url === ARCHIVE_READY_URL).length, 1, "Absent archive activation must be checked once");
assert(good.fetchRequests.every(r => r.opts.method !== "HEAD"));
assert.equal(good.statuses.refreshed, true);

const failed = await execute(false);
assert.equal(failed.context.onlineLibraryEntries.length, 19,
  "Already hosted direct games must survive catalogue fetch errors");
assert.match(failed.context.onlineLibraryStatus.textContent, /BLAST UNAVAILABLE/);
assert.match(failed.context.onlineLibraryCount.textContent, /retry/i);
assert.equal(failed.context.onlineLibraryRetryButton.hidden, false);
assert(failed.statuses.warning, "A catalogue failure must be logged instead of swallowed");

console.log("PASS: 1896 selectable library entries appear without HEAD, direct CRT games survive catalogue errors, and retry is exposed.");
