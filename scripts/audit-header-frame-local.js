#!/usr/bin/env node
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const SITE_PORT = 4181;
const DRIVER_PORT = 9518;
const LIVE_BASE_URL = String(process.env.CCG_HEADER_FRAME_BASE_URL || "").trim().replace(/\/+$/, "");
const LOCAL_BASE_URL = `http://${HOST}:${SITE_PORT}`;
const BASE_URL = LIVE_BASE_URL || LOCAL_BASE_URL;
const CONTROL_PIXEL_TOLERANCE = 0.3;
const PANEL_RANGE_TOLERANCE = 40;
const CONTENT_TOP_TOLERANCE = 1;

const MIME = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
});

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

function safeFileForRequest(urlPathname) {
  let decoded;
  try { decoded = decodeURIComponent(urlPathname); }
  catch { return null; }
  const relative = decoded.replace(/^\/+/, "");
  const absolute = path.resolve(ROOT, relative || "home.html");
  if (absolute !== ROOT && !absolute.startsWith(`${ROOT}${path.sep}`)) return null;
  let target = absolute;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
  return target;
}

function createServer() {
  return http.createServer((req, res) => {
    const requestUrl = new URL(req.url || "/", LOCAL_BASE_URL);
    const filePath = safeFileForRequest(requestUrl.pathname);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      res.end("Not found");
      return;
    }
    const contentType = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
    res.end(fs.readFileSync(filePath));
  });
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
      const main = document.querySelector('main.ccg-main, .ccg-main');
      const contentAnchor = main ? Array.from(main.children).find((node) => !node.classList.contains('ccg-home-search-command')) : null;
      const contentRect = contentAnchor ? contentAnchor.getBoundingClientRect() : null;
      window.__ccgHeaderFrames.push({
        frame,
        time: Math.round(performance.now() * 10) / 10,
        navClass: nav.className,
        linkClass: link.className,
        navX: Math.round(nr.x * 10) / 10,
        navWidth: Math.round(nr.width * 10) / 10,
        navScrollWidth: nav.scrollWidth,
        linkWidth: Math.round(lr.width * 10) / 10,
        linkHeight: Math.round(lr.height * 10) / 10,
        padding: ls.padding,
        fontSize: ls.fontSize,
        letterSpacing: ls.letterSpacing,
        contentTop: contentRect ? Math.round(contentRect.top * 10) / 10 : null,
        searchCommandPresent: Boolean(main?.querySelector(':scope > .ccg-home-search-command'))
      });
    }
    frame += 1;
    if (frame < 90) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
})();
`;

function meaningfulChanges(samples) {
  const fields = ["navX", "navWidth", "navScrollWidth", "linkWidth", "linkHeight", "padding", "fontSize", "letterSpacing"];
  const output = [];
  for (let index = 1; index < samples.length; index += 1) {
    const before = samples[index - 1];
    const after = samples[index];
    const changed = fields.filter((field) => before[field] !== after[field]);
    if (changed.length) output.push({
      from: before.frame,
      to: after.frame,
      time: after.time,
      changed,
      beforeClass: before.navClass,
      afterClass: after.navClass,
      beforeLink: { width: before.linkWidth, height: before.linkHeight, padding: before.padding, fontSize: before.fontSize, letterSpacing: before.letterSpacing },
      afterLink: { width: after.linkWidth, height: after.linkHeight, padding: after.padding, fontSize: after.fontSize, letterSpacing: after.letterSpacing },
      beforeNav: { x: before.navX, width: before.navWidth, scrollWidth: before.navScrollWidth },
      afterNav: { x: after.navX, width: after.navWidth, scrollWidth: after.navScrollWidth }
    });
  }
  return output;
}

function assertStableControls(samples, pathname, width) {
  const first = samples[0];
  const exactFields = ["padding", "fontSize", "letterSpacing"];
  const numericFields = ["linkWidth", "linkHeight"];
  const violations = [];

  for (const sample of samples.slice(1)) {
    for (const field of exactFields) {
      if (sample[field] !== first[field]) {
        violations.push(`${field} ${first[field]} -> ${sample[field]} at frame ${sample.frame}`);
      }
    }
    for (const field of numericFields) {
      if (Math.abs(Number(sample[field]) - Number(first[field])) > CONTROL_PIXEL_TOLERANCE) {
        violations.push(`${field} ${first[field]} -> ${sample[field]} at frame ${sample.frame}`);
      }
    }
  }

  // Home is already visually accepted by the user. Keep its control-size checks strict,
  // but reserve panel-width/content-shift assertions for the inner pages that were reported.
  if (pathname !== "/home.html") {
    const panelWidths = samples.map((sample) => Number(sample.navWidth)).filter(Number.isFinite);
    const panelRange = panelWidths.length ? Math.max(...panelWidths) - Math.min(...panelWidths) : 0;
    if (panelRange > PANEL_RANGE_TOLERANCE) {
      violations.push(`nav panel width range ${panelRange.toFixed(1)}px exceeds ${PANEL_RANGE_TOLERANCE}px`);
    }

    const contentSamples = samples.filter((sample) => Number.isFinite(Number(sample.contentTop)));
    if (contentSamples.length > 1) {
      const baseline = Number(contentSamples[0].contentTop);
      const maxShift = Math.max(...contentSamples.map((sample) => Math.abs(Number(sample.contentTop) - baseline)));
      if (maxShift > CONTENT_TOP_TOLERANCE) {
        violations.push(`main content shifted ${maxShift.toFixed(1)}px after first paint`);
      }
    }
  }

  if (violations.length) {
    throw new Error(`${width}px ${pathname} changed visible layout after first paint: ${violations.join("; ")}`);
  }
}

async function auditPage(sessionId, pathname, width) {
  await webdriver("POST", `/session/${sessionId}/window/rect`, { width, height: 1000 });
  await webdriver("POST", `/session/${sessionId}/url`, { url: `${BASE_URL}${pathname}?ccg-frame-audit=${Date.now()}` });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const samples = await execute(sessionId, "return window.__ccgHeaderFrames || [];");
  if (!samples.length) throw new Error(`${pathname} produced no samples.`);
  assertStableControls(samples, pathname, width);
  const changes = meaningfulChanges(samples);
  console.log(`HEADER FRAME VALIDATION ${width}px ${pathname}`);
  console.log(`first=${JSON.stringify(samples[0])}`);
  console.log(`final=${JSON.stringify(samples[samples.length - 1])}`);
  console.log(`changes=${JSON.stringify(changes)}`);
}

async function main() {
  const server = LIVE_BASE_URL ? null : createServer();
  if (server) await new Promise((resolve) => server.listen(SITE_PORT, HOST, resolve));
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
    const pages = ["/home.html", "/games/publishers/", "/music/", "/about.html", "/contact.html", "/games/discover/", "/zzap64/", "/install-app.html"];
    for (const width of [1920, 1440]) {
      for (const pathname of pages) await auditPage(sessionId, pathname, width);
    }
    console.log(`${LIVE_BASE_URL ? "Live" : "Local"} header first-frame stability validation passed.`);
  } finally {
    if (sessionId) {
      try { await webdriver("DELETE", `/session/${sessionId}`); } catch (_error) {}
    }
    driver.kill("SIGTERM");
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(`Header first-frame stability validation failed: ${error.message}`);
  process.exit(1);
});
