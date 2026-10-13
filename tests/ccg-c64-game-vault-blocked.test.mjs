#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { GameVault } from "../js/ccg-c64/game-vault.js";

function controlledIndexedDB({ legacy = false } = {}) {
  const requests = [];
  const stores = new Map();
  if (legacy) {
    // Simulate an existing v1 browser database with a saved slot.
    stores.set("states", { records: new Map([[1, { slot: 1, savedAt: 123,
      payload: { state: { memory: new Uint8Array([77]) } } }]]) });
  }
  const connections = [];
  return {
    stores, requests, connections,
    open() {
      const db = {
        closed: false, onversionchange: null, onclose: null,
        objectStoreNames: { contains(name) { return stores.has(name); } },
        createObjectStore(name) {
          assert(!stores.has(name), "Migration must not replace existing stores");
          stores.set(name, { records: new Map() });
        },
        close() { this.closed = true; },
      };
      const request = { result: db, error: null };
      connections.push(db);
      requests.push(request);
      return request;
    },
  };
}

test("Brief IndexedDB upgrade blockage resolves through the SAME request and preserves v1 slots", async () => {
  const fake = controlledIndexedDB({ legacy: true });
  globalThis.indexedDB = fake;
  const vault = new GameVault();
  const opening = vault._open();
  const request = fake.requests[0];
  request.onblocked();
  assert.equal(fake.requests.length, 1, "Do not start duplicate upgrade attempts while blocked");
  assert.equal(vault._open(), opening, "Concurrent calls share a pending upgrade");
  request.onupgradeneeded();
  request.onsuccess();
  const db = await opening;
  assert.equal(db.closed, false);
  assert(fake.stores.has("states"), "Original legacy states store must survive");
  assert(fake.stores.has("gameStates"), "Only the new per-game store is added");
  assert.equal(fake.stores.get("states").records.get(1).payload.state.memory[0], 77);
  assert.equal(vault._open(), opening, "Successful live connection should be reused");
});

test("Persistent blockage gives recoverable instructions; a late success cannot leak a connection", async () => {
  const fake = controlledIndexedDB({ legacy: true });
  globalThis.indexedDB = fake;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = new Map();
  let id = 0;
  try {
    globalThis.setTimeout = (callback, ms) => {
      assert.equal(ms, 2000, "Block warning gives old tabs time to release");
      timers.set(++id, callback);
      return id;
    };
    globalThis.clearTimeout = (key) => { timers.delete(key); };
    const vault = new GameVault();
    const pending = vault._open();
    const request = fake.requests[0];
    request.onblocked();
    request.onblocked();
    assert.equal(timers.size, 1, "Repeated blocked notifications must not create timers");
    const error = assert.rejects(pending, (err) => {
      assert.equal(err.name, "GameVaultBlockedError");
      assert.match(err.message, /Close other C64 emulator tabs/);
      return true;
    });
    [...timers.values()][0]();
    await error;
    assert.equal(vault._dbPromise, null, "After timeout the visitor can retry");
    // Browser may still complete the ORIGINAL open request after a retry.
    // It must close that abandoned connection automatically.
    request.onupgradeneeded();
    request.onsuccess();
    assert.equal(fake.connections[0].closed, true, "Abandoned upgrade connection must be closed");
    const resumed = vault._open();
    assert.equal(fake.requests.length, 2);
    fake.requests[1].onsuccess();
    assert.equal(await resumed, fake.connections[1]);
    assert.equal(fake.connections[1].closed, false);
    assert(fake.stores.has("states"), "Legacy states cannot be erased");
    assert(fake.stores.has("gameStates"), "Upgraded store survives timeout and retry");
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("Another tab's version upgrade closes this connection and permits re-opening", async () => {
  const fake = controlledIndexedDB({ legacy: true });
  globalThis.indexedDB = fake;
  const vault = new GameVault();
  const first = vault._open();
  fake.requests[0].onsuccess();
  const db = await first;
  db.onversionchange();
  assert.equal(db.closed, true);
  assert.equal(vault._dbPromise, null);
  const second = vault._open();
  assert.notEqual(first, second);
  fake.requests[1].onsuccess();
  assert.equal(await second, fake.connections[1]);
});

test("UI offers manual and on-return retry without changing emulator audio or save operations", () => {
  const html = fs.readFileSync("emulator/c64/index.html", "utf8");
  const app = fs.readFileSync("js/ccg-c64/app.js", "utf8");
  assert.match(html, /data-vault-storage-notice[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /data-vault-retry hidden/);
  assert.match(app, /showVaultConnectionFailure\(error\)/);
  assert.match(app, /vaultRetryButton\?\.addEventListener\("click"/);
  assert.match(app, /document\.addEventListener\("visibilitychange"/);
  assert.match(app, /Do not clear browser data/);
});
