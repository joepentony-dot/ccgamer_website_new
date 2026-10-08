#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import { HOSTED_C64_ROMS, HOSTED_ROM_ROOT, fetchVerifiedHostedROMs, installHostedROMs } from "../js/ccg-c64/hosted-roms.js";
import { ROMVault } from "../js/ccg-c64/rom-vault.js";
import { C64Machine } from "../js/ccg-c64/core/machine.js";

const files = {};
for (const { key, file, bytes, sha256 } of HOSTED_C64_ROMS) {
  const buffer = fs.readFileSync("emulator/c64/firmware/" + file);
  assert.equal(buffer.length, bytes, key + " length");
  assert.equal(createHash("sha256").update(buffer).digest("hex"), sha256, key + " SHA-256");
  files[key] = buffer;
}

const digestImpl = async bytes => createHash("sha256").update(bytes).digest();
const fetchImpl = async (url, options) => {
  assert(url.startsWith(HOSTED_ROM_ROOT), "ROM must come from CCG same-origin path");
  assert.equal(options.credentials, "same-origin");
  const spec = HOSTED_C64_ROMS.find(entry => HOSTED_ROM_ROOT + entry.file === url);
  assert(spec, "Only verified original C64 ROM filenames may be fetched");
  return { ok: true, arrayBuffer: async () => files[spec.key] };
};

class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

test("same three original verified firmware files load on desktop and mobile", async () => {
  const desktop = new ROMVault(new MemoryStorage());
  const mobile = new ROMVault(new MemoryStorage());
  for (const vault of [desktop, mobile]) {
    const bytes = await fetchVerifiedHostedROMs({ fetchImpl, digestImpl });
    const snapshot = installHostedROMs(vault, bytes);
    assert.equal(snapshot.requiredReady, 3);
    assert(snapshot.allRequiredReady);
  }
  for (const { key } of HOSTED_C64_ROMS) {
    assert.deepEqual(mobile.getBytes(key), desktop.getBytes(key), key + " must be identical");
  }
});

test("a truncated or substituted ROM can never replace the user's existing bank", async () => {
  const vault = new ROMVault(new MemoryStorage());
  const verified = await fetchVerifiedHostedROMs({ fetchImpl, digestImpl });
  installHostedROMs(vault, verified);
  const existing = vault.getBytes("kernal").slice();
  await assert.rejects(fetchVerifiedHostedROMs({
    fetchImpl: async url => {
      const spec = HOSTED_C64_ROMS.find(entry => url.endsWith(entry.file));
      const bytes = files[spec.key].slice();
      if (spec.key === "basic") bytes[0] ^= 0xff;
      return { ok: true, arrayBuffer: async () => bytes };
    }, digestImpl,
  }), /SHA-256/);
  assert.deepEqual(vault.getBytes("kernal"), existing);
  await assert.rejects(fetchVerifiedHostedROMs({
    fetchImpl: async url => {
      const spec = HOSTED_C64_ROMS.find(entry => url.endsWith(entry.file));
      return { ok: true, arrayBuffer: async () => spec.key === "kernal" ? files.kernal.slice(0,100) : files[spec.key] };
    }, digestImpl,
  }), /size/);
});

test("real Commodore BASIC V2 reaches READY screen through the machine's CPU", () => {
  const machine = new C64Machine();
  machine.loadROMs({
    kernal: new Uint8Array(files.kernal),
    basic: new Uint8Array(files.basic),
    charRom: new Uint8Array(files.charRom),
  });
  assert(machine.ready, "Real machine must initialise");
  const ready = [18,5,1,4,25,46]; // C64 screen codes for READY.
  let frames=0, found=false;
  for (;frames<120;frames++) {
    assert(machine.runFrame(), "Emulation must advance PAL frames");
    const mem=machine.mem.ram;
    for(let i=0x0400;i<0x07fa;i++) {
      let matches=true;
      for(let j=0;j<ready.length;j++) if ((mem[i+j]&0x7f)!==ready[j]) {matches=false;break;}
      if(matches) {found=true;break;}
    }
    if(found) break;
  }
  if (!found) {
    const ram = machine.mem.ram;
    console.log("BASIC cold boot diagnostic: CPU PC", machine.cpu.pc?.toString(16),
      "CPU jammed", machine.cpu.jammed ?? machine.cpu.jam,
      "Reset vector", Array.from(files.kernal.slice(-4)).map(x => x.toString(16)));
    for (let row=0;row<12;row++) {
      const bytes=Array.from(ram.subarray(0x0400+row*40,0x0400+(row+1)*40));
      const decoded=bytes.map(value=>{const code=value&0x7f;return code===32?" ":code>=1&&code<=26?String.fromCharCode(code+64):code===46?".":`[${code.toString(16)}]`;}).join("");
      console.log("SCREEN",row,decoded,"hex",bytes.slice(0,12).map(b=>b.toString(16).padStart(2,"0")).join(" "));
    }
  }
  assert(found,"Original Commodore BASIC must render READY. into screen memory within 120 frames");
  console.log("Original BASIC READY reached in", frames+1,"PAL frames.");
});

test("CCG boots original firmware automatically before a selected game starts", () => {
  const app=fs.readFileSync("js/ccg-c64/app.js","utf8");
  const html=fs.readFileSync("emulator/c64/index.html","utf8");
  assert(app.includes("hostedFirmwareReadyPromise = bootWithHostedFirmware();"));
  assert(app.includes("await hostedFirmwareReadyPromise;"));
  assert(app.includes("fetchVerifiedHostedROMs()"));
  assert(app.includes("installHostedROMs(vault, files)"));
  assert(app.includes("await powerOn()"));
  assert(!app.includes("open-rom-bundle"));
  assert(html.includes("provided automatically by this website"));
});
