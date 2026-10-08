#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(root, "js/ccg-c64/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "emulator/c64/index.html"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "emulator/c64/library.json"), "utf8"));

assert(html.includes("data-swap-disk"), "Drive 8 must have a distinct hot SWAP DISK button");
assert(html.includes('id="ccg-c64-swap-disk-input"'), "Swap button needs a separate disk-only file input");
assert(html.includes("data-online-library-disk-select"), "Online library needs disk-side selector");
assert(html.includes("data-online-library-disk-swap"), "Online library needs a no-reset disk-swap button");
assert(manifest.entries.every((entry) => !entry.disks || (
  entry.format === "d64" && Array.isArray(entry.disks) && entry.disks.length >= 2
)), "Only appropriate games may advertise multi-disk support");
assert(app.includes('swapDiskInput?.addEventListener("change"'), "Local disk swap must respond to chosen files");
assert(app.includes('onlineLibraryDiskSwapButton?.addEventListener("click"'),
  "Online library disk side swap must be wired");

const start = app.indexOf("function swapMountedDisk(");
const end = app.indexOf("async function openMediaBytes(", start);
assert(start >= 0 && end > start, "Disk-swap implementation was not found");
const code = app.slice(start, end);
assert(!code.includes("prepareFreshGameSession("), "A disk swap must not reset the emulator");
assert(!code.includes("machine.injectRun("), "A disk swap must not issue RUN");
assert(!code.includes('type: \'LOAD'), "A disk swap must not issue a LOAD command");

const first = new Uint8Array([1, 2, 3]);
const second = new Uint8Array([8, 9, 10]);
const diskSideCache = new Map();
let mountedDisk = { name: "disk1.d64", bytes: first.slice(), kind: "d64" };
let mountedDiskKey = "library:demo:0";
const state = { position: 42 };
let started = 0;
let reset = 0;
let cancelled = 0;
const machine = {
  ram: state,
  currentD64: { img: first.slice() },
  setD64(d) { this.currentD64 = d; this.diskChanges = (this.diskChanges || 0) + 1; },
  setTrueDrive(v) { this.trueDrive = v; },
  reset() { reset++; },
  injectRun() { started++; },
};
const libraryRow = { hidden: true };
const list = {
  value: "", options: [],
  replaceChildren(...value) { this.options = value; },
  append(option) { this.options.push(option); },
};
const globals = {
  machine, running: true, mountedDisk, mountedDiskKey, diskSideCache,
  driveMode: "fast",
  vault: { getBytes() { return new Uint8Array([1]); }, snapshot() { return {}; } },
  D64: class { constructor(b) { this.img = b.slice(); } },
  G64: class {},
  createDiskFromMedia(media) { return { img: media.bytes.slice() }; },
  isG64() { return false; },
  d64Variant(length) { return length === 3 ? { kind: "d64" } : null; },
  mediaTypeFromName(name) { return name.split(".").pop(); },
  captureMutableMedia() {
    if (globals.mountedDisk && machine.currentD64?.img) {
      globals.mountedDisk = { ...globals.mountedDisk, bytes: machine.currentD64.img.slice() };
      diskSideCache.set(globals.mountedDiskKey, { ...globals.mountedDisk, bytes: globals.mountedDisk.bytes.slice() });
    }
  },
  cancelAutoStart() { cancelled++; },
  updateMediaControls() {},
  screen: { focus() {} },
  diskSlotStatus: { textContent: "" },
  machineState: { textContent: "" },
  stageNote: { textContent: "" },
  onlineLibraryEntries: [],
  activeLibraryEntryId: null,
  activeLibraryDiskIndex: 0,
  onlineLibraryDisks: libraryRow,
  onlineLibraryDiskSelect: list,
  onlineLibraryDiskSwapButton: { disabled: true },
  document: { createElement() { return { value: "", textContent: "" }; } },
  fetch() { throw new Error("Unexpected external fetch"); },
};
const ctx = vm.createContext(globals);
vm.runInContext(code +
  "\nglobalThis.swap = swapMountedDisk; globalThis.sides = onlineDiskSides; globalThis.refreshDisks = updateOnlineDiskUi;",
  ctx);

ctx.swap({ name: "disk2.d64", type: "d64", bytes: second }, "library:demo:1");
assert.equal(globals.machine.ram, state, "C64 memory must survive disk change");
assert.equal(reset, 0, "C64 must not reset during disk change");
assert.equal(started, 0, "Disk swap must not issue RUN");
assert.equal(cancelled, 1, "Pending auto-start must be cancelled before disk swap");
assert.equal(machine.diskChanges, 1, "Disk must be hot-mounted in drive 8");
assert.deepEqual(Array.from(machine.currentD64.img), [8, 9, 10]);
assert.deepEqual(Array.from(diskSideCache.get("library:demo:0").bytes), [1, 2, 3]);

machine.currentD64.img[1] = 77;
ctx.swap({ name: "disk1.d64", type: "d64", bytes: first }, "library:demo:0");
assert.deepEqual(Array.from(machine.currentD64.img), [1, 2, 3], "Returning to side 1 must restore side 1");
assert.equal(diskSideCache.get("library:demo:1").bytes[1], 77,
  "Changes written to side 2 must be preserved on swap");

ctx.swap({ name: "disk2.d64", type: "d64", bytes: second }, "library:demo:1");
assert.deepEqual(Array.from(machine.currentD64.img), [8, 77, 10],
  "Returning to side 2 must retain in-game disk writes");
assert.equal(machine.ram.position, 42, "Running game must keep its position in memory");

const multi = {
  id: "demo", disks: [
    { label: "Disk 1", filename: "disk1.d64", format: "d64", url: "/emulator/c64/media/disk1.d64" },
    { label: "Disk 2", filename: "disk2.d64", format: "d64", url: "/emulator/c64/media/disk2.d64" },
  ],
};
ctx.onlineLibraryEntries.push(multi);
ctx.activeLibraryEntryId = "demo";
ctx.activeLibraryDiskIndex = 1;
ctx.refreshDisks();
assert.equal(libraryRow.hidden, false, "Multi-disk titles must show a disk selector");
assert.equal(list.options.length, 2, "Multi-disk selector must contain both sides");
assert.equal(list.options[1].textContent, "Disk 2");
assert.equal(list.value, "1", "Active disk side must remain selected");
assert.equal(globals.onlineLibraryDiskSwapButton.disabled, false);
ctx.activeLibraryEntryId = null;
ctx.refreshDisks();
assert.equal(libraryRow.hidden, true, "Local games must not display an unrelated online disk selector");

console.log("C64 hot disk swap, no-reset behaviour, side write preservation and multi-disk selector passed.");
