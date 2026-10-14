#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import { OceanCartridge } from "../js/ccg-c64/core/cartridges/ocean.js";
import { createCartridgeFromCRT } from "../js/ccg-c64/core/cartridges/registry.js";

const chip = (bank, address, fill) => ({
  bank, loadAddr: address, size: 8192, data: new Uint8Array(8192).fill(fill),
});
const image = (chips, game = 1) => ({
  name: "Ocean fixture", hwType: 5, exrom: 0, game, chips,
});

const simple = createCartridgeFromCRT(image([
  chip(0, 0x8000, 0x11), chip(1, 0x8000, 0x22),
]));
assert(simple instanceof OceanCartridge);
assert.equal(simple.mode, "8k");
assert.equal(simple.romLo[0], 0x11);
assert.equal(simple.romHi, null);
assert.equal(simple.ioWrite(0xdc00, 0x01), false);
assert.equal(simple.ioWrite(0xde00, 0x81), true);
assert.equal(simple.bank, 1, "DE00 ignores high control bits");
assert.equal(simple.romLo[0], 0x22);
const saved = simple.serialize();
simple.resetLine();
assert.equal(simple.bank, 0);
simple.deserialize(saved);
assert.equal(simple.bank, 1);
assert.equal(simple.romLo[0], 0x22);

const mirrored = createCartridgeFromCRT(image([
  chip(0, 0x8000, 0x31), chip(1, 0x8000, 0x32),
], 0));
assert.equal(mirrored.mode, "16k");
assert.equal(mirrored.romLo[0], 0x31);
assert.equal(mirrored.romHi[0], 0x31);
mirrored.ioWrite(0xde40, 1);
assert.equal(mirrored.romHi[0], 0x32);

const split = createCartridgeFromCRT(image([
  chip(0, 0x8000, 0x40), chip(1, 0x8000, 0x41),
  chip(16, 0xa000, 0x50), chip(17, 0xa000, 0x51),
], 0));
assert.equal(split.mode, "16k");
assert.equal(split.romLo[0], 0x40);
assert.equal(split.romHi[0], 0x50);
split.ioWrite(0xde00, 17);
assert.equal(split.romLo[0], 0x41);
assert.equal(split.romHi[0], 0x51);
split.deserialize({ bank: 0, mode: "none" });
assert.equal(split.mode, "16k", "Saved state cannot change cartridge wiring");
assert.equal(split.romHi[0], 0x50);
assert.throws(() => createCartridgeFromCRT(image([
  chip(0, 0x8000, 1), chip(0, 0x8000, 2),
])), /Duplicate Ocean/);
assert.throws(() => createCartridgeFromCRT(image([
  chip(1, 0x8000, 1),
])), /missing its initial/);
assert.throws(() => createCartridgeFromCRT(image([
  chip(0, 0xc000, 1),
])), /Unexpected Ocean/);
assert.throws(() => createCartridgeFromCRT({
  ...image([chip(0, 0x8000, 1)]), exrom: 1, game: 1,
}), /requires an 8K or 16K/);

console.log("Ocean Type 1 bank, header, ROMH, reset and state contracts passed.");
