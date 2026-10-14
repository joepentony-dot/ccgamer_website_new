import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { ROMVault } from "../js/ccg-c64/rom-vault.js";

class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
const synth = (size, seed) => Uint8Array.from({ length: size }, (_, i) => (i + seed) & 0xff);
const source = new ROMVault(new MemoryStorage());
source.install("kernal", synth(8192, 2), "kernal.rom");
source.install("basic", synth(8192, 3), "basic.rom");
source.install("charRom", synth(4096, 4), "chargen.rom");

test("export contains only the owner-installed local firmware without network calls", () => {
  const bundle = source.exportBundle();
  assert.equal(bundle.version, 1);
  assert.equal(bundle.format, "ccg-c64-local-rom-transfer");
  assert.deepEqual(Object.keys(bundle.entries).sort(), ["basic", "charRom", "kernal"]);
  assert(!JSON.stringify(bundle).includes("https://"), "Transfer is local-only");
});

test("a saved desktop ROM set boots as complete after phone import and local restore", () => {
  const phoneStorage = new MemoryStorage();
  const phone = new ROMVault(phoneStorage);
  assert.equal(phone.snapshot().requiredReady, 0);
  assert.equal(phone.importBundle(JSON.parse(JSON.stringify(source.exportBundle()))).requiredReady, 3);
  assert.equal(phone.snapshot().allRequiredReady, true);
  assert.deepEqual(Array.from(phone.getBytes("kernal")), Array.from(source.getBytes("kernal")));
  assert.deepEqual(Array.from(phone.getBytes("basic")), Array.from(source.getBytes("basic")));
  assert.deepEqual(Array.from(phone.getBytes("charRom")), Array.from(source.getBytes("charRom")));
  const reopenedPhone = new ROMVault(phoneStorage);
  assert.equal(reopenedPhone.restore().allRequiredReady, true);
});

test("an incomplete or malformed transfer never overwrites installed ROMs", () => {
  const storage = new MemoryStorage();
  const phone = new ROMVault(storage);
  phone.importBundle(source.exportBundle());
  const before = Array.from(storage.data.entries());
  const broken = JSON.parse(JSON.stringify(source.exportBundle()));
  delete broken.entries.basic;
  assert.throws(() => phone.importBundle(broken), /missing BASIC/i);
  assert.deepEqual(Array.from(storage.data.entries()), before);
  const wrong = JSON.parse(JSON.stringify(source.exportBundle()));
  wrong.entries.kernal.data = "AAAA";
  assert.throws(() => phone.importBundle(wrong), /Incorrect KERNAL/i);
  assert.deepEqual(Array.from(storage.data.entries()), before);
  assert.throws(() => phone.importBundle({version: 1, format: "wrong", entries: {}}), /not a CCG/i);
});

test("optional 1541 ROM is transferred only if it was installed", () => {
  source.install("drive1541", synth(16384, 5), "1541.rom");
  const phone = new ROMVault(new MemoryStorage());
  assert.equal(phone.importBundle(source.exportBundle()).driveReady, true);
  assert.equal(phone.getBytes("drive1541").length, 16384);
});

test("visible ROM transfer controls are integrated without bundling any original ROMs", () => {
  const html = fs.readFileSync("emulator/c64/index.html", "utf8");
  const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
  assert(html.includes("data-rom-export disabled"));
  assert(html.includes('data-rom-import hidden'));
  assert(app.includes("vault.exportBundle()"));
  assert(app.includes("vault.importBundle(bundle)"));
  assert(app.includes('new Blob([payload], { type: "application/json" })'));
  assert(app.includes("render(snapshot)"));
  assert(app.includes("if (!running) await powerOn()"), "Successful mobile import must boot the real machine");
});
