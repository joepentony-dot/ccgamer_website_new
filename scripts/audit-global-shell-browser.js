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
  "/home.html",
  "/games/",
  "/games/discover/",
  "/games/publishers/",
  "/music/",
  "/zzap64/",
  "/quiz/quiz.html",
  "/emulation.html",
  "/about.html",
  "/contact.html"
];

const EXPECTED_PRIMARY = [
  "Home",
  "Browse Games",
  "Browse by Genre",
  "Publishers",
  "Collections",
  "Music Hub"
];

const EXPECTED_SECONDARY = [
  "Find Me a Game",
  "Zzap!64 Reviews & Awards",
  "Quiz",
  "Emulation",
  "Install CCG App",
  "About Me",
  "Contact"
];

const EXPECTED_SOCIALS = [
  "YouTube",
  "Patreon",
  "PayPal",
  "X/Twitter",
  "Facebook",
  "Discord"
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
    res.writeHead(200, {
      "content-type": contentType,
      "cache-control": "no-store, max-age=0",
      pragma: "no-cache"
    });
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
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("ChromeDriver did not become ready.");
}

async function execute(sessionId, script, args = []) {
  return webdriver("POST", `/session/${sessionId}/execute/sync`, { script, args });
}

async function waitUntil(sessionId, expression, label, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const ready = await execute(sessionId, `return Boolean(${expression});`);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 70));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

function sameArray(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

async function shellSnapshot(sessionId) {
  return execute(sessionId, `
    return (function () {
      const header = document.querySelector('[data-ccg-header]');
      const nav = header && header.querySelector('.ccg-nav');
      const auth = header && header.querySelector('.ccg-auth-slot');
      const socials = header ? Array.from(header.querySelectorAll('.ccg-header-socials > a')).map((link) => link.getAttribute('aria-label')) : [];
      const primary = header ? Array.from(header.querySelectorAll('[data-ccg-nav-primary] > li > .ccg-nav__link')).map((link) => link.textContent.trim()) : [];
      const secondary = header ? Array.from(header.querySelectorAll('[data-ccg-nav-secondary] > li > .ccg-nav__link')).map((link) => link.textContent.trim()) : [];
      const rect = header ? header.getBoundingClientRect() : null;
      const style = nav ? getComputedStyle(nav) : null;
      return {
        authority: header ? header.dataset.ccgShellAuthority || '' : '',
        primary,
        secondary,
        socials,
        hasAuth: Boolean(auth),
        authText: auth ? auth.textContent.replace(/\\s+/g, ' ').trim() : '',
        hasMode: Boolean(header && header.querySelector('[data-ccg-mode-toggle]')),
        hasModeHint: Boolean(header && header.querySelector('.ccg-mode-hint')),
        fallbackCount: header ? header.querySelectorAll('.ccg-socials-fallback').length : 0,
        navVisible: Boolean(nav && style && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0),
        headerHeight: rect ? Math.round(rect.height) : 0,
        shellReady: document.documentElement.classList.contains('ccg-shell-ready'),
        syncingClass: document.documentElement.classList.contains('ccg-nav-syncing') || document.documentElement.classList.contains('ccg-nav-ready')
      };
    })();
  `);
}

async function auditPage(sessionId, pagePath) {
  await webdriver("POST", `/session/${sessionId}/url`, { url: `http://${HOST}:${SITE_PORT}${pagePath}` });
  await waitUntil(
    sessionId,
    "document.querySelector('[data-ccg-header][data-ccg-shell-authority=\"true\"]') && document.documentElement.classList.contains('ccg-shell-ready')",
    `${pagePath} unified shell`
  );

  const first = await shellSnapshot(sessionId);
  await new Promise((resolve) => setTimeout(resolve, 650));
  const second = await shellSnapshot(sessionId);

  if (!sameArray(second.primary, EXPECTED_PRIMARY)) {
    throw new Error(`${pagePath} primary navigation differs: ${JSON.stringify(second.primary)}`);
  }
  if (!sameArray(second.secondary, EXPECTED_SECONDARY)) {
    throw new Error(`${pagePath} secondary navigation differs: ${JSON.stringify(second.secondary)}`);
  }
  if (!sameArray(second.socials, EXPECTED_SOCIALS)) {
    throw new Error(`${pagePath} social controls differ: ${JSON.stringify(second.socials)}`);
  }
  if (!first.navVisible || !second.navVisible) throw new Error(`${pagePath} navigation became hidden.`);
  if (!second.hasAuth || !second.authText) throw new Error(`${pagePath} has no stable account control.`);
  if (!second.hasMode || !second.hasModeHint) throw new Error(`${pagePath} is missing global mode controls.`);
  if (second.fallbackCount !== 0) throw new Error(`${pagePath} still exposes a legacy social fallback.`);
  if (first.syncingClass || second.syncingClass) throw new Error(`${pagePath} restored an obsolete nav hiding lifecycle.`);
  if (Math.abs(second.headerHeight - first.headerHeight) > 28) {
    throw new Error(`${pagePath} header shifted ${Math.abs(second.headerHeight - first.headerHeight)}px after shell authority.`);
  }

  return {
    pagePath,
    headerHeight: second.headerHeight,
    authText: second.authText
  };
}

async function main() {
  const driverPath = findChromeDriver();
  const siteServer = createServer();
  await new Promise((resolve) => siteServer.listen(SITE_PORT, HOST, resolve));

  const driver = spawn(driverPath, [`--port=${DRIVER_PORT}`, "--allowed-ips="], {
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
          pageLoadStrategy: "eager",
          "goog:chromeOptions": {
            args: [
              "--headless=new",
              "--no-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
              "--window-size=1440,1000"
            ]
          }
        }
      }
    });
    sessionId = session.sessionId;
    await webdriver("POST", `/session/${sessionId}/window/rect`, { width: 1440, height: 1000 });

    const results = [];
    for (const pagePath of PAGES) {
      results.push(await auditPage(sessionId, pagePath));
    }

    console.log("Global shell browser audit passed.");
    results.forEach((result) => {
      console.log(`- ${result.pagePath}: ${result.headerHeight}px header · account control: ${result.authText}`);
    });
    console.log("- canonical primary/secondary navigation remained identical across the journey");
    console.log("- auth slot, mode controls and six social controls remained present");
    console.log("- no legacy social fallback or nav-hiding lifecycle appeared");
  } finally {
    if (sessionId) {
      try { await webdriver("DELETE", `/session/${sessionId}`); } catch (error) {}
    }
    driver.kill("SIGTERM");
    await new Promise((resolve) => siteServer.close(resolve));
    if (driverError && process.env.CCG_SHELL_AUDIT_DEBUG === "1") process.stderr.write(driverError);
  }
}

main().catch((error) => {
  console.error(`Global shell browser audit failed: ${error.message}`);
  process.exit(1);
});
