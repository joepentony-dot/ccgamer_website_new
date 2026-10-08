#!/usr/bin/env node
"use strict";
import assert from "node:assert/strict";
import { ROMVault } from "../js/ccg-c64/rom-vault.js";
import { readBundledOpenRoms } from "../js/ccg-c64/open-rom-bundle.js";

const map = new Map();
const storage = {
  getItem: (k) => map.get(k) ?? null,
  setItem: (k,v) => map.set(k,v),
  removeItem: (k) => map.delete(k),
};
const vault = new ROMVault(storage);
assert.equal(vault.restore().requiredReady,0);
const roms = readBundledOpenRoms();
assert.equal(vault.useBundledOpenRoms(roms),true);
assert.equal(vault.snapshot().requiredReady,3);
assert.equal(vault.usingBundledOpenRoms(),true);
assert.equal(map.size,0,"Bundled fallback must NOT be persisted as the user's original ROMs");
assert.equal(vault.useBundledOpenRoms(roms),false);
vault.install("drive1541",new Uint8Array(16384),"user-drive.rom");
assert.equal(vault.snapshot().requiredReady,3,"Optional drive install must not erase the fallback");
assert.equal(vault.usingBundledOpenRoms(),true);
vault.install("kernal",new Uint8Array(8192),"user-kernal.rom");
assert.equal(vault.usingBundledOpenRoms(),false);
assert.equal(vault.snapshot().requiredReady,1,"Installing first original ROM must clear both other bundled ROMs");
vault.install("basic",new Uint8Array(8192),"user-basic.rom");
vault.install("charRom",new Uint8Array(4096),"user-chargen.rom");
assert.equal(vault.snapshot().requiredReady,3);
assert.equal(vault.usingBundledOpenRoms(),false);
assert.equal(new ROMVault(storage).restore().requiredReady,3,"Real user's firmware must persist across sessions");
vault.clear();
assert.equal(vault.snapshot().requiredReady,0);
assert.equal(vault.useBundledOpenRoms(roms),true);
console.log("PASS no-setup Open ROM fallback, original ROM priority and no mixed firmware.");
