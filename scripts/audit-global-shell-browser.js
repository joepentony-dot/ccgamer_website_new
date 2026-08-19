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
const PAGES = [
  ["Home", "/home.html"],
  ["Games", "/games/"],
  ["Publishers", "/games/publishers/"],
  ["Music", "/music/"],
  ["Zzap", "/zzap64/"],
  ["Quiz", "/quiz/quiz.html"],
  ["Emulation", "/emulation.html"]
];

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
    const requestUrl = new URL(req.url || "/", `http://${HOST}`);
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
    try {
      await webdriver("GET", "/status");
      return;
    } catch (_error) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("ChromeDriver did not become ready.");
}

async function execute(sessionId, script) {
  return webdriver("POST", `/session/${sessionId}/execute/sync`, { script, args: [] });
}

async function waitUntil(sessionId, expression, label, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await execute(sessionId, `return Boolean(${expression});`)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

const canonicalExpression = `
(function () {
  const header = document.querySelector('[data-ccg-header]');
  const nav = header && header.querySelector('.ccg-nav');
  if (!header || !nav) return false;
  const primary = Array.from(nav.querySelectorAll('[data-ccg-nav-primary] > li > .ccg-nav__link')).map((link) => link.textContent.trim()).join('|');
  const secondary = Array.from(nav.querySelectorAll('[data-ccg-nav-secondary] > li > .ccg-nav__link')).map((link) => link.textContent.trim()).join('|');
  const style = getComputedStyle(nav);
  const rect = nav.getBoundingClientRect();
  return primary === 'Home|Browse Games|Browse by Genre|Publishers|Collections|Music Hub'
    && secondary === 'Find Me a Game|Zzap!64 Reviews & Awards|Quiz|Emulation|Install CCG App|About Me|Contact'
    && style.display !== 'none'
    && style.visibility !== 'hidden'
    && Number(style.opacity || 1) > 0
    && rect.width > 1 && rect.height > 1;
})()
`;

async function assertPageShell(sessionId, name, route) {
  await webdriver("POST", `/session/${sessionId}/url`, { url: `http://${HOST}:${SITE_PORT}${route}` });
  await waitUntil(sessionId, "document.querySelector('[data-ccg-header]')", `${name} header`);
  await waitUntil(sessionId, canonicalExpression, `${name} canonical navigation`);

  for (let sample = 0; sample < 8; sample += 1) {
    const state = await execute(sessionId, `
      return (function () {
        const header = document.querySelector('[data-ccg-header]');
        const nav = header && header.querySelector('.ccg-nav');
        const socials = header && header.querySelector('.ccg-header-socials');
        const mode = header && header.querySelector('[data-ccg-mode-toggle]');
        const fallback = header && header.querySelector('.ccg-socials-fallback');
        const navStyle = nav ? getComputedStyle(nav) : null;
        const socialLinks = socials ? socials.querySelectorAll('a').length : 0;
        const fallbackStyle = fallback ? getComputedStyle(fallback) : null;
        return {
          navVisible: Boolean(nav && navStyle.display !== 'none' && navStyle.visibility !== 'hidden' && Number(navStyle.opacity || 1) > 0),
          mode: Boolean(mode),
          socials: socialLinks,
          fallbackVisible: Boolean(fallback && fallbackStyle.display !== 'none' && fallbackStyle.visibility !== 'hidden'),
          syncing: document.documentElement.classList.contains('ccg-nav-syncing'),
          readyClass: document.documentElement.classList.contains('ccg-nav-ready')
        };
      })();
    `);
    if (!state.navVisible) throw new Error(`${name}: navigation disappeared during load: ${JSON.stringify(state)}`);
    if (!state.mode) throw new Error(`${name}: mode control is missing.`);
    if (state.socials < 6) throw new Error(`${name}: expected six shared social links, found ${state.socials}.`);
    if (state.fallbackVisible) throw new Error(`${name}: obsolete text-social fallback became visible.`);
    if (state.syncing || state.readyClass) throw new Error(`${name}: obsolete nav lifecycle class returned.`);
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  await webdriver("POST", `/session/${sessionId}/refresh`, {});
  await waitUntil(sessionId, canonicalExpression, `${name} canonical navigation after refresh`);
}

async function main() {
  const driverPath = findChromeDriver();
  const siteServer = createServer();
  await new Promise((resolve) => siteServer.listen(SITE_PORT, HOST, resolve));
  const driver = spawn(driverPath, [`--port=${DRIVER_PORT}`, "--allowed-ips="], { stdio: ["ignore", "ignore", "pipe"] });
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
            args: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--window-size=1440,1000"]
          }
        }
      }
    });
    sessionId = session.sessionId;
    await webdriver("POST", `/session/${sessionId}/window/rect`, { width: 1440, height: 1000 });

    for (const [name, route] of PAGES) await assertPageShell(sessionId, name, route);

    console.log("Global shell browser audit passed.");
    console.log(`- ${PAGES.length} major public sections retain one visible canonical navigation across load and refresh`);
    console.log("- shared mode control and six-icon social group are present on every audited page");
    console.log("- obsolete text-social fallback never becomes visible");
  } finally {
    if (sessionId) {
      try { await webdriver("DELETE", `/session/${sessionId}`); } catch (_error) {}
    }
    driver.kill("SIGTERM");
    await new Promise((resolve) => siteServer.close(resolve));
    if (driverError && process.env.CCG_GLOBAL_SHELL_AUDIT_DEBUG === "1") process.stderr.write(driverError);
  }
}

main().catch((error) => {
  console.error(`Global shell browser audit failed: ${error.message}`);
  process.exit(1);
});
