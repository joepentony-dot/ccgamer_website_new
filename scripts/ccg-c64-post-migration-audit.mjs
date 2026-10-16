#!/usr/bin/env node
"use strict";

// Read-only, post-migration inventory: no original media or game records change.
// The list of exact-title matches is NOT approval to remove any disk image.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { catalogGameIdentity } from "../js/ccg-c64/game-catalog.js";

const file = name => JSON.parse(fs.readFileSync(name, "utf8"));
const root = "emulator/c64/media/";
const library = file("emulator/c64/library.json");
const active = file(root + "cartridge-replacements/active.json");
const blast = file(root + "blast/catalog.json");
const archive = file(root + "prg-archive/catalog.json");
const blastAliases = file(root + "blast/retired-ids.json");
const archiveAliases = file(root + "prg-archive/retired-ids.json");
const sha = data => createHash("sha256").update(data).digest("hex");
assert.equal(library.version, 1);
assert.equal(active.recordCount, active.games.length);
assert.equal(active.recordCount, 2064);
assert.equal(blast.recordCount, blast.games.length);
assert.equal(blast.recordCount, 1150);
assert.equal(archive.recordCount, archive.games.length);
assert.equal(archive.recordCount, 8321);
assert.equal(blastAliases.recordCount, 728);
assert.equal(archiveAliases.recordCount, 1528);
assert.equal(library.entries.length, 1770);
const directIds = new Set(library.entries.map(x => x.id));
assert.equal(directIds.size, library.entries.length, "Duplicate direct game ID");

const byIdentity = new Map();
for (const row of active.games) {
  const [title, filename, bytes, digest] = row;
  const id = "owner-crt-more-" + filename.slice(0, -4);
  const key = catalogGameIdentity(title);
  assert(!byIdentity.has(key), "Duplicate activated CRT identity: " + title);
  byIdentity.set(key, { id, title, filename, bytes, digest });
}
const directCrtTitles = new Map();
for (const entry of library.entries.filter(x => x.format === "crt" && x.approved === true)) {
  const key = catalogGameIdentity(entry.title);
  if (!directCrtTitles.has(key)) directCrtTitles.set(key, entry);
}

function matches(title) {
  const identity = catalogGameIdentity(title);
  const selected = byIdentity.get(identity);
  const directCrt = directCrtTitles.get(identity);
  return selected ? { id: selected.id, path: root + "cartridge-replacements/" + selected.filename,
    bytes: selected.bytes, sha256: selected.digest, source: "activated" }
    : directCrt ? { id: directCrt.id, path: directCrt.url,
      bytes: directCrt.bytes, sha256: directCrt.sha256, source: "direct" } : null;
}

const directDisks = library.entries.filter(e => e.format === "d64");
const directPrgs = library.entries.filter(e => e.format === "prg");
const simple = [], multi = [], directPrgMatches = [];
for (const entry of directDisks) {
  const replacement = matches(entry.title);
  if (!replacement) continue;
  const record = { title: entry.title, id: entry.id,
    disks: Array.isArray(entry.disks) ? entry.disks.length : 1,
    crt: replacement.id, source: replacement.source };
  (record.disks > 1 ? multi : simple).push(record);
}
for (const entry of directPrgs) {
  const replacement = matches(entry.title);
  if (replacement) directPrgMatches.push({ title: entry.title, id: entry.id, crt: replacement.id });
}

const packedSurvivorMatches = [];
for (const [source, catalog] of [["blast",blast],["archive",archive]]) {
  for (const row of catalog.games) {
    if (row[2] !== "prg") continue;
    const replacement = matches(row[1]);
    if (replacement) packedSurvivorMatches.push({source, id: row[0], title: row[1], crt: replacement.id});
  }
}
const packs = [["blast",blast,11],["prg-archive",archive,48]];
for(const [name,catalog,expected] of packs) {
  assert.equal(catalog.packs.length,expected);
  for(const pack of catalog.packs) {
    const data = fs.readFileSync(root + name + "/" + pack.file);
    assert.equal(data.length,pack.bytes,name + " pack size mismatch: " + pack.file);
    assert.equal(sha(data),pack.sha256,name + " pack hash mismatch: " + pack.file);
  }
}
for(const [source,aliases] of [["blast",blastAliases],["prg-archive",archiveAliases]]) {
  assert.equal(aliases.source, source);
  assert.equal(Object.keys(aliases.mappings).length, aliases.recordCount);
  for(const id of Object.values(aliases.mappings)) {
    assert(directIds.has(id),"Retired " + source + " PRG points to a missing direct cartridge: " + id);
  }
}

// Verify the full contents of every *direct* CRT that might replace
// one of the remaining packed PRGs. Title matching alone is not enough.
const directById = new Map(library.entries.map(e => [e.id, e]));
const directTargets = new Set();
const exactMatchBySource = { blast: 0, archive: 0 };
for (const entry of packedSurvivorMatches) {
  exactMatchBySource[entry.source]++;
  const replacement = directById.get(entry.crt);
  assert(replacement && replacement.approved === true &&
    replacement.format === "crt" && replacement.preferOverOtherFormats === true,
    "Unapproved or missing direct CRT for packed PRG: " + entry.id);
  if (directTargets.has(entry.crt)) continue;
  assert(/^\\/emulator\\/c64\\/media\\/(?:[a-zA-Z0-9._-]+\\.crt|cartridge-replacements\\/[a-z0-9-]+\\.crt)$/.test(replacement.url),
    "Unsafe direct CRT path for " + entry.crt);
  const bytes = fs.readFileSync(replacement.url.slice(1));
  assert.equal(bytes.length, replacement.bytes, "Direct CRT size mismatch: " + entry.crt);
  assert.equal(sha(bytes), replacement.sha256, "Direct CRT SHA mismatch: " + entry.crt);
  assert.equal(bytes.subarray(0, 13).toString("ascii"), "C64 CARTRIDGE",
    "Not a CRT file: " + entry.crt);
  directTargets.add(entry.crt);
}

const sorted = values => values.sort((a,b) => a.title.localeCompare(b.title,"en-GB"));
const summary = {
  libraryEntries: library.entries.length,
  activatedCartridges: active.recordCount,
  survivingPackedPrgs: blast.recordCount + archive.recordCount,
  aliasLinks: blastAliases.recordCount + archiveAliases.recordCount,
  directD64Count: directDisks.length,
  directPrgCount: directPrgs.length,
  exactTitleSingleDiskCrtCandidates: simple.length,
  exactTitleMultiDiskCrtCandidates: multi.length,
  exactTitleDirectPrgCrtCandidates: directPrgMatches.length,
  exactTitleRemainingPackedPrgMatches: packedSurvivorMatches.length,
  exactPackedMatchesBySource: exactMatchBySource,
  shaVerifiedDirectCrtTargets: directTargets.size,
  singleDiskCandidates: sorted(simple),
  multiDiskCandidates: sorted(multi),
  directPrgCandidates: sorted(directPrgMatches),
  stillPackedCrtMatches: sorted(packedSurvivorMatches),
  allStillPackedMatchCount: packedSurvivorMatches.length,
  disclaimer: "Exact title, SHA and startup do not prove full-game CRT functionality; no deletion authorised."
};
console.log("CCG_POST_MIGRATION_AUDIT=" + JSON.stringify(summary));
