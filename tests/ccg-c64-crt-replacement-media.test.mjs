#!/usr/bin/env node
"use strict";

// Authentic owner-uploaded CRT media; never rewrite or extract PRG pack files.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { parseCRT } from "../js/ccg-c64/core/media/crt.js";
import { createCartridgeFromCRT } from "../js/ccg-c64/core/cartridges/registry.js";
import { C64Machine } from "../js/ccg-c64/core/machine.js";
import { normaliseCatalogSearch, preferSelectedCartridges } from "../js/ccg-c64/game-catalog.js";

const sha256 = data => createHash("sha256").update(data).digest("hex");
const manifest = JSON.parse(fs.readFileSync("docs/ccg-crt-review/REPLACEMENT-MANIFEST.json", "utf8"));
const hosted = JSON.parse(fs.readFileSync("emulator/c64/library.json", "utf8"));
const blast = JSON.parse(fs.readFileSync("emulator/c64/media/blast/catalog.json", "utf8"));
const archive = JSON.parse(fs.readFileSync("emulator/c64/media/prg-archive/catalog.json", "utf8"));
const expectedTitles = new Set([
  ...hosted.entries.map(item => normaliseCatalogSearch(item.title)),
  ...blast.games.map(item => normaliseCatalogSearch(item[1])),
  ...archive.games.map(item => normaliseCatalogSearch(item[1])),
]);
const firmware = Object.fromEntries([
  ["kernal", "emulator/c64/firmware/kernal-901227-03.bin"],
  ["basic", "emulator/c64/firmware/basic-901226-01.bin"],
  ["charRom", "emulator/c64/firmware/chargen-901225-01.bin"],
].map(([key, path]) => [key, new Uint8Array(fs.readFileSync(path))]));

assert.equal(manifest.candidate_count, 152);
assert.equal(manifest.games.length, 152);
// Every requested promoted CRT must have a prior, non-CRT counterpart kept
// intact in the on-disk catalogue or packed libraries.
const allEntries = [
  ...hosted.entries,
  ...blast.games.map(row => ({ id: row[0], title: row[1], format: row[2] })),
  ...archive.games.map(row => ({ id: row[0], title: row[1], format: row[2] })),
];
const originals = allEntries.filter(item => item.format !== "crt");
const originalsByTitle = new Set(originals.map(item => normaliseCatalogSearch(item.title)));
const retiredTitles = new Set();
// Earlier packed editions may now be physically retired, but only after the
// guarded repacker verified every original byte slice, every replacement CRT
// and a stable exact-ID alias. Their binaries remain recoverable in Git history.
for (const source of ["blast", "prg-archive"]) {
  const aliases = JSON.parse(fs.readFileSync(
    "emulator/c64/media/" + source + "/retired-ids.json", "utf8"));
  assert.equal(aliases.version, 1);
  assert.equal(aliases.source, source);
  assert.equal(aliases.recordCount, Object.keys(aliases.mappings).length);
  for (const chosenId of Object.values(aliases.mappings)) {
    const replacement = hosted.entries.find(entry =>
      entry.id === chosenId && entry.format === "crt" &&
      entry.approved === true && entry.preferOverOtherFormats === true);
    assert(replacement, "A retired packed PRG lost its verified CRT identity: " + chosenId);
    retiredTitles.add(normaliseCatalogSearch(replacement.title));
  }
}
const selected = preferSelectedCartridges(allEntries);
const visibleByTitle = new Map();
for (const row of selected) {
  const key = normaliseCatalogSearch(row.title);
  const versions = visibleByTitle.get(key) || [];
  versions.push(row);
  visibleByTitle.set(key, versions);
}
const paths = new Set(), titles = new Set(), failures = [], hardware = new Map();
for (const [index, item] of manifest.games.entries()) {
  const name = item.matching_catalogue_title;
  try {
    assert(typeof name === "string" && expectedTitles.has(normaliseCatalogSearch(name)),
      "Not an existing catalogue title: " + name);
    const key = normaliseCatalogSearch(name);
    const hostedCRT = hosted.entries.filter(entry =>
      entry.format === "crt" && entry.preferOverOtherFormats === true &&
      normaliseCatalogSearch(entry.title) === key);
    // Earlier approved editions retain first priority; an additional SHA-verified
    // replacement may coexist for a retired BLAST ID without displacing it.
    assert(hostedCRT.length >= 1, "Missing approved promoted CRT for " + name);
    assert.equal(hostedCRT[0].url, item.proposed_path,
      "Existing promoted CRT must remain canonical for " + name);
    assert.equal(hostedCRT[0].approved, true);
    assert.equal(hostedCRT[0].url, item.proposed_path);
    assert.equal(hostedCRT[0].sha256, item.sha256);
    assert.equal(hostedCRT[0].bytes, item.size);
    assert(originalsByTitle.has(key) || retiredTitles.has(key),
      "Selected CRT requires either an original disk/PRG or a SHA-audited retirement alias: " + name);
    const visible = visibleByTitle.get(key) || [];
    assert.equal(visible.length, 1, "Only chosen CRT should be displayed: " + name);
    assert.equal(visible[0].id, hostedCRT[0].id);
    assert(!titles.has(key), "Duplicate promotion title: " + name);
    titles.add(key);
    assert(/^\/emulator\/c64\/media\/cartridge-replacements\/[a-z0-9-]+\.crt$/.test(item.proposed_path),
      "Untrusted media path: " + item.proposed_path);
    assert(!paths.has(item.proposed_path), "Duplicate media path: " + item.proposed_path);
    paths.add(item.proposed_path);
    const bytes = new Uint8Array(fs.readFileSync(item.proposed_path.slice(1)));
    assert.equal(bytes.length, item.size, "Byte count mismatch");
    assert.equal(sha256(bytes), item.sha256, "SHA-256 mismatch");
    const crt = parseCRT(bytes);
    assert.equal(crt.hwType, item.hardware_type, "Hardware mismatch");
    assert.equal(crt.chips.length, item.chips, "CHIP count mismatch");
    assert(crt.chips.length > 0, "Missing CRT chip");
    const device = createCartridgeFromCRT(crt);
    assert.equal(device.hwType, crt.hwType, "Unexpected cartridge hardware");
    hardware.set(crt.hwType, (hardware.get(crt.hwType) || 0) + 1);
    const machine = new C64Machine();
    machine.loadROMs(firmware);
    const loaded = machine.loadCartridge(bytes);
    assert.equal(loaded.hwType, item.hardware_type, "Wrong emulator cartridge type");
    assert.equal(machine.runFrame(), true, "PAL CPU frame could not advance");
    assert(Number.isInteger(machine.cpu.pc) && machine.cpu.pc >= 0 && machine.cpu.pc <= 65535,
      "CPU program counter invalid");
    if ((index + 1) % 25 === 0) console.log("Media + CPU first-frame smoke: " + (index + 1) + "/152");
  } catch (error) {
    failures.push({ title: name, error: error?.message || String(error) });
  }
}
console.log("CRT hardware distribution:", JSON.stringify(Object.fromEntries(hardware)));
if (failures.length) console.error("CRT media qualification failures:", JSON.stringify(failures, null, 2));
assert.equal(failures.length, 0, failures.length + " cartridge files failed media/CPU-first-frame qualification.");
console.log("152 CRT files: SHA-256, title, layout, emulator install and CPU first-frame smoke passed.");
