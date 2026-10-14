#!/usr/bin/env node
"use strict";

// Synthetic bank-tagged ROMs: no copyrighted game bytes enter this test.
import assert from "node:assert/strict";
import { Memory } from "../js/ccg-c64/core/memory.js";
import { IO_UNHANDLED } from "../js/ccg-c64/core/cartridges/device.js";
import { createCartridgeFromCRT } from "../js/ccg-c64/core/cartridges/registry.js";
import {
  FunPlayCartridge, SuperGamesCartridge, C64GSCartridge,
  DinamicCartridge, ZaxxonCartridge,
} from "../js/ccg-c64/core/cartridges/legacy-banked.js";

const chip = (bank, loadAddr, size, fill) => ({
  bank, loadAddr, size, data: new Uint8Array(size).fill(fill),
});
const image = (hwType, chips, game = 1) => ({
  hwType, name: "Synthetic CRT", exrom: 0, game, chips,
});

const fun = createCartridgeFromCRT(image(7,
  Array.from({ length: 16 }, (_, n) => chip(((n & 7) << 3) | (n >> 3),
    0x8000, 8192, n)), 0));
assert(fun instanceof FunPlayCartridge);
assert.equal(fun.mode, "8k", "Fun Play is 8K even if source CRT GAME flag is zero");
assert.equal(fun.romLo[0], 0);
assert.equal(fun.ioWrite(0xde00, 0x08), true);
assert.equal(fun.bank, 1);
assert.equal(fun.romLo[0], 1);
assert.equal(fun.ioWrite(0xde00, 0x01), true);
assert.equal(fun.bank, 8);
assert.equal(fun.romLo[0], 8);
assert.equal(fun.ioWrite(0xdf00, 0x00), false);
const funSaved = fun.serialize();
fun.ioWrite(0xde00, 0x86);
assert.equal(fun.mode, "none");
assert.equal(fun.romLo, null);
fun.deserialize(funSaved);
assert.equal(fun.bank, 8);
assert.equal(fun.mode, "8k");
fun.resetLine();
assert.equal(fun.bank, 0);

const supercart = createCartridgeFromCRT(image(8,
  Array.from({ length: 4 }, (_, n) => {
    const data = new Uint8Array(16384);
    data.fill(n, 0, 8192);
    data.fill(10 + n, 8192);
    return { bank: n, loadAddr: 0x8000, size: 16384, data };
  }), 0));
assert(supercart instanceof SuperGamesCartridge);
assert.equal(supercart.mode, "16k");
assert.equal(supercart.romHi[0], 10);
assert.equal(supercart.ioWrite(0xde00, 1), false);
assert.equal(supercart.ioWrite(0xdf00, 2), true);
assert.equal(supercart.bank, 2);
assert.equal(supercart.romLo[0], 2);
assert.equal(supercart.romHi[0], 12);
supercart.ioWrite(0xdf01, 9);
assert.equal(supercart.bank, 1);
assert.equal(supercart.locked, true);
supercart.ioWrite(0xdf00, 3);
assert.equal(supercart.bank, 1, "Super Games latch blocks writes until reset");
const superSaved = supercart.serialize();
supercart.resetLine();
assert.equal(supercart.locked, false);
supercart.deserialize(superSaved);
assert.equal(supercart.locked, true);
supercart.resetLine();
supercart.ioWrite(0xdf00, 4);
assert.equal(supercart.mode, "none");
assert.equal(supercart.romHi, null);

const gs = createCartridgeFromCRT(image(15,
  Array.from({ length: 64 }, (_, n) => chip(n, 0x8000, 8192, n))));
assert(gs instanceof C64GSCartridge);
assert.equal(gs.ioRead(0xde17), IO_UNHANDLED);
assert.equal(gs.bank, 23);
assert.equal(gs.romLo[0], 23);
assert.equal(gs.ioWrite(0xde3f, 255), true);
assert.equal(gs.bank, 63);
assert.equal(gs.ioWrite(0xdf00, 255), false);
assert.equal(gs.bank, 63);
gs.deserialize({ bank: 2 });
assert.equal(gs.romLo[0], 2);
gs.resetLine();
assert.equal(gs.bank, 0);

const din = createCartridgeFromCRT(image(17,
  Array.from({ length: 16 }, (_, n) => chip(n, 0x8000, 8192, n))));
assert(din instanceof DinamicCartridge);
assert.equal(din.ioRead(0xde0f), IO_UNHANDLED);
assert.equal(din.bank, 15);
assert.equal(din.romLo[0], 15);
assert.equal(din.ioWrite(0xde03, 1), false);
assert.equal(din.bank, 15, "Dinamic selects banks on reads, not writes");
assert.equal(din.ioRead(0xde10), IO_UNHANDLED);
assert.equal(din.bank, 15);
din.deserialize({ bank: 6 });
assert.equal(din.romLo[0], 6);
din.resetLine();
assert.equal(din.bank, 0);

const zax = createCartridgeFromCRT(image(18, [
  chip(0, 0x8000, 4096, 3),
  chip(0, 0xa000, 8192, 4),
  chip(1, 0xa000, 8192, 5),
], 0));
assert(zax instanceof ZaxxonCartridge);
assert.equal(zax.mode, "16k");
assert.equal(zax.romLo[0], 3);
assert.equal(zax.romLo[4096], 3, "4K ROML is mirrored at $9000");
assert.equal(zax.romHi[0], 4);
assert.equal(zax.peekRomLo(0x9000), 3);
assert.equal(zax.bank, 0, "Peek must not switch the high bank");
assert.equal(zax.readRomLo(0x9000), 3);
assert.equal(zax.romHi[0], 5);
assert.equal(zax.readRomLo(0x8000), 3);
assert.equal(zax.romHi[0], 4);
zax.deserialize({ bank: 1 });
assert.equal(zax.romHi[0], 5);
zax.resetLine();
assert.equal(zax.bank, 0);

// Real memory dispatch must honour the Zaxxon read hook, without allowing
// debug peeks or CPU opcode predecode to change the high bank.
const memory = new Memory();
memory.installCartridge(zax);
assert.equal(memory.peekForCpu(0x9000), 3);
assert.equal(zax.bank, 0);
assert.equal(memory.peek(0x9000), 3);
assert.equal(zax.bank, 0);
assert.equal(memory.read(0x9000), 3);
assert.equal(zax.bank, 1);
assert.equal(memory.read(0xa000), 5);
assert.equal(memory.peekForCpu(0x8000), 3);
assert.equal(zax.bank, 1);
assert.equal(memory.read(0x8000), 3);
assert.equal(memory.read(0xa000), 4);
// Unchanged ROML selections are the common CPU-fetch path; never rebuild
// the entire 256-page dispatch map for each instruction byte.
const originalApply = memory._applyCartridgeDeviceMapping.bind(memory);
let redundantRemaps = 0;
memory._applyCartridgeDeviceMapping = device => {
  redundantRemaps++;
  return originalApply(device);
};
memory.read(0x8000);
memory.read(0x8001);
memory.read(0x8002);
assert.equal(redundantRemaps, 0, "Stable Zaxxon ROML reads must not remap memory");
memory.read(0x9000);
assert.equal(redundantRemaps, 1, "Bank transition must remap memory once");
memory.installCartridge(null);

// Reject corrupt or incomplete manifests before accepting public images.
assert.throws(() => createCartridgeFromCRT(image(7, [chip(0, 0x8000, 8192, 0)], 0)), /Missing required/);
assert.throws(() => createCartridgeFromCRT(image(8, [chip(0, 0x8000, 8192, 0)], 0)), /Super Games/);
assert.throws(() => createCartridgeFromCRT(image(15, [chip(0, 0x8000, 8192, 0)])), /Missing required/);
assert.throws(() => createCartridgeFromCRT(image(17, [chip(0, 0x8000, 8192, 0)])), /Missing required/);
assert.throws(() => createCartridgeFromCRT(image(18, [chip(0, 0x8000, 4096, 0)], 0)), /Zaxxon/);
console.log("C64 Fun Play, Super Games, C64GS, Dinamic, Zaxxon ROM/bank/state tests passed.");
