#!/usr/bin/env node
// Read-only source reconstruction of the C64 emulator's visible-game catalogue.
// No fuzzy publisher attribution, media downloads, deletion or generated-page writes.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARCHIVE_PACK_ROOT, PACK_ROOT, catalogGameIdentity,
  parseAdditionalCrtCatalog, parsePackedCatalog, preferSelectedCartridges,
} from "../js/ccg-c64/game-catalog.js";
import { parseMetadata } from "../js/ccg-c64/catalogue-browser.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePaths = [
  "emulator/c64/library.json",
  "emulator/c64/media/cartridge-replacements/active.json",
  "emulator/c64/media/blast/catalog.json",
  "emulator/c64/media/prg-archive/catalog.json",
  "emulator/c64/media/prg-archive/ready.json",
  "emulator/c64/catalogue-metadata.json",
];
const buf = (p) => fs.readFileSync(path.join(root, p));
const read = (p) => JSON.parse(buf(p).toString("utf8"));
const blobSha = (bytes) => crypto.createHash("sha1")
  .update("blob " + bytes.length + "\0").update(bytes).digest("hex");

const ledger = read("docs/ccg-c64-publisher-visible-20261016.json");
assert.equal(ledger.version, 1);
assert.equal(ledger.auditScope, "direct library + active cartridges + BLAST + packed PRG archive (loader-equivalent view)");
for (const file of sourcePaths) {
  assert.equal(blobSha(buf(file)), ledger.sourceBlobs[file],
    "Live-source inventory changed; regenerate full publisher research backlog: " + file);
}
const data = read(sourcePaths[0]), active = read(sourcePaths[1]);
const blast = read(sourcePaths[2]), archive = read(sourcePaths[3]);
const ready = read(sourcePaths[4]), metadata = parseMetadata(read(sourcePaths[5]));
assert(Array.isArray(data.entries));
assert.equal(active.recordCount, active.games.length);
assert.equal(ready.version, 1);
assert.equal(ready.recordCount, archive.recordCount);
assert.equal(ready.packCount, archive.packs.length);
assert.equal(crypto.createHash("sha256").update(buf(sourcePaths[3])).digest("hex"),
  ready.catalogSHA256, "Archive activation marker must match packed catalogue");
const SUPPORTED = new Set(["prg", "d64", "d71", "d81", "g64", "crt", "tap", "t64"]);
const direct = data.entries.filter(e =>
  e && e.approved === true && typeof e.id === "string" &&
  typeof e.title === "string" && typeof e.license === "string" &&
  e.license.trim() && SUPPORTED.has(String(e.format || "").toLowerCase()) &&
  ((typeof e.url === "string" && e.url.startsWith("/emulator/c64/media/")) ||
   (typeof e.dataBase64 === "string" && e.dataBase64.length > 0)));
const regular = direct.concat(parseAdditionalCrtCatalog(active));
const titleFormat = e => e.title.trim().toLocaleLowerCase() + "|" + String(e.format).toLowerCase();
const directKeys = new Set(regular.map(titleFormat));
const blastRows = parsePackedCatalog(blast, { packRoot: PACK_ROOT }).entries;
const packed = blastRows.filter(e =>
  e.title.trim().toLocaleLowerCase() !== "bruce lee" &&
  !directKeys.has(titleFormat(e)));
const listed = new Set([...regular, ...packed].map(titleFormat));
const archiveRows = parsePackedCatalog(archive, { packRoot: ARCHIVE_PACK_ROOT }).entries;
const archived = archiveRows.filter(e =>
  e.title.trim().toLocaleLowerCase() !== "bruce lee" &&
  !listed.has(titleFormat(e)));
const candidateRecords = [...regular, ...packed, ...archived];
const visible = preferSelectedCartridges(candidateRecords);
const titles = new Set(visible.map(e => catalogGameIdentity(e.title)));
assert.equal(titles.size, visible.length, "Exact visible identity collision");
const unmatched = [];
let publisherLabelled = 0, yearKnown = 0;
for (const entry of visible) {
  const key = catalogGameIdentity(entry.title);
  const record = metadata.get(key);
  const fromDirect = Array.isArray(entry.publisher)
    ? entry.publisher.length : typeof entry.publisher === "string" && entry.publisher.trim() ? 1 : 0;
  if (fromDirect || record?.publishers.length) publisherLabelled++;
  else unmatched.push(key);
  if (Number.isInteger(record?.year)) yearKnown++;
}
unmatched.sort();
const packedCollisions = new Map();
for (const game of [...blastRows, ...archiveRows]) {
  const key = catalogGameIdentity(game.title);
  if (!packedCollisions.has(key)) packedCollisions.set(key, new Set());
  packedCollisions.get(key).add(game.sha256);
}
const ambiguousSameTitleBinaryKeys = [...packedCollisions]
  .filter(([, hashes]) => hashes.size > 1).map(([k]) => k).sort();
const counts = {
  rawSourceRecords: data.entries.length + active.games.length + blast.games.length + archive.games.length,
  regularRecords: regular.length, packedRecords: packed.length, archiveRecords: archived.length,
  postLoaderRecords: candidateRecords.length, visibleGames: visible.length,
  suppressedSameKeyRecords: candidateRecords.length - visible.length,
  publisherLabelled, publisherNotListed: unmatched.length, yearKnown,
  packedTitleCollisions: ambiguousSameTitleBinaryKeys.length,
};
assert.deepEqual(counts, ledger.counts, "Visible emulator coverage drift");
assert.deepEqual(unmatched, ledger.unmatched, "Full unmatched-publisher identity ledger drift");
assert.deepEqual(ambiguousSameTitleBinaryKeys, ledger.ambiguousSameTitleBinaryKeys,
  "Packed same-title SHA collision ledger drift");
assert.equal(counts.publisherLabelled + counts.publisherNotListed, counts.visibleGames);
assert(unmatched.includes("armageddon"), "Ambiguous Armageddon must stay unattributed");
if (process.argv.includes("--unmatched-json")) {
  console.log(JSON.stringify({
    auditScope: ledger.auditScope, unmatchedTitleKeys: unmatched.length,
    packedPRGCollisionTitleKeys: ambiguousSameTitleBinaryKeys, unmatched
  }, null, 2));
} else {
  console.log(JSON.stringify({ result: "PASS", auditScope: ledger.auditScope, ...counts }));
}
