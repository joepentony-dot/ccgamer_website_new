#!/usr/bin/env node
"use strict";

// Real Chromium / IndexedDB persistence qualification. Run on a GitHub runner
// with chromedriver and Chromium installed. No production saves are accessed.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = "127.0.0.1";
const driverPort = 19831;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-vault-test-"));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const mime = { ".js": "text/javascript", ".html": "text/html" };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/__vault_persistence_test__") {
    res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" });
    res.end("<!doctype html><title>Private Vault Test</title>");
    return;
  }
  const filename = path.resolve(root, "." + decodeURIComponent(pathname));
  if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) ||
      !fs.statSync(filename).isFile()) {
    res.writeHead(404); res.end("Not found"); return;
  }
  res.writeHead(200, { "content-type": mime[path.extname(filename)] || "application/octet-stream",
    "cache-control": "no-store" });
  res.end(fs.readFileSync(filename));
});
let driver, session;
async function wd(method, route, data) {
  const response = await fetch("http://" + host + ":" + driverPort + route, {
    method, headers: data ? { "content-type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  if (!response.ok || body.value?.error) throw Error(JSON.stringify(body).slice(0, 1500));
  return body.value;
}
async function launch(url) {
  const created = await wd("POST", "/session", { capabilities: { alwaysMatch: {
    browserName: "chrome", pageLoadStrategy: "eager",
    "goog:chromeOptions": { args: ["--headless=new", "--no-sandbox", "--disable-gpu",
      "--no-first-run", "--disable-dev-shm-usage", "--user-data-dir=" + profile] },
  } } });
  session = created.sessionId;
  assert(session, "Missing Chromium session");
  await wd("POST", "/session/" + session + "/url", { url });
}
async function browserAsync(source) {
  // Selenium async script invokes its final argument when the Promise settles.
  const script = `const done = arguments[arguments.length - 1];
    (async () => { ${source} })().then(x => done({ ok: true, value: x }),
    e => done({ ok: false, error: String(e?.stack || e) }));`;
  const result = await wd("POST", "/session/" + session + "/execute/async",
    { script, args: [] });
  if (!result.ok) throw Error(result.error);
  return result.value;
}
async function quit() {
  if (!session) return;
  const old = session; session = null;
  await wd("DELETE", "/session/" + old);
}
try {
  const binary = spawnSync("bash", ["-lc", "command -v chromedriver"],
    { encoding: "utf8" }).stdout.trim();
  assert(binary, "chromedriver unavailable");
  await new Promise((resolve, reject) => {
    server.once("error", reject); server.listen(0, host, resolve);
  });
  const url = "http://" + host + ":" + server.address().port + "/__vault_persistence_test__";
  driver = spawn(binary, ["--port=" + driverPort, "--allowed-ips=" + host],
    { stdio: "ignore" });
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch("http://" + host + ":" + driverPort + "/status")).ok) {
      ready = true; break;
    } } catch {}
    await delay(100);
  }
  assert(ready, "ChromeDriver never became ready");

  await launch(url);
  await browserAsync(`
    const { GameVault } = await import("/js/ccg-c64/game-vault.js");
    const vault = new GameVault();
    const make = n => ({
      format: "ccg-c64-vault", version: 1, driveMode: "fast",
      state: { format: "c64state", version: 1,
        memory: new Uint8Array([n, 99]),
        words: new Uint16Array([1000 + n]), timers: new Float32Array([0.5]) },
      media: { disk: { name: "test.d64", bytes: new Uint8Array([9, n, 7]) },
        diskSides: [{ key: "side:" + n, media: { name: "side.d64",
          bytes: new Uint8Array([n, 4]) } }] }
    });
    await vault.save(1, make(77)); // Preserve original legacy namespace.
    for (let slot = 1; slot <= 3; slot++) {
      await vault.saveGame("library:alpha", "Alpha", slot, make(10 + slot));
      await vault.saveGame("library:beta", "Beta", slot, make(20 + slot));
    }
    return true;
  `);
  await quit();
  // This is deliberately a fresh browser process using the SAME persistent
  // test profile, rather than a reload with its database connection still open.
  await delay(350);
  await launch(url);
  const evidence = await browserAsync(`
    const { GameVault, encodeGameVaultBackup, decodeGameVaultBackup } =
      await import("/js/ccg-c64/game-vault.js");
    const vault = new GameVault();
    const result = { slots: [], games: await vault.listSavedGames(),
      legacy: await vault.listLegacySlots() };
    for (const name of ["alpha", "beta"]) {
      for (let slot = 1; slot <= 3; slot++) {
        const record = await vault.loadGame("library:" + name, slot);
        const expected = (name === "alpha" ? 10 : 20) + slot;
        if (!record || record.payload.state.memory[0] !== expected ||
            record.payload.state.words[0] !== 1000 + expected ||
            record.payload.media.disk.bytes[1] !== expected ||
            record.payload.media.diskSides[0].media.bytes[0] !== expected)
          throw Error("Corrupt or missing persistent save " + name + ":" + slot);
        const decoded = decodeGameVaultBackup(encodeGameVaultBackup(record));
        if (decoded.payload.state.memory[0] !== expected)
          throw Error("Backup round-trip failed");
        result.slots.push(name + ":" + slot);
      }
    }
    if ((await vault.load(1))?.payload.state.memory[0] !== 77)
      throw Error("Legacy slot lost during browser restart");
    await vault.clearGame("library:alpha", 1);
    if (await vault.loadGame("library:alpha", 1))
      throw Error("Targeted slot was not deleted");
    if (!(await vault.loadGame("library:beta", 1)))
      throw Error("Another game's slot was incorrectly deleted");
    return result;
  `);
  assert.equal(evidence.slots.length, 6);
  assert.equal(evidence.games.length, 2);
  assert.deepEqual(evidence.legacy, [1]);
  console.log("PASS: six isolated slots and legacy save survived complete browser restart.");
  console.log("PASS: typed memory, disk media, backup and targeted deletion checked.");
} finally {
  try { await quit(); } catch {}
  driver?.kill();
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(profile, { recursive: true, force: true });
}
