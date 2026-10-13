#!/usr/bin/env node
"use strict";

// The optional owner-provided PRG archive must not affect the existing C64
// library until its media packs and signed activation marker are installed.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PACK_ROOT, ARCHIVE_PACK_ROOT, ARCHIVE_CATALOG_URL, ARCHIVE_READY_URL,
  parsePackedCatalog, normaliseCatalogSearch, suggestCatalogGames,
  filterCatalog, loadPackedGameBytes,
} from "../js/ccg-c64/game-catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const bytes = Uint8Array.from([1, 8, 12, 34, 56, 78]);
const catalog = {
  version: 2, recordCount: 2,
  packs: [{ file: "pack-00.bin", bytes: bytes.length, sha256: sha(bytes) }],
  games: [
    ["archive-00000", "Daley Thompson's Decathlon", "prg", 0, 0, 3, sha(bytes.subarray(0, 3))],
    ["archive-00001", "Raid Over Moscow", "prg", 0, 3, 3, sha(bytes.subarray(3))],
  ],
};

const archived = parsePackedCatalog(catalog, { packRoot: ARCHIVE_PACK_ROOT });
const blast = parsePackedCatalog(catalog);
assert.equal(ARCHIVE_CATALOG_URL, ARCHIVE_PACK_ROOT + "catalog.json");
assert.equal(ARCHIVE_READY_URL, ARCHIVE_PACK_ROOT + "ready.json");
assert.equal(archived.entries[0].packRoot, ARCHIVE_PACK_ROOT);
assert.equal(blast.entries[0].packRoot, PACK_ROOT);
assert.throws(() => parsePackedCatalog(catalog, { packRoot: "https://evil.example/media/" }), /Untrusted/i);
assert.throws(() => parsePackedCatalog(catalog, { packRoot: "/emulator/c64/media/../evil/" }), /Untrusted/i);

const names = archived.entries.map(row => row.title);
assert.deepEqual(names, ["Daley Thompson's Decathlon", "Raid Over Moscow"]);
assert.equal(normaliseCatalogSearch("Daley Thompsons Decathlon"),
  normaliseCatalogSearch("Daley Thompson's Decathlon"));
assert.equal(normaliseCatalogSearch("Olli and Lissa"), normaliseCatalogSearch("Olli & Lissa"));
assert.equal(suggestCatalogGames(archived.entries, "daley thompsons").games[0].title, names[0]);
assert.equal(suggestCatalogGames(archived.entries, "raid over moscow").games[0].title, names[1]);
assert.equal(filterCatalog(archived.entries, { query: "Thompsons" }).total, 1);
assert.equal(suggestCatalogGames(archived.entries, "").games.length, 0);

// Reused pack names must never accidentally read bytes from the wrong catalogue.
const oldFetch = globalThis.fetch;
const loaded = [];
globalThis.fetch = async url => {
  loaded.push(url);
  return { ok: true, arrayBuffer: async () => Uint8Array.from(bytes).buffer };
};
try {
  const cache = new Map();
  assert.equal((await loadPackedGameBytes(blast.entries[0], cache)).length, 3);
  assert.equal((await loadPackedGameBytes(archived.entries[1], cache)).length, 3);
  assert.equal(cache.size, 2);
  assert.deepEqual(loaded, [PACK_ROOT + "pack-00.bin", ARCHIVE_PACK_ROOT + "pack-00.bin"]);
  await assert.rejects(loadPackedGameBytes({
    ...archived.entries[0], packRoot: "https://evil.example/",
  }, cache), /Untrusted/i);
} finally {
  globalThis.fetch = oldFetch;
}

// Parse a realistic-size, single-manifest 10K catalogue without an arbitrary
// 5,000-game ceiling or a 10,000-node dropdown.
const many = Array.from({ length: 10000 }, (_, n) => [
  "archive-" + String(n).padStart(5, "0"), "Archive Game " + n,
  "prg", 0, 0, 3, sha(bytes.subarray(0, 3)),
]);
const large = parsePackedCatalog({ ...catalog, recordCount: many.length, games: many },
  { packRoot: ARCHIVE_PACK_ROOT });
assert.equal(large.entries.length, 10000);
assert.equal(suggestCatalogGames(large.entries, "archive game", 8).games.length, 8);
const app = fs.readFileSync(path.join(root, "js/ccg-c64/app.js"), "utf8");
assert.match(app, /readyResponse\.status !== 404/, "The absent archive must remain optional");
assert.match(app, /catalogueSHA !== ready\.catalogSHA256/, "Activation must verify the catalogue hash");
assert.match(app, /onlineLibraryEntries = \[\.\.\.regular, \.\.\.packed, \.\.\.archived\]/,
  "Old hosted catalogue entries must remain when archive is enabled");
console.log("PASS: optional archive, clean searchable names, independent packs, activation and 10k titles");
