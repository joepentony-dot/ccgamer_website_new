#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const HOST = "127.0.0.1";
const DRIVER_PORT = 9517;
const BASE_URL = "https://www.cheekycommodoregamer.co.uk";
const EXPECTED_RELEASE = "2026-08-19-public-release-v5";

function commandPath(command) {
  const result = spawnSync("bash", ["-lc", `command -v ${command}`], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function findChromeDriver() {
  const candidates = [
    commandPath("chromedriver"),
    process.env.CHROMEWEBDRIVER ? path.join(process.env.CHROMEWEBDRIVER, "chromedriver") : "",
    "/usr/local/share/chromedriver-linux64/chromedriver"
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("ChromeDriver was not found on the GitHub runner.");
  return found;
}

async function webdriver(method, pathname, body) {
  const response = await fetch(`http://${HOST}:${DRIVER_PORT}${pathname}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.value?.error) {
    throw new Error(payload.value?.message || text || `${response.status} ${response.statusText}`);
  }
  return payload.value;
}

async function waitForDriver() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      await webdriver("GET", "/status");
      return;
    } catch (_error) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("ChromeDriver did not become ready.");
}

async function cdp(sessionId, cmd, params = {}) {
  return webdriver("POST", `/session/${sessionId}/goog/cdp/execute`, { cmd, params });
}

async function execute(sessionId, script) {
  return webdriver("POST", `/session/${sessionId}/execute/sync`, { script, args: [] });
}

async function waitForRollback() {
  for (let attempt = 1; attempt <= 18; attempt += 1) {
    const response = await fetch(`${BASE_URL}/service-worker.js?ccg-frame-audit=${Date.now()}`, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
      signal: AbortSignal.timeout(30000)
    });
    const text = response.ok ? await response.text() : "";
    if (text.includes(EXPECTED_RELEASE)) return;
    console.log(`Rollback not live yet (${attempt}/18).`);
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  throw new Error(`Live service worker did not reach ${EXPECTED_RELEASE}.`);
}

const EARLY_SAMPLER = `
(() => {
  window.__ccgHeaderFrames = [];
  let frame = 0;
  const sample = () => {
    const nav = document.querySelector('[data-ccg-header] .ccg-nav');
    const link = document.querySelector('[data-ccg-nav-primary] .ccg-nav__link');
    const inner = document.querySelector('[data-ccg-header] .ccg-header-inner');
    if (nav && link && inner) {
      const ls = getComputedStyle(link);
      const nr = nav.getBoundingClientRect();
      const lr = link.getBoundingClientRect();
      const ir = inner.getBoundingClientRect();
      window.__ccgHeaderFrames.push({
        frame,
        time: Math.round(performance.now() * 10) / 10,
        navClass: nav.className,
        linkClass: link.className,
        navX: Math.round(nr.x * 10) / 10,
        navWidth: Math.round(nr.width * 10) / 10,
        navScrollWidth: nav.scrollWidth,
        innerX: Math.round(ir.x * 10) / 10,
        innerWidth: Math.round(ir.width * 10) / 10,
        linkWidth: Math.round(lr.width * 10) / 10,
        linkHeight: Math.round(lr.height * 10) / 10,
        padding: ls.padding,
        fontSize: ls.fontSize,
        letterSpacing: ls.letterSpacing,
        borderRadius: ls.borderRadius,
        filter: ls.filter,
        backdropFilter: ls.backdropFilter || ls.webkitBackdropFilter || 'none'
      });
    }
    frame += 1;
    if (frame < 90) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
})();
`;

function changes(samples) {
  const fields = ["navClass", "linkClass", "navX", "navWidth", "navScrollWidth", "innerX", "innerWidth", "linkWidth", "linkHeight", "padding", "fontSize", "letterSpacing", "borderRadius", "filter", "backdropFilter"];
  const found = [];
  for (let index = 1; index < samples.length; index += 1) {
    const before = samples[index - 1];
    const after = samples[index];
    const changed = fields.filter((field) => before[field] !== after[field]);
    if (changed.length) found.push({ from: before.frame, to: after.frame, time: after.time, changed, before, after });
  }
  return found;
}

async function auditPage(sessionId, pathname, width) {
  await webdriver("POST", `/session/${sessionId}/window/rect`, { width, height: 1000 });
  await webdriver("POST", `/session/${sessionId}/url`, { url: `${BASE_URL}${pathname}?ccg-frame-audit=${Date.now()}` });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const samples = await execute(sessionId, "return window.__ccgHeaderFrames || []; ");
  if (!samples.length) throw new Error(`${pathname} produced no first-frame samples.`);
  const deltas = changes(samples);
  console.log(`FRAME AUDIT ${width}px ${pathname}`);
  console.log(`samples=${samples.length} first=${JSON.stringify(samples[0])}`);
  console.log(`final=${JSON.stringify(samples[samples.length - 1])}`);
  console.log(`changes=${JSON.stringify(deltas.map((entry) => ({from:entry.from,to:entry.to,time:entry.time,changed:entry.changed,beforeClass:entry.before.navClass,afterClass:entry.after.navClass,beforeWidth:entry.before.linkWidth,afterWidth:entry.after.linkWidth,beforeNavX:entry.before.navX,afterNavX:entry.after.navX,beforeNavWidth:entry.before.navWidth,afterNavWidth:entry.after.navWidth})))}`);
}

async function main() {
  await waitForRollback();

  const driver = spawn(findChromeDriver(), [`--port=${DRIVER_PORT}`, "--allowed-ips="], {
    stdio: ["ignore", "ignore", "pipe"]
  });
  let driverError = "";
  driver.stderr.on("data", (chunk) => { driverError += String(chunk); });

  let sessionId = "";
  try {
    await waitForDriver();
    const session = await webdriver("POST", "/session", {
      capabilities: {
        alwaysMatch: {
          browserName: "chrome",
          "goog:chromeOptions": {
            args: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--window-size=1920,1000"]
          }
        }
      }
    });
    sessionId = session.sessionId;
    await cdp(sessionId, "Page.addScriptToEvaluateOnNewDocument", { source: EARLY_SAMPLER });

    const pages = ["/home.html", "/games/publishers/", "/music/", "/about.html", "/contact.html", "/games/discover/", "/zzap64/"];
    for (const width of [1920, 1440]) {
      for (const pathname of pages) await auditPage(sessionId, pathname, width);
    }
  } finally {
    if (sessionId) {
      try { await webdriver("DELETE", `/session/${sessionId}`); } catch (_error) {}
    }
    driver.kill("SIGTERM");
    if (driverError && process.env.CCG_FRAME_AUDIT_DEBUG === "1") process.stderr.write(driverError);
  }
}

main().catch((error) => {
  console.error(`Header frame stability audit failed: ${error.message}`);
  process.exit(1);
});
