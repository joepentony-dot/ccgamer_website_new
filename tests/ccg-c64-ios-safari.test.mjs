#!/usr/bin/env node
"use strict";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bootstrapSource = fs.readFileSync(path.join(root, "js/ccg-c64/coi-bootstrap.js"), "utf8")
  .replaceAll("await import(APP_URL)", "await mockImport(APP_URL)")
  .replace("void start();", "globalThis.ccgStartForTest = start;");
const appSource = fs.readFileSync(path.join(root, "js/ccg-c64/app.js"), "utf8");

function setup({
  ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1",
  platform = "iPhone",
  points = 5,
  isolated = false,
  failImport = false,
} = {}) {
  const title = { textContent: "" };
  const note = { textContent: "" };
  const calls = { imports: [], registrations: 0, reloads: 0 };
  const storage = new Map();
  const registration = { active: { state: "activated" } };
  const context = {
    window: { crossOriginIsolated: isolated, isSecureContext: true },
    navigator: {
      userAgent: ua, platform, maxTouchPoints: points,
      serviceWorker: { register: async () => { calls.registrations++; return registration; } },
    },
    document: {
      querySelector: selector =>
        selector === "[data-machine-state]" ? title :
        selector === "[data-stage-note]" ? note : null,
    },
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    location: { reload: () => { calls.reloads++; } },
    mockImport: async url => {
      calls.imports.push(url);
      if (failImport) throw new Error("Module could not initialise");
      return {};
    },
    console: { warn() {}, error() {} },
    setTimeout, clearTimeout,
  };
  vm.runInNewContext(bootstrapSource, context, { filename: "coi-bootstrap.js" });
  return { ...calls, calls, title, note, start: () => context.ccgStartForTest() };
}

test("Non-isolated iPhone starts without worker registration or reload", async () => {
  const iPhone = setup();
  await iPhone.start();
  assert.equal(iPhone.calls.imports.length, 1);
  assert.match(iPhone.calls.imports[0], /20261013_clean_prg_archive_v1/);
  assert.equal(iPhone.calls.registrations, 0);
  assert.equal(iPhone.calls.reloads, 0);
});

test("Desktop-mode iPadOS uses the same no-reload fallback", async () => {
  const iPad = setup({ ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15", platform: "MacIntel", points: 5 });
  await iPad.start();
  assert.equal(iPad.calls.imports.length, 1);
  assert.equal(iPad.calls.registrations, 0);
  assert.equal(iPad.calls.reloads, 0);
});

test("Already-isolated Safari preserves the regular SID-capable path", async () => {
  const safari = setup({ isolated: true });
  await safari.start();
  assert.equal(safari.calls.imports.length, 1);
  assert.equal(safari.calls.registrations, 0);
  assert.equal(safari.calls.reloads, 0);
});

test("Non-isolated desktop preserves worker isolation and reload", async () => {
  const desktop = setup({ ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0", platform: "Win32", points: 0 });
  await desktop.start();
  assert.equal(desktop.calls.registrations, 1);
  assert.equal(desktop.calls.reloads, 1);
  assert.equal(desktop.calls.imports.length, 0);
});

test("Safari module errors display an actionable stage message", async () => {
  const safari = setup({ failImport: true });
  await safari.start();
  assert.equal(safari.title.textContent, "C64 STARTUP FAILED");
  assert.match(safari.note.textContent, /Module could not initialise/);
});

test("App storage fallback permits iOS with inaccessible localStorage", () => {
  const start = appSource.indexOf("const localStorage = (() => {");
  const endMarker = "\nconst vault = new ROMVault(localStorage);";
  const end = appSource.indexOf(endMarker, start);
  assert.ok(start !== -1 && end > start, "Storage guard must precede ROM vault");
  const code = appSource.slice(start, end) + "\nglobalThis.storageForTest = localStorage;";
  const context = { window: {}, Map };
  Object.defineProperty(context.window, "localStorage", {
    get() { throw new Error("Safari denied storage"); },
  });
  vm.runInNewContext(code, context);
  context.storageForTest.setItem("kernal", "ROM");
  assert.equal(context.storageForTest.getItem("kernal"), "ROM");
  context.storageForTest.removeItem("kernal");
  assert.equal(context.storageForTest.getItem("kernal"), null);
});

test("Older Safari MediaQueryList uses the legacy change listener", () => {
  assert.match(appSource, /typeof phoneLibraryLayout\.addEventListener === "function"/);
  assert.match(appSource, /typeof phoneLibraryLayout\.addListener === "function"/);
  assert.match(appSource, /phoneLibraryLayout\.addListener\(arrangePhoneLibrary\)/);
});
