#!/usr/bin/env node
"use strict";

// Isolated, multi-shard qualification for the existing 1,530 plus 534 individual cartridges.
// Verifies real ROM bytes, SHA-256, hardware bank layout and CPU advancement.
// Three PAL frames are a STARTUP SMOKE, NOT a certified gameplay playthrough.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { parseCRT } from "../js/ccg-c64/core/media/crt.js";
import { createCartridgeFromCRT } from "../js/ccg-c64/core/cartridges/registry.js";
import { C64Machine } from "../js/ccg-c64/core/machine.js";
import {
  parseAdditionalCrtCatalog, preferSelectedCartridges, catalogGameIdentity,
} from "../js/ccg-c64/game-catalog.js";

const shard = Number(process.argv[2]);
const shardCount = Number(process.argv[3]);
assert(Number.isInteger(shard) && Number.isInteger(shardCount) &&
  shardCount >= 1 && shardCount <= 16 && shard >= 0 && shard < shardCount,
  "Call with zero-based shard index and shard count.");
const sha256 = data => createHash("sha256").update(data).digest("hex");
const path = "emulator/c64/media/cartridge-replacements/active.json";
const activation = JSON.parse(fs.readFileSync(path, "utf8"));
assert.equal(activation.recordCount, 2064, "Activation must contain all 1,530 existing and 534 new CRT files.");
assert.equal(activation.ownerRedistributionAttested, true);
assert.equal(activation.gameplayCertified, false,
  "Three-frame smoke tests must never misstate full gameplay acceptance.");

const direct = JSON.parse(fs.readFileSync("emulator/c64/library.json", "utf8"));
const blast = JSON.parse(fs.readFileSync("emulator/c64/media/blast/catalog.json", "utf8"));
const archive = JSON.parse(fs.readFileSync("emulator/c64/media/prg-archive/catalog.json", "utf8"));
const originals = [
  ...direct.entries, ...blast.games.map(x => ({ id: x[0], title: x[1], format: x[2] })),
  ...archive.games.map(x => ({ id: x[0], title: x[1], format: x[2] })),
];
const oldTitles = new Set(originals.filter(x => x.format !== "crt")
  .map(x => catalogGameIdentity(x.title)));
const oldCRT = new Set(originals.filter(x => x.format === "crt")
  .map(x => catalogGameIdentity(x.title)));
const candidates = parseAdditionalCrtCatalog(activation);
assert.equal(candidates.length, 2064);
const results = preferSelectedCartridges([...originals, ...candidates]);
for (const [i, chosen] of candidates.entries()) {
  const key = catalogGameIdentity(chosen.title);
  if (i < 1530) {
    // Preserve the original 1,530-image contract: every promoted CRT replaces
    // a previously selectable non-CRT and never displaces an existing CRT.
    assert(oldTitles.has(key), "Missing original non-CRT fallback: " + chosen.title);
    assert(!oldCRT.has(key), "Original CRT would hide an existing CRT: " + chosen.title);
  }
  const matches = results.filter(x => catalogGameIdentity(x.title) === key);
  assert.equal(matches.length, 1, "A competing version remains: " + chosen.title);
  if (!oldCRT.has(key)) {
    assert.equal(matches[0].id, chosen.id, "CRT was not prioritised: " + chosen.title);
  } else {
    // Existing owner-selected CRT keeps priority over an alternate CRT.
    assert.equal(matches[0].format, "crt", "Existing CRT fallback lost: " + chosen.title);
  }
}

const firmware = Object.fromEntries([
  ["kernal", "emulator/c64/firmware/kernal-901227-03.bin"],
  ["basic", "emulator/c64/firmware/basic-901226-01.bin"],
  ["charRom", "emulator/c64/firmware/chargen-901225-01.bin"],
].map(([key, location]) => [key, new Uint8Array(fs.readFileSync(location))]));
const errors = [];
let successful = 0;
const types = {};
for (let i = shard; i < candidates.length; i += shardCount) {
  const entry = candidates[i];
  try {
    assert(/^\/emulator\/c64\/media\/cartridge-replacements\/[a-z0-9-]+\.crt$/
      .test(entry.url), "Unsafe media URL");
    const bytes = new Uint8Array(fs.readFileSync(entry.url.slice(1)));
    assert.equal(bytes.length, entry.bytes, "Length mismatch");
    assert.equal(sha256(bytes), entry.sha256, "SHA-256 mismatch");
    const crt = parseCRT(bytes);
    const originalType = activation.games[i][4];
    assert.equal(crt.hwType, originalType, "Hardware does not match original importer");
    const device = createCartridgeFromCRT(crt);
    assert.equal(device.hwType, crt.hwType, "Cartridge device registration failed");
    types[crt.hwType] = (types[crt.hwType] || 0) + 1;
    const machine = new C64Machine();
    machine.loadROMs(firmware);
    const mounted = machine.loadCartridge(bytes);
    assert.equal(mounted.hwType, crt.hwType, "Emulator failed to install cartridge");
    for (let frame = 0; frame < 3; frame++) {
      assert.equal(machine.runFrame(), true, "PAL CPU frame did not complete");
    }
    assert(Number.isInteger(machine.cpu.pc) && machine.cpu.pc >= 0 &&
      machine.cpu.pc <= 0xffff, "CPU PC out of bounds");
    successful++;
    if (successful % 40 === 0) console.log("CRT shard " + shard + ": " + successful + " verified");
  } catch (error) {
    errors.push({ title: entry.title, url: entry.url, reason: error?.message || String(error) });
  }
}
console.log("Shard", shard, "of", shardCount, ":", successful,
  "startup-smoked cartridge images", JSON.stringify(types));
if (errors.length) console.error("CRT qualification failures:", JSON.stringify(errors, null, 2));
assert.equal(errors.length, 0, "Some cartridge replacements failed CPU/media startup qualification");
