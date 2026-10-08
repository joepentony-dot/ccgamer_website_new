#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  HOSTED_C64_ROMS, HOSTED_ROM_ROOT,
  fetchVerifiedHostedROMs, installHostedROMs,
} from "../js/ccg-c64/hosted-roms.js";
import { ROMVault } from "../js/ccg-c64/rom-vault.js";
import { C64Machine } from "../js/ccg-c64/core/machine.js";

const originalFiles = {};
for (const { key, file, bytes, sha256 } of HOSTED_C64_ROMS) {
  const buffer = fs.readFileSync("emulator/c64/firmware/" + file);
  assert.equal(buffer.length, bytes, key + " firmware size");
  assert.equal(createHash("sha256").update(buffer).digest("hex"), sha256, key + " firmware SHA-256");
  originalFiles[key] = buffer;
}
assert.deepEqual(Array.from(originalFiles.basic.subarray(0, 4)), [0x94, 0xE3, 0x7B, 0xE3],
  "Original Commodore BASIC must retain both genuine cold- and warm-start vectors");

const digestImpl = async bytes => createHash("sha256").update(bytes).digest();
const fetchImpl = async (url, options) => {
  assert(url.startsWith(HOSTED_ROM_ROOT), "No third-party runtime ROM server");
  assert.equal(options.credentials, "same-origin");
  const spec = HOSTED_C64_ROMS.find(item => HOSTED_ROM_ROOT + item.file === url);
  assert(spec, "Only approved original Commodore ROM filenames may be fetched");
  return { ok: true, arrayBuffer: async () => originalFiles[spec.key] };
};

class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

test("verified C64 firmware is byte-identical on desktop and mobile", async () => {
  const desktop = new ROMVault(new MemoryStorage());
  const mobile = new ROMVault(new MemoryStorage());
  for (const vault of [desktop, mobile]) {
    const result = await fetchVerifiedHostedROMs({ fetchImpl, digestImpl });
    const snapshot = installHostedROMs(vault, result);
    assert.equal(snapshot.requiredReady, 3);
    assert.equal(snapshot.allRequiredReady, true);
  }
  for (const { key } of HOSTED_C64_ROMS) {
    assert.deepEqual(mobile.getBytes(key), desktop.getBytes(key), key + " differs between devices");
  }
});

test("corrupt or truncated ROMs are rejected without modifying installed ROMs or test fixtures", async () => {
  const vault = new ROMVault(new MemoryStorage());
  installHostedROMs(vault, await fetchVerifiedHostedROMs({ fetchImpl, digestImpl }));
  const saved = Object.fromEntries(HOSTED_C64_ROMS.map(({ key }) => [key, vault.getBytes(key).slice()]));
  await assert.rejects(fetchVerifiedHostedROMs({
    fetchImpl: async url => {
      const spec = HOSTED_C64_ROMS.find(item => url.endsWith(item.file));
      // Node Buffer.slice() aliases the source buffer. Clone deliberately.
      const bytes = Buffer.from(originalFiles[spec.key]);
      if (spec.key === "basic") bytes[0] ^= 0xFF;
      return { ok: true, arrayBuffer: async () => bytes };
    }, digestImpl,
  }), /SHA-256/);
  await assert.rejects(fetchVerifiedHostedROMs({
    fetchImpl: async url => {
      const spec = HOSTED_C64_ROMS.find(item => url.endsWith(item.file));
      return { ok: true, arrayBuffer: async () =>
        spec.key === "kernal" ? Buffer.from(originalFiles.kernal.subarray(0, 100))
          : originalFiles[spec.key] };
    }, digestImpl,
  }), /size/);
  for (const { key } of HOSTED_C64_ROMS) {
    assert.deepEqual(vault.getBytes(key), saved[key], "Corrupt response altered " + key);
  }
  assert.equal(originalFiles.basic[0], 0x94,
    "The negative test must never corrupt its shared BASIC ROM fixture");
});

test("the original CPU boots authentic Commodore BASIC V2 to READY", () => {
  const machine = new C64Machine();
  machine.loadROMs({
    kernal: new Uint8Array(originalFiles.kernal),
    basic: new Uint8Array(originalFiles.basic),
    charRom: new Uint8Array(originalFiles.charRom),
  });
  assert(machine.ready);
  const readyCodes = [18, 5, 1, 4, 25, 46];
  let found = false;
  let frame = 0;
  for (; frame < 250 && !found; frame++) {
    assert(machine.runFrame(), "Real PAL CPU simulation must advance");
    const ram = machine.mem.ram;
    for (let offset = 0x0400; offset <= 0x07F9 - readyCodes.length; offset++) {
      if (readyCodes.every((code, n) => (ram[offset + n] & 0x7F) === code)) {
        found = true;
        break;
      }
    }
  }
  assert(found, "Original C64 BASIC must display READY. within 250 PAL frames");
  assert.equal(machine.mem.basic[0], 0x94, "Emulation must never mutate BASIC ROM");
  console.log("PASS: authentic Commodore 64 BASIC READY. reached after " + frame + " PAL frames");
});

test("public CCG emulator boots verified firmware automatically before LOAD", () => {
  const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
  const html = fs.readFileSync("emulator/c64/index.html", "utf8");
  assert(app.includes("hostedFirmwareReadyPromise = bootWithHostedFirmware();"));
  assert(app.includes("await hostedFirmwareReadyPromise;"),
    "Selected games must wait for verified ROM startup");
  assert(app.includes("fetchVerifiedHostedROMs()"));
  assert(app.includes("installHostedROMs(vault, files)"));
  assert(app.includes("await powerOn()"));
  assert(!app.includes("open-rom-bundle"), "Do not restore experimental replacement ROMs");
  assert(html.includes("supplied automatically by this website"));
});
