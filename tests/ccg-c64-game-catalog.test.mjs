#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  parsePackedCatalog, filterCatalog, loadPackedGameBytes,
  PACK_CATALOG_URL, PACK_ROOT, GAME_PAGE_SIZE,
} from "../js/ccg-c64/game-catalog.js";

assert.equal(PACK_CATALOG_URL, "/emulator/c64/media/blast/catalog.json");
assert.equal(GAME_PAGE_SIZE, 36);

const pack = Uint8Array.from([1, 8, 4, 12, 16, 20, 24, 28]);
const sha = b => createHash("sha256").update(b).digest("hex");
const fixture = {
  version: 2, recordCount: 2,
  packs: [{ file: "pack-00.bin", bytes: pack.length, sha256: sha(pack) }],
  games: [
    ["blast-0000", "1942", "prg", 0, 0, 3, sha(pack.subarray(0, 3))],
    ["ccg-snake", "Snake", "d64", 0, 3, 5, sha(pack.subarray(3))],
  ],
};

const { entries, packs } = parsePackedCatalog(fixture);
assert.equal(entries.length, 2);
assert.equal(packs[0].bytes, 8);
assert.equal(entries[0].title, "1942");
assert.equal(entries[1].format, "d64");
assert.deepEqual(filterCatalog(entries).games.map(x => x.title), ["1942", "Snake"]);
assert.equal(filterCatalog(entries, { query: "snake" }).games[0].id, "ccg-snake");
assert.equal(filterCatalog(entries, { format: "prg" }).total, 1);
assert.equal(filterCatalog(entries, { letter: "0-9" }).games[0].title, "1942");
assert.equal(filterCatalog(entries, { letter: "S" }).total, 1);
assert.equal(filterCatalog(entries, { query: "does not exist" }).total, 0);

const many = Array.from({ length: 100 }, (_, n) => ({
  id: "title-" + n, title: "Game " + n, format: "prg",
}));
assert.equal(filterCatalog(many).pages, 3);
assert.equal(filterCatalog(many).games.length, 36);
assert.equal(filterCatalog(many, { page: 2 }).games.length, 28);
assert.equal(filterCatalog(many, { page: 999 }).page, 2);

const corrupt = JSON.parse(JSON.stringify(fixture));
corrupt.games.push(corrupt.games[0]);
corrupt.recordCount = 3;
assert.throws(() => parsePackedCatalog(corrupt), /duplicate/i);
corrupt.games.pop();
corrupt.games[0][4] = 900;
corrupt.recordCount = 2;
assert.throws(() => parsePackedCatalog(corrupt), /invalid/i);

const savedFetch = globalThis.fetch;
let fetchCount = 0;
globalThis.fetch = async (url) => {
  assert.equal(url, PACK_ROOT + "pack-00.bin");
  fetchCount++;
  return { ok: true, arrayBuffer: async () => pack.buffer.slice() };
};
try {
  const cache = new Map();
  assert.deepEqual(Array.from(await loadPackedGameBytes(entries[0], cache)), [1, 8, 4]);
  assert.deepEqual(Array.from(await loadPackedGameBytes(entries[1], cache)), [12, 16, 20, 24, 28]);
  assert.equal(fetchCount, 1, "Multiple games in a pack must share a single download");
  const bad = { ...entries[0], sha256: "0".repeat(64) };
  await assert.rejects(loadPackedGameBytes(bad, cache), /integrity/i);
  await assert.rejects(loadPackedGameBytes({
    ...entries[0], byteOffset: 100,
  }, cache), /bounds/i);
} finally {
  globalThis.fetch = savedFetch;
}
console.log("CCG C64 searchable game catalogue, filtering, pagination, pack caching and SHA-256 checks passed.");
