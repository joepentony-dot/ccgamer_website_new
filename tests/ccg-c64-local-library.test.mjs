#!/usr/bin/env node
"use strict";

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const app = read("js/ccg-c64/app.js");
const html = read("emulator/c64/index.html");
const css = read("resources/css/ccg-c64-emulator.css");
const online = JSON.parse(read("emulator/c64/library.json"));
const presets = JSON.parse(read("emulator/c64/local-catalogue.json"));

assert.equal(presets.version, 1);
assert.deepEqual(presets.entries.map(({ title }) => title), [
  "Bruce Lee Trilogy", "Forbidden Forest", "Paradroid", "Uridium", "Master of Magic",
]);
assert.equal(new Set(presets.entries.map(({ id }) => id)).size, 5, "Preset IDs must be unique");
assert(presets.entries.every((item) => item.id.startsWith("preset:") && !item.url && !item.dataBase64),
  "Commercial presets must contain no hosted media bytes or URLs");
assert(online.entries.every((item) => !presets.entries.some((preset) => item.title === preset.title)),
  "Commercial titles must not accidentally reappear in the hosted Online Library");

for (const selector of ["data-local-library-select", "data-local-library-add", "data-local-library-remove",
  "id=\"ccg-c64-local-media-input\""]) {
  assert(html.includes(selector), `My Games control missing: ${selector}`);
}
assert(css.includes(".ccg-c64-library-row--local"), "Compact local-library layout missing");
assert(css.includes(".ccg-c64-panel--local-library"), "Local panel must participate in CSS layout");
assert(app.includes("void initialiseLocalLibrary()"), "Saved games must restore at startup");
assert(app.includes('fetch("/emulator/c64/local-catalogue.json"'), "Presets must load from repository metadata");
assert(app.includes("await localMediaLibrary.save("), "Imported games must be stored in-browser");
assert(app.includes("await localMediaLibrary.get(id)"), "Selected games must load from browser storage");
assert(app.includes("await localMediaLibrary.remove(id)"), "User must be able to delete stored files");
assert(app.includes("await queueMedia({") && app.includes("{ freshBoot: true }"),
  "Locally stored games must use the existing fresh-boot media pathway");
assert(!app.includes("document.activeElement !== screen"),
  "Keyboard must not stop working when focus leaves the emulator canvas");
assert(app.includes("button, a, summary"), "Normal HTML controls must not receive emulated keystrokes");

const moduleSource = read("js/ccg-c64/local-media-library.js");
// Data-URL import ensures this module is parsed as ESM even in a repo without type:module.
const { LocalMediaLibrary, localMediaFormat, localMediaId } =
  await import(`data:text/javascript,${encodeURIComponent(moduleSource)}`);

assert.equal(localMediaFormat("Game.D64"), "d64");
assert.equal(localMediaFormat("Bruce-Lee.CRT"), "crt");
assert.equal(localMediaFormat("malware.exe"), null);
assert.notEqual(localMediaId("Game.crt"), localMediaId("Game.d64"));

const records = new Map();
const stores = new Set();
const db = {
  objectStoreNames: { contains: (name) => stores.has(name) },
  createObjectStore(name) { stores.add(name); },
  transaction() {
    const tx = { oncomplete: null, onerror: null, onabort: null };
    tx.objectStore = () => ({
      put(record) {
        queueMicrotask(() => {
          records.set(record.id, { ...record, bytes: record.bytes.slice(0) });
          tx.oncomplete?.();
        });
      },
      get(id) {
        const request = { result: null, onsuccess: null, onerror: null };
        queueMicrotask(() => {
          const record = records.get(id);
          request.result = record ? { ...record, bytes: record.bytes.slice(0) } : undefined;
          request.onsuccess?.();
        });
        return request;
      },
      delete(id) {
        queueMicrotask(() => {
          records.delete(id);
          tx.oncomplete?.();
        });
      },
      openCursor() {
        const rows = Array.from(records.values());
        const request = { result: null, onsuccess: null, onerror: null };
        let index = 0;
        const next = () => {
          const row = rows[index++];
          request.result = row
            ? { value: row, continue: () => queueMicrotask(next) }
            : null;
          request.onsuccess?.();
        };
        queueMicrotask(next);
        return request;
      },
    });
    return tx;
  },
};
globalThis.indexedDB = {
  open() {
    const request = { result: db, onupgradeneeded: null, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  },
};

const storage = new LocalMediaLibrary();
const bytes = new Uint8Array([1, 8, 32, 0, 10, 13, 0]);
await storage.save({
  id: "preset:paradroid", title: "Paradroid", filename: "paradroid.d64",
  type: "d64", bytes,
});
bytes[0] = 255;
const fetched = await storage.get("preset:paradroid");
assert.deepEqual(Array.from(fetched.bytes), [1, 8, 32, 0, 10, 13, 0],
  "Saving media must clone the selected file bytes");
fetched.bytes[0] = 99;
assert.equal((await storage.get("preset:paradroid")).bytes[0], 1,
  "Reading media must return an independent copy");
assert.equal((await storage.list()).length, 1);
assert.equal((await storage.list())[0].filename, "paradroid.d64");
await assert.rejects(() => storage.save({
  id: "preset:bad", title: "Bad", filename: "bad.exe",
  type: "exe", bytes: new Uint8Array([1, 2, 3]),
}), /supported/);
await storage.remove("preset:paradroid");
assert.equal(await storage.get("preset:paradroid"), null);
assert.equal((await storage.list()).length, 0);

console.log("CCG C64 My Games catalogue, storage and source contract passed.");
