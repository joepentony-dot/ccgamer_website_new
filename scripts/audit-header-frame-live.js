#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const HOST = "127.0.0.1";
const DRIVER_PORT = 9519;
const BASE_URL = String(process.env.CCG_HEADER_FRAME_BASE_URL || "https://www.cheekycommodoregamer.co.uk").replace(/\/+$/, "");
const EXPECTED_RELEASE = "2026-08-19-public-release-v7";
const CONTROL_PIXEL_TOLERANCE = 0.3;
const PANEL_RANGE_TOLERANCE = 40;

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
  if (!response.ok || payload.value?.error) throw new Error(payload.value?.message || text || `${response.status} ${response.statusText}`);
  return payload.value;
}

async function waitForDriver() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { await webdriver("GET", "/status"); return; }
    catch (_error) { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  throw new Error("ChromeDriver did not become ready.");
}

async function cdp(sessionId, cmd, params = {}) {
  return webdriver("POST", `/session/${sessionId}/goog/cdp/execute`, { cmd, params });
}

async function execute(sessionId, script) {
  return webdriver("POST", `/session/${sessionId}/execute/sync`, { script, args: [] });
}

async function waitForRelease() {
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const response = await fetch(`${BASE_URL}/service-worker.js?ccg-live-frame=${Date.now()}`, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
      signal: AbortSignal.timeout(30000)
    });
    const text = response.ok ? await response.text() : "";
    if (text.includes(EXPECTED_RELEASE)) return;
    if (attempt < 12) await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  throw new Error(`Live service worker did not reach ${EXPECTED_RELEASE}.`);
}

const EARLY_SAMPLER = `
(() => {
  window.__ccgLiveHeaderFrames = [];
  let frame = 0;
  const sample = () => {
    const nav = document.querySelector('[data-ccg-header] .ccg-nav');
    const link = document.querySelector('[data-ccg-nav-primary] .ccg-nav__link');
    if (nav && link) {
      const ls = getComputedStyle(link);
      const nr = nav.getBoundingClientRect();
      const lr = link.getBoundingClientRect();
      window.__ccgLiveHeaderFrames.push({
        frame,
        time: Math.round(performance.now() * 10) / 10,
        navClass: nav.className,
        navX: Math.round(nr.x * 10) / 10,
        navWidth: Math.round(nr.width * 10) / 10,
        navScrollWidth: nav.scrollWidth,
        linkWidth: Math.round(lr.width * 10) / 10,
        linkHeight: Math.round(lr.height * 10) / 10,
        padding: ls.padding,
        fontSize: ls.fontSize,
        letterSpacing: ls.letterSpacing
      });
    }
    frame += 1;
    if (frame < 90) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
})();
`;

function assertStableControls(samples, pathname, width) {
  if (!samples.length) throw new Error(`${width}px ${pathname} produced no first-frame samples.`);
  const first = samples[0];
  const exactFields = ["padding", "fontSize", "letterSpacing"];
  const numericFields = ["linkWidth", "linkHeight"];
  const violations = [];

  for (const sample of samples.slice(1)) {
    for (const field of exactFields) {
      if (sample[field] !== first[field]) violations.push(`${field} ${first[field]} -> ${sample[field]} at frame ${sample.frame}`);
    }
    for (const field of numericFields) {
      if (Math.abs(Number(sample[field]) - Number(first[field])) > CONTROL_PIXEL_TOLERANCE) {
        violations.push(`${field} ${first[field]} -> ${sample[field]} at frame ${sample.frame}`);
      }
    }
  }

  const widths = samples.map((sample) => Number(sample.navWidth)).filter(Number.isFinite);
  const panelRange = widths.length ? Math.max(...widths) - Math.min(...widths) : 0;
  if (panelRange > PANEL_RANGE_TOLERANCE) {
    violations.push(`nav panel width range ${panelRange.toFixed(1)}px exceeds ${PANEL_RANGE_TOLERANCE}px`);
  }

  if (violations.length) throw new Error(`${width}px ${pathname} snapped after first visible frame: ${violations.join("; ")}`);
  console.log(`LIVE FRAME PASS ${width}px ${pathname} first=${JSON.stringify(first)} final=${JSON.stringify(samples[samples.length - 1])}`);
}

async function auditPage(sessionId, pathname, width) {
  await webdriver("POST", `/session/${sessionId}/window/rect`, { width, height: 1000 });
  await webdriver("POST", `/session/${sessionId}/url`, { url: `${BASE_URL}${pathname}?ccg-live-frame=${Date.now()}` });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const samples = await execute(sessionId, "return window.__ccgLiveHeaderFrames || [];");
  assertStableControls(samples, pathname, width);
}

async function main() {
  await waitForRelease();
  const driver = spawn(findChromeDriver(), [`--port=${DRIVER_PORT}`, "--allowed-ips="], { stdio: ["ignore", "ignore", "pipe"] });
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
    console.log("Live v7 header first-frame stability audit passed.");
  } finally {
    if (sessionId) {
      try { await webdriver("DELETE", `/session/${sessionId}`); } catch (_error) {}
    }
    driver.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(`Live header first-frame audit failed: ${error.message}`);
  process.exit(1);
});
