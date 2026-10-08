#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { parsePackedCatalog, PACK_CATALOG_URL } from "../js/ccg-c64/game-catalog.js";

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
assert.equal(direct.entries.length, 5);
assert.equal(good.context.onlineLibraryEntries.length, 1882,
  "All approved titles except the withdrawn Bruce Lee PRG must appear even if HEAD is unavailable");
assert.equal(good.context.onlineLibraryStatus.textContent, "1,882 READY");
assert.equal(good.context.onlineLibraryRetryButton.hidden, true);
assert.equal(good.context.onlineLibraryPanel.hidden, false);
assert.equal(good.fetchRequests.length, 2, "Only the two JSON catalogues must be fetched at startup");
assert(good.fetchRequests.every(r => r.opts.method !== "HEAD"));
assert.equal(good.statuses.refreshed, true);

const failed = await execute(false);
assert.equal(failed.context.onlineLibraryEntries.length, 5,
  "Already hosted direct games must survive catalogue fetch errors");
assert.match(failed.context.onlineLibraryStatus.textContent, /BLAST UNAVAILABLE/);
assert.match(failed.context.onlineLibraryCount.textContent, /retry/i);
assert.equal(failed.context.onlineLibraryRetryButton.hidden, false);
assert(failed.statuses.warning, "A catalogue failure must be logged instead of swallowed");

console.log("PASS: 1882 selectable library entries appear without HEAD, direct CRT games survive catalogue errors, and retry is exposed.");
