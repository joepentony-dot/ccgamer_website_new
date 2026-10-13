#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { GameVault, encodeGameVaultBackup, decodeGameVaultBackup } from "../js/ccg-c64/game-vault.js";
import { C64Machine } from "../js/ccg-c64/core/machine.js";

function sample(seed = 1) {
  return {
    format: "ccg-c64-vault", version: 1, driveMode: "fast",
    state: {
      format: "c64state", version: 1,
      memory: new Uint8Array([seed, 2, 3]),
      words: new Uint16Array([1000, 2000]),
      timers: new Float32Array([0.5, 1.5]),
    },
    media: {
      disk: { name: "test.d64", bytes: new Uint8Array([3, seed, 5]) },
      diskSides: [{ key: "library:test:0", media: {
        name: "test.d64", bytes: new Uint8Array([3, seed, 5]),
      } }],
    },
  };
}

// Small asynchronous IDB harness exercises the real public API without a
// third-party package or changing the production emulator.
function fakeIndexedDB() {
  const stores = new Map();
  const db = {
    objectStoreNames: { contains(name) { return stores.has(name); } },
    createObjectStore(name, options) {
      stores.set(name, { keyPath: options.keyPath, records: new Map() });
    },
    close() {},
    transaction(name) {
      const data = stores.get(name);
      assert(data, "Unknown test store: " + name);
      const tx = {
        oncomplete: null, onerror: null, onabort: null,
        objectStore() {
          return {
            put(record) {
              queueMicrotask(() => {
                data.records.set(record[data.keyPath], record);
                tx.oncomplete?.();
              });
            },
            delete(key) {
              queueMicrotask(() => {
                data.records.delete(key);
                tx.oncomplete?.();
              });
            },
            get(key) {
              const request = {};
              queueMicrotask(() => {
                request.result = data.records.get(key);
                request.onsuccess?.();
                tx.oncomplete?.();
              });
              return request;
            },
            getAllKeys() {
              const request = {};
              queueMicrotask(() => {
                request.result = [...data.records.keys()];
                request.onsuccess?.();
                tx.oncomplete?.();
              });
              return request;
            },
            openCursor() {
              const request = {};
              const values = [...data.records.values()];
              let i = 0;
              const advance = () => queueMicrotask(() => {
                request.result = i < values.length
                  ? { value: values[i++], continue: advance }
                  : null;
                request.onsuccess?.();
                if (!request.result) tx.oncomplete?.();
              });
              advance();
              return request;
            },
          };
        },
      };
      return tx;
    },
  };
  return {
    open() {
      const request = { result: db };
      queueMicrotask(() => { request.onupgradeneeded?.(); request.onsuccess?.(); });
      return request;
    },
  };
}

test("Game Vault keeps each game's three slots separate while preserving legacy slots", async () => {
  globalThis.indexedDB = fakeIndexedDB();
  const vault = new GameVault();
  await vault.save(1, sample(10));
  await vault.saveGame("library:pirates", "Pirates!", 1, sample(21));
  await vault.saveGame("library:wasteland", "Wasteland", 1, sample(42));
  await vault.saveGame("library:pirates", "Pirates!", 2, sample(22));
  assert.equal((await vault.loadGame("library:pirates", 1)).payload.state.memory[0], 21);
  assert.equal((await vault.loadGame("library:wasteland", 1)).payload.state.memory[0], 42);
  assert.equal((await vault.loadGame("library:pirates", 2)).payload.state.memory[0], 22);
  assert.equal((await vault.load(1)).payload.state.memory[0], 10);
  assert.deepEqual(await vault.listLegacySlots(), [1]);
  const games = await vault.listSavedGames();
  assert.equal(games.length, 2);
  assert.equal(Object.keys(games.find(x => x.gameKey === "library:pirates").slots).length, 2);
  await vault.clearGame("library:pirates", 1);
  assert.equal(await vault.loadGame("library:pirates", 1), null);
  assert.ok(await vault.loadGame("library:wasteland", 1));
  assert.ok(await vault.load(1), "clearing a per-game save cannot delete legacy data");
});

test("Export and import restores binary memory, mounted media and disk sides", () => {
  const saved = {
    gameKey: "library:wasteland", gameTitle: "Wasteland",
    slot: 3, savedAt: 1700000000000, payload: sample(77),
  };
  const encoded = encodeGameVaultBackup(saved);
  const decoded = decodeGameVaultBackup(encoded);
  assert.equal(decoded.gameKey, saved.gameKey);
  assert.equal(decoded.slot, 3);
  assert.ok(decoded.payload.state.memory instanceof Uint8Array);
  assert.ok(decoded.payload.state.words instanceof Uint16Array);
  assert.ok(decoded.payload.state.timers instanceof Float32Array);
  assert.deepEqual([...decoded.payload.state.memory], [77, 2, 3]);
  assert.deepEqual([...decoded.payload.media.disk.bytes], [3, 77, 5]);
  assert.deepEqual([...decoded.payload.media.diskSides[0].media.bytes], [3, 77, 5]);
});

test("Invalid, corrupt or unsupported backup cannot reach IndexedDB", () => {
  assert.throws(() => decodeGameVaultBackup("not json"), /valid Game Vault backup/);
  assert.throws(() => decodeGameVaultBackup('{"format":"else"}'), /Unrecognised/);
  const good = JSON.parse(encodeGameVaultBackup({
    gameKey: "library:test", gameTitle: "Test", slot: 1,
    payload: sample(3),
  }));
  good.version = 9;
  assert.throws(() => decodeGameVaultBackup(JSON.stringify(good)), /Unrecognised/);
  good.version = 1;
  good.payload.state.memory.bytes = "not-base64!";
  assert.throws(() => decodeGameVaultBackup(JSON.stringify(good)), /valid Game Vault backup/);
});


test("Real C64 machine state survives backup roundtrip and restores CPU RAM", () => {
  const firmware = {
    kernal: new Uint8Array(fs.readFileSync("emulator/c64/firmware/kernal-901227-03.bin")),
    basic: new Uint8Array(fs.readFileSync("emulator/c64/firmware/basic-901226-01.bin")),
    charRom: new Uint8Array(fs.readFileSync("emulator/c64/firmware/chargen-901225-01.bin")),
  };
  const first = new C64Machine();
  first.loadROMs(firmware);
  for (let i = 0; i < 3; i++) first.runFrame();
  const state = first.serializeState();
  const backup = encodeGameVaultBackup({
    gameKey: "library:real-cpu", gameTitle: "Real CPU smoke test", slot: 1,
    payload: {
      format: "ccg-c64-vault", version: 1, driveMode: "fast",
      state, media: { disk: null, tape: null, cartridge: null },
    },
  });
  const decoded = decodeGameVaultBackup(backup);
  const second = new C64Machine();
  second.loadROMs(firmware);
  second.restoreState(decoded.payload.state);
  assert.deepEqual(second.mem.ram, first.mem.ram);
  assert.equal(second.cpu.PC, first.cpu.PC);
  assert.equal(second.runFrame(), true, "Restored CPU must continue executing");
});

test("Game Vault UI never overwrites another game's named slot and retains legacy access", () => {
  const html = fs.readFileSync(new URL("../emulator/c64/index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../js/ccg-c64/app.js", import.meta.url), "utf8");
  assert.match(html, /data-vault-game/);
  assert.match(html, /data-vault-export/);
  assert.match(html, /data-vault-import/);
  assert.match(app, /gameVault\.saveGame\(currentSessionGame\.gameKey/);
  assert.match(app, /vaultGameSelect\?\.value !== "__current__"/);
  assert.match(app, /vaultSelection\(\)/);
  assert.match(app, /gameVault\.load\(slot\)/);
  assert.match(app, /diskSides:/);
  assert.match(app, /decodeGameVaultBackup\(await file\.text\(\)\)/);
});
