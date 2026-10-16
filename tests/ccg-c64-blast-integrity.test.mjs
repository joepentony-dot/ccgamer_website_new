#!/usr/bin/env node
"use strict";

// Integrity qualification of the owner's hosted Blast Collection.
// Check every surviving original PRG and repacked byte slice; when the
// reviewed CRT-retirement map exists, also prove that all retired IDs remain
// backed by a verified, directly registered cartridge.
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
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

const retirementFile = path.join(folder, "retired-ids.json");
const hasRetirements = fs.existsSync(retirementFile);
const retirements = hasRetirements
  ? JSON.parse(fs.readFileSync(retirementFile, "utf8"))
  : null;
const expectedOriginalCount = 1878;
const expectedRetiredCount = hasRetirements ? 797 : 0;
const expectedSurvivors = expectedOriginalCount - expectedRetiredCount;
assert.equal(parsed.entries.length, expectedSurvivors,
  "BLAST survivor count differs from the guarded 1,878-original/797-retired contract");
assert.equal(parsed.packs.length, 11, "All eleven BLAST packs must remain");
assert.equal(catalog.recordCount, parsed.entries.length);

const direct = JSON.parse(fs.readFileSync(path.join(root, "emulator/c64/library.json"), "utf8"));
assert(direct.entries.length >= 5, "Previously approved disk and cartridge games must remain");
const directIds = new Set(direct.entries.map(e => e.id));
assert.equal(directIds.size, direct.entries.length, "Duplicate directly hosted game IDs");
const directTitleAndFormat = new Set(direct.entries.map(e =>
  `${e.title.trim().toLowerCase()}|${String(e.format).toLowerCase()}`));
let count = 0;
const survivingIds = new Set();
for (const pack of parsed.packs) {
  const data = fs.readFileSync(path.join(folder, pack.file));
  assert.equal(data.length, pack.bytes, `${pack.file} file size changed`);
  assert.equal(hash(data), pack.sha256, `${pack.file} SHA-256 does not match catalogue`);
  const records = parsed.entries.filter(e => e.packFile === pack.file);
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
    assert(!survivingIds.has(game.id), `${game.id} is a repeated surviving PRG ID`);
    survivingIds.add(game.id);
    count++;
  }
  assert.equal(nextOffset, data.length, `${pack.file} contains unused trailing data`);
}
assert.equal(count, expectedSurvivors);

if (retirements) {
  assert.equal(retirements.version, 1);
  assert.equal(retirements.source, "blast");
  assert.equal(retirements.recordCount, expectedRetiredCount);
  const mappings = Object.entries(retirements.mappings);
  assert.equal(mappings.length, expectedRetiredCount,
    "All 797 retired PRG IDs must retain CRT aliases");
  assert.equal(count + mappings.length, expectedOriginalCount,
    "Retained PRGs plus CRT replacements must equal all 1,878 originals");
  const crtRoot = path.join(root, "emulator/c64/media/cartridge-replacements");
  const manifest = JSON.parse(fs.readFileSync(path.join(crtRoot, "active.json"), "utf8"));
  assert.equal(manifest.recordCount, manifest.games.length,
    "Active cartridge manifest does not match its declared count");
  const crtRows = new Map(manifest.games.map(row => [
    "owner-crt-more-" + row[1].replace(/\.crt$/, ""), row,
  ]));
  assert.equal(crtRows.size, manifest.games.length,
    "Cartridge manifest has duplicate cartridge IDs");
  const byDirectId = new Map(direct.entries.map(e => [e.id, e]));
  const verifiedCartridges = new Set();
  for (const [legacyId, cartridgeId] of mappings) {
    assert(/^blast-\d{4}$/.test(legacyId), "Invalid retired BLAST identifier: " + legacyId);
    assert(!survivingIds.has(legacyId),
      "Retired PRG is still in the BLAST packs: " + legacyId);
    const target = byDirectId.get(cartridgeId);
    const row = crtRows.get(cartridgeId);
    assert(target && target.format === "crt" && target.approved === true &&
      target.preferOverOtherFormats === true,
      "Retired BLAST game has no approved direct CRT: " + legacyId);
    // The first 728 retired IDs use activated CRTs. The next 69 resolve
    // directly to prior SHA-verified `owner-crt-*` or other approved CRT IDs.
    if (row) {
      const [, filename, bytes, digest] = row;
      assert.equal(target.url, "/emulator/c64/media/cartridge-replacements/" + filename);
      assert.equal(target.bytes, bytes);
      assert.equal(target.sha256, digest);
    } else {
      assert(/^\/emulator\/c64\/media\/[a-z0-9.-]+\.crt$/.test(target.url),
        "Unapproved direct CRT media URL: " + cartridgeId);
    }
    if (!verifiedCartridges.has(cartridgeId)) {
      const image = fs.readFileSync(path.join(root, target.url.slice(1)));
      assert.equal(image.length, target.bytes, "Replacement CRT length mismatch: " + cartridgeId);
      assert.equal(hash(image), target.sha256, "Replacement CRT SHA mismatch: " + cartridgeId);
      assert.equal(image.subarray(0,13).toString("ascii"), "C64 CARTRIDGE",
        "Retired BLAST target is not a CRT: " + cartridgeId);
      verifiedCartridges.add(cartridgeId);
    }
  }
  assert(verifiedCartridges.size >= 728 && verifiedCartridges.size <= 797,
    "All 797 retired BLAST game IDs must resolve to unique SHA-verified cartridge targets");
  console.log(`PASS: ${count} original BLAST PRGs in ${parsed.packs.length} SHA-verified packs; ${mappings.length} retired IDs have ${verifiedCartridges.size} SHA-verified, directly registered CRT replacements; 1,878 original game identities accounted for.`);
} else {
  console.log(`PASS: all ${count} original BLAST PRGs SHA-verified across ${parsed.packs.length} packs; no retirements applied.`);
}
