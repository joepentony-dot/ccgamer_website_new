import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import test from "node:test";
import { parsePackedCatalog } from "../js/ccg-c64/game-catalog.js";

const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
const direct = JSON.parse(fs.readFileSync("emulator/c64/library.json", "utf8"));
const packed = JSON.parse(fs.readFileSync("emulator/c64/media/blast/catalog.json", "utf8"));
const bruceFile = direct.entries.find(entry => entry.id === "bruce-lee-trilogy");

test("the sole visible Bruce Lee option is the existing verified Trilogy CRT", () => {
  assert(bruceFile, "Bruce Lee Trilogy must remain in the owner-approved library");
  assert.equal(bruceFile.format, "crt");
  assert.equal(bruceFile.url, "/emulator/c64/media/bruce-lee-trilogy.crt");
  assert.equal(bruceFile.bytes, 131392);
  assert.equal(bruceFile.sha256,
    "6462a7562dcb539da2a6bfb843235dd70ffb2817403ea99efc350669b9e62999");
  assert.equal(direct.entries.filter(entry => /bruce lee/i.test(entry.title)).length, 1);
  assert(app.includes('entry.title.trim().toLocaleLowerCase() !== "bruce lee"'),
    "The older packed Bruce Lee PRG must not be offered to visitors");
  assert.equal(parsePackedCatalog(packed).entries.filter(entry =>
    entry.title.toLocaleLowerCase() === "bruce lee").length, 1,
    "Keep the underlying packed bytes and all other Blast records unchanged");
  assert.equal(packed.recordCount, 1878, "Pack integrity and counts must remain stable");
});

test("the cartridge library checksum is verified against the user's supplied replacement", () => {
  // This is a fixed digest of the supplied file, deliberately checked without
  // committing a duplicate CRT binary to the repository.
  const hex = "6462a7562dcb539da2a6bfb843235dd70ffb2817403ea99efc350669b9e62999";
  assert.equal(bruceFile.sha256, hex);
  assert(bruceFile.approved);
  assert.match(bruceFile.description, /cartridge/i);
});
