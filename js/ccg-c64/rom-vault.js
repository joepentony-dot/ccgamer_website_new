// SPDX-License-Identifier: GPL-3.0-or-later
// CCG browser C64 ROM vault.
// Portions of the ROM validation / VICE-folder matching approach are derived
// from GPL-3.0-or-later source Copyright © 2026 Morten Øien Eriksen.
// This file is a modified implementation for the Cheeky Commodore Gamer site.

export const ROM_SPEC = Object.freeze({
  kernal: {
    storageKey: "ccg.emulator.c64.rom.kernal",
    sizes: [8192],
    label: "KERNAL",
    required: true,
  },
  basic: {
    storageKey: "ccg.emulator.c64.rom.basic",
    sizes: [8192],
    label: "BASIC",
    required: true,
  },
  charRom: {
    storageKey: "ccg.emulator.c64.rom.charRom",
    sizes: [4096],
    label: "CHARGEN",
    required: true,
  },
  drive1541: {
    storageKey: "ccg.emulator.c64.rom.drive1541",
    sizes: [16384, 16386],
    label: "1541 DOS",
    required: false,
  },
});

export const REQUIRED_ROM_KEYS = Object.freeze(
  Object.keys(ROM_SPEC).filter((key) => ROM_SPEC[key].required)
);

const VICE_MATCH = Object.freeze({
  kernal:    { dir: "c64",    exact: "kernal-901227-03",    pattern: /^kernal([-._]|$)/i },
  basic:     { dir: "c64",    exact: "basic-901226-01",     pattern: /^basic([-._]|$)/i },
  charRom:   { dir: "c64",    exact: "chargen-901225-01",   pattern: /^(chargen|characters)([-._]|$)/i },
  drive1541: { dir: "drives", exact: "dos1541ii-251968-03", pattern: /^(dos)?1541(-?ii)?([-._]|$)/i },
});

const OTHER_MACHINE_DIRS = new Set([
  "c128", "c64dtv", "cbm-ii", "pet", "plus4", "printer", "scpu64", "vic20",
]);

function parentDirectory(file) {
  const parts = String(file.webkitRelativePath || "").split("/");
  return parts.length > 1 ? parts[parts.length - 2].toLowerCase() : "";
}

export function pickViceRoms(files) {
  const result = {};

  for (const [key, matcher] of Object.entries(VICE_MATCH)) {
    let bestFile = null;
    let bestScore = 0;

    for (const file of files || []) {
      const name = String(file.name || "").toLowerCase();
      if (!ROM_SPEC[key].sizes.includes(file.size)) continue;
      if (!matcher.pattern.test(name)) continue;

      const dir = parentDirectory(file);
      let score = 1;
      if (name === matcher.exact || name === `${matcher.exact}.bin`) score += 4;
      if (dir === matcher.dir) score += 2;
      else if (OTHER_MACHINE_DIRS.has(dir)) score -= 3;

      if (score > bestScore) {
        bestScore = score;
        bestFile = file;
      }
    }

    if (bestFile) result[key] = bestFile;
  }

  return result;
}

function encodeBytes(bytes) {
  let binary = "";
  const chunk = 0x4000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunk, bytes.length)));
  }
  return btoa(binary);
}

function decodeBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export class ROMVault {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.entries = {
      kernal: null,
      basic: null,
      charRom: null,
      drive1541: null,
    };
  }

  restore() {
    for (const key of Object.keys(ROM_SPEC)) {
      this.entries[key] = this.#read(key);
    }
    return this.snapshot();
  }

  install(key, bytes, name = null) {
    const spec = ROM_SPEC[key];
    if (!spec) throw new Error("Unknown ROM slot.");

    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (!spec.sizes.includes(data.length)) {
      throw new Error(`${spec.label} must be ${spec.sizes.join(" or ")} bytes; received ${data.length}.`);
    }

    const entry = {
      bytes: data,
      name: name || null,
      size: data.length,
    };

    this.entries[key] = entry;
    this.#write(key, entry);
    return this.snapshot();
  }

  async installFile(key, file) {
    if (!file) throw new Error("No file selected.");
    return this.install(key, new Uint8Array(await file.arrayBuffer()), file.name);
  }

  clear() {
    for (const spec of Object.values(ROM_SPEC)) {
      try { this.storage.removeItem(spec.storageKey); } catch {}
    }
    for (const key of Object.keys(this.entries)) this.entries[key] = null;
    return this.snapshot();
  }

  snapshot() {
    const entries = {};
    for (const [key, value] of Object.entries(this.entries)) {
      entries[key] = value ? { name: value.name, size: value.size } : null;
    }
    return {
      entries,
      requiredReady: REQUIRED_ROM_KEYS.filter((key) => Boolean(this.entries[key])).length,
      allRequiredReady: REQUIRED_ROM_KEYS.every((key) => Boolean(this.entries[key])),
      driveReady: Boolean(this.entries.drive1541),
    };
  }

  getBytes(key) {
    return this.entries[key]?.bytes || null;
  }

  #write(key, entry) {
    const spec = ROM_SPEC[key];
    try {
      this.storage.setItem(spec.storageKey, JSON.stringify({
        name: entry.name,
        data: encodeBytes(entry.bytes),
      }));
    } catch (error) {
      throw new Error("The browser could not store this ROM locally.");
    }
  }

  #read(key) {
    const spec = ROM_SPEC[key];
    let raw;
    try { raw = this.storage.getItem(spec.storageKey); } catch { return null; }
    if (!raw) return null;

    try {
      const payload = JSON.parse(raw);
      if (!payload || typeof payload.data !== "string") throw new Error("Invalid cache");
      const bytes = decodeBytes(payload.data);
      if (!spec.sizes.includes(bytes.length)) throw new Error("Invalid ROM size");
      return {
        bytes,
        name: payload.name || null,
        size: bytes.length,
      };
    } catch {
      try { this.storage.removeItem(spec.storageKey); } catch {}
      return null;
    }
  }
}
