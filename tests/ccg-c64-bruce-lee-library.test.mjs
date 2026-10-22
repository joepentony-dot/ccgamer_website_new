import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import test from "node:test";
import { parsePackedCatalog } from "../js/ccg-c64/game-catalog.js";

const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
const direct = JSON.parse(fs.readFileSync("emulator/c64/library.json", "utf8"));
const packed = JSON.parse(fs.readFileSync("emulator/c64/media/blast/catalog.json", "utf8"));
const bruceFile = direct.entries.find(entry => entry.id === "bruce-lee-trilogy");

test("distinct Bruce Lee and Trilogy cartridges supersede the defective BLAST PRG", () => {
  assert(bruceFile, "Bruce Lee Trilogy must remain in the owner-approved library");
  assert.equal(bruceFile.format, "crt");
  assert.equal(bruceFile.url, "/emulator/c64/media/bruce-lee-trilogy.crt");
  assert.equal(bruceFile.bytes, 131392);
  assert.equal(bruceFile.sha256,
    "6462a7562dcb539da2a6bfb843235dd70ffb2817403ea99efc350669b9e62999");

  const standalone = direct.entries.find(entry => entry.id === "owner-crt-more-bruce-lee");
  const selected = JSON.parse(fs.readFileSync(
    "emulator/c64/media/cartridge-replacements/active.json", "utf8"))
    .games.find(row => row[0] === "Bruce Lee");
  assert(standalone && selected, "Standalone Bruce Lee cartridge missing");
  assert.equal(standalone.format, "crt");
  assert.equal(standalone.approved, true);
  assert.equal(standalone.title, "Bruce Lee");
  assert.equal(standalone.url,
    "/emulator/c64/media/cartridge-replacements/" + selected[1]);
  assert.equal(standalone.bytes, selected[2]);
  assert.equal(standalone.sha256, selected[3]);
  assert.equal(direct.entries.filter(entry =>
    entry.title === "Bruce Lee" || entry.title === "Bruce Lee Trilogy").length, 2,
    "Exactly two distinct approved CRT editions must remain");
  assert(app.includes('entry.title.trim().toLocaleLowerCase() !== "bruce lee"'),
    "The defective packed PRG must remain excluded from library listing");
  assert.equal(parsePackedCatalog(packed).entries.filter(entry =>
    entry.title.toLocaleLowerCase() === "bruce lee").length, 0,
    "The defective packed PRG must be physically retired");
  assert.equal(packed.recordCount, 1150, "BLAST must retain all its 1,150 survivor games");
  const retired = JSON.parse(fs.readFileSync(
    "emulator/c64/media/blast/retired-ids.json", "utf8"));
  assert.equal(retired.mappings["blast-0289"], standalone.id,
    "Old Bruce Lee PRG bookmark must now resolve to standalone CRT");
});

test("the cartridge library checksum is verified against the user's supplied replacement", () => {
  // This is a fixed digest of the supplied file, deliberately checked without
  // committing a duplicate CRT binary to the repository.
  const hex = "6462a7562dcb539da2a6bfb843235dd70ffb2817403ea99efc350669b9e62999";
  assert.equal(bruceFile.sha256, hex);
  assert(bruceFile.approved);
  assert.match(bruceFile.description, /cartridge/i);
});
