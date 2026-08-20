#!/usr/bin/env node

"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { normaliseHtml } = require("./normalize-public-header-shell.js");

const ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const SITE_PORT = 4184;
const DRIVER_PORT = 9521;
const BASE_URL = `http://${HOST}:${SITE_PORT}`;
const W3C_ELEMENT_KEY = "element-6066-11e4-a52e-4f735466cecf";
const MAIN_TOP_TOLERANCE = 24;

const MIME = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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
    const requestUrl = new URL(req.url || "/", BASE_URL);
    const filePath = safeFileForRequest(requestUrl.pathname);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      res.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME[extension] || "application/octet-stream";
    let payload = fs.readFileSync(filePath);
    if (extension === ".html" && requestUrl.pathname.startsWith("/music/")) {
      payload = Buffer.from(normaliseHtml(payload.toString("utf8"), { root: ROOT }).html, "utf8");
    }

    res.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
    res.end(payload);
  });
}

async function webdriver(method, pathname, body) {
  const response = await fetch(`http://${HOST}:${DRIVER_PORT}${pathname}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(45000)
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

async function waitUntil(sessionId, expression, label, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await execute(sessionId, `return Boolean(${expression});`)) return;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function findElement(sessionId, selector) {
  const value = await webdriver("POST", `/session/${sessionId}/element`, { using: "css selector", value: selector });
  const id = value?.[W3C_ELEMENT_KEY] || value?.ELEMENT;
  if (!id) throw new Error(`WebDriver did not return an element id for ${selector}.`);
  return id;
}

async function clickElement(sessionId, selector) {
  const id = await findElement(sessionId, selector);
  await webdriver("POST", `/session/${sessionId}/element/${encodeURIComponent(id)}/click`, {});
}

const EARLY_SAMPLER = `
(() => {
  window.__ccgMusicFirstPaintFrames = [];
  let frame = 0;
  const visible = (el) => {
    if (!el) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 1 && rect.height > 1;
  };
  const round = (value) => Math.round(Number(value || 0) * 10) / 10;
  const sample = () => {
    if (location.pathname.startsWith('/music/')) {
      const header = document.querySelector('[data-ccg-header]');
      const shell = document.querySelector('[data-ccg-static-shell="2026-08-19-v1"]');
      const main = document.querySelector('main');
      const breadcrumbs = document.querySelector('.ccg-composer-breadcrumbs');
      const headerRect = header?.getBoundingClientRect();
      const mainRect = main?.getBoundingClientRect();
      window.__ccgMusicFirstPaintFrames.push({
        frame,
        time: round(performance.now()),
        header: Boolean(header),
        staticShell: Boolean(shell),
        mainVisible: visible(main),
        breadcrumbsVisible: visible(breadcrumbs),
        headerHeight: round(headerRect?.height),
        mainTop: round(mainRect?.top)
      });
    }
    frame += 1;
    if (frame < 100) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
})();
`;

function assertFrames(frames, width) {
  if (!frames.length) throw new Error(`${width}px Music navigation produced no first-paint samples.`);

  const exposed = frames.filter((sample) => sample.mainVisible && (!sample.header || !sample.staticShell));
  if (exposed.length) {
    throw new Error(`${width}px Music exposed visible content before the canonical header: ${JSON.stringify(exposed.slice(0, 5))}`);
  }

  const visibleFrames = frames.filter((sample) => sample.mainVisible && sample.header && sample.staticShell);
  if (!visibleFrames.length) throw new Error(`${width}px Music never reached a visible canonical shell.`);

  const mainTops = visibleFrames.map((sample) => sample.mainTop).filter(Number.isFinite);
  const range = Math.max(...mainTops) - Math.min(...mainTops);
  if (range > MAIN_TOP_TOLERANCE) {
    throw new Error(`${width}px Music main content jumped ${range.toFixed(1)}px after first paint (limit ${MAIN_TOP_TOLERANCE}px).`);
  }

  const first = visibleFrames[0];
  console.log(`MUSIC FIRST-PAINT ${width}px first=${JSON.stringify(first)} final=${JSON.stringify(visibleFrames[visibleFrames.length - 1])} mainTopRange=${range.toFixed(1)}px`);
}

async function auditTransition(sessionId, width) {
  await webdriver("POST", `/session/${sessionId}/window/rect`, { width, height: 1000 });
  await webdriver("POST", `/session/${sessionId}/url`, { url: `${BASE_URL}/home.html?music-first-paint=${Date.now()}` });
  await waitUntil(sessionId, "document.querySelector('[data-ccg-nav-primary] a[href=\"/music/\"]')", `Music navigation link at ${width}px`);
  await clickElement(sessionId, '[data-ccg-nav-primary] a[href="/music/"]');
  await waitUntil(sessionId, "window.location.pathname === '/music/'", `Music destination at ${width}px`);
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const frames = await execute(sessionId, "return window.__ccgMusicFirstPaintFrames || [];");
  assertFrames(frames, width);
}

async function main() {
  const server = createServer();
  await new Promise((resolve) => server.listen(SITE_PORT, HOST, resolve));
  const driver = spawn(findChromeDriver(), [`--port=${DRIVER_PORT}`, "--allowed-ips="], { stdio: ["ignore", "ignore", "pipe"] });
  let sessionId = "";
  try {
    await waitForDriver();
    const session = await webdriver("POST", "/session", {
      capabilities: {
        alwaysMatch: {
          browserName: "chrome",
          pageLoadStrategy: "eager",
          "goog:chromeOptions": {
            args: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--window-size=1920,1000"]
          }
        }
      }
    });
    sessionId = session.sessionId;
    await cdp(sessionId, "Page.addScriptToEvaluateOnNewDocument", { source: EARLY_SAMPLER });
    for (const width of [1440, 1920]) await auditTransition(sessionId, width);
    console.log("Music first-paint navigation validation passed.");
  } finally {
    if (sessionId) try { await webdriver("DELETE", `/session/${sessionId}`); } catch (_error) {}
    driver.kill("SIGTERM");
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(`Music first-paint navigation validation failed: ${error.message}`);
  process.exit(1);
});
