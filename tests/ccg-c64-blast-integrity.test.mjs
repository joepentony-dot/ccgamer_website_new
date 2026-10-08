#!/usr/bin/env node
"use strict";

// Integrity qualification of the owner's actual hosted Blast Collection.
// Unlike catalogue UI unit tests, this checks every real PRG and every
// pack on disk before the large C64 game library is merged or deployed.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePackedCatalog } from "../js/ccg-c64/game-catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const folder = path.join(root, "emulator/c64/media/blast");
const catalog = JSON.parse(fs.readFileSync(path.join(folder, "catalog.json"), "utf8"));
const parsed = parsePackedCatalog(catalog);
assert.equal(parsed.entries.length, 1878, "All 1,878 selected Blast PRGs must be present");
assert.equal(parsed.packs.length, 11, "All eleven downloadable packs must be present");
assert.equal(catalog.recordCount, parsed.entries.length);

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const direct = JSON.parse(fs.readFileSync(path.join(root, "emulator/c64/library.json"), "utf8"));
assert(direct.entries.length >= 5, "Previously approved disk and cartridge games must remain");
const directIds = new Set(direct.entries.map((e) => e.id));
const directTitleAndFormat = new Set(direct.entries.map((e) =>
  `${e.title.trim().toLowerCase()}|${String(e.format).toLowerCase()}`));
let count = 0;
for (const [index, pack] of parsed.packs.entries()) {
  const data = fs.readFileSync(path.join(folder, pack.file));
  assert.equal(data.length, pack.bytes, `${pack.file} file size changed`);
  assert.equal(hash(data), pack.sha256, `${pack.file} SHA-256 does not match catalogue`);
  const records = parsed.entries.filter((e) => e.packFile === pack.file);
  assert(records.length > 0, `${pack.file} is unused`);
  let nextOffset = 0;
  for (const game of records) {
    assert.equal(game.byteOffset, nextOffset,
      `${game.title} has an unexpected offset or overlapping bytes`);
    nextOffset += game.byteLength;
    const prg = data.subarray(game.byteOffset, nextOffset);
    assert.equal(game.format, "prg", `${game.title} is not an expected PRG`);
    assert.equal(hash(prg), game.sha256, `${game.title} SHA-256 does not match`);
    assert(prg.length > 2, `${game.title} is not a valid PRG length`);
    const loadAddress = prg[0] | (prg[1] << 8);
    assert(loadAddress >= 0x0200 && loadAddress < 0x10000,
      `${game.title} has invalid initial PRG load address`);
    assert(!directIds.has(game.id), `${game.id} conflicts with existing game IDs`);
    assert(!directTitleAndFormat.has(`${game.title.trim().toLowerCase()}|${game.format}`),
      `${game.title} duplicates an existing direct media entry`);
    count++;
  }
  assert.equal(nextOffset, data.length, `${pack.file} contains unused trailing data`);
}
assert.equal(count, 1878);
console.log(`PASS: ${count} real PRGs verified across ${parsed.packs.length} packs, SHA-256 matched for every pack and game; existing five owner-selected games preserved.`);
