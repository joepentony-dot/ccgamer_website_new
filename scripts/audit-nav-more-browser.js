#!/usr/bin/env node

"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const SITE_PORT = 4179;
const DRIVER_PORT = 9516;

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

async function waitUntil(sessionId, expression, label, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const ready = await execute(sessionId, `return Boolean(${expression});`);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out waiting for ${label}.`);
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
    await webdriver("POST", `/session/${sessionId}/url`, { url: `http://${HOST}:${SITE_PORT}/home.html` });

    const canonicalNavExpression = `
      (function () {
        const nav = document.querySelector('[data-ccg-header] .ccg-nav');
        const primary = Array.from(document.querySelectorAll('[data-ccg-nav-primary] > li > .ccg-nav__link')).map((link) => link.textContent.trim());
        const secondary = Array.from(document.querySelectorAll('[data-ccg-nav-secondary] > li > .ccg-nav__link')).map((link) => link.textContent.trim());
        if (!nav) return false;
        const style = getComputedStyle(nav);
        const rect = nav.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity || 1) > 0
          && rect.width > 1
          && rect.height > 1
          && primary.join('|') === 'Home|Browse Games|Browse by Genre|Publishers|Collections|Music Hub'
          && secondary.join('|') === 'Find Me a Game|Zzap!64 Reviews & Awards|Quiz|Emulation|Install CCG App|About Me|Contact';
      })()
    `;

    await waitUntil(sessionId, canonicalNavExpression, "visible canonical Omega navigation");
    await waitUntil(sessionId, "document.querySelector('[data-ccg-more-toggle]') && !document.querySelector('[data-ccg-more-toggle]').disabled", "enabled More toggle");

    const navState = await execute(sessionId, `
      return (function () {
        const nav = document.querySelector('[data-ccg-header] .ccg-nav');
        const style = nav ? getComputedStyle(nav) : null;
        return {
          syncing: document.documentElement.classList.contains('ccg-nav-syncing'),
          readyClass: document.documentElement.classList.contains('ccg-nav-ready'),
          visibility: style ? style.visibility : '',
          opacity: style ? style.opacity : '',
          display: style ? style.display : ''
        };
      })();
    `);

    if (navState.syncing || navState.readyClass) {
      throw new Error(`Obsolete navigation lifecycle class is still active: ${JSON.stringify(navState)}`);
    }
    if (navState.display === "none" || navState.visibility === "hidden" || Number(navState.opacity || 1) === 0) {
      throw new Error(`Canonical navigation is hidden: ${JSON.stringify(navState)}`);
    }

    const before = await execute(sessionId, `
      return (function () {
        const toggle = document.querySelector('[data-ccg-more-toggle]');
        const menu = document.querySelector('[data-ccg-more-menu]');
        const more = toggle && toggle.closest('.ccg-nav__more');
        const links = menu ? Array.from(menu.querySelectorAll('.ccg-nav-fit__link')).map((link) => ({ text: link.textContent.trim(), href: link.getAttribute('href') })) : [];
        return {
          moreDisplay: more ? getComputedStyle(more).display : '',
          toggleDisplay: toggle ? getComputedStyle(toggle).display : '',
          expanded: toggle ? toggle.getAttribute('aria-expanded') : null,
          hidden: menu ? menu.hidden : null,
          links
        };
      })();
    `);

    if (before.moreDisplay === "none" || before.toggleDisplay === "none") throw new Error("More is not visible at 1440px desktop width.");
    if (!before.links.some((link) => link.text === "About Me" && link.href === "/about.html")) throw new Error("More does not contain About Me.");
    if (!before.links.some((link) => link.text === "Contact" && link.href === "/contact.html")) throw new Error("More does not contain Contact.");

    await execute(sessionId, `document.querySelector('[data-ccg-more-toggle]').click(); return true;`);
    await waitUntil(sessionId, "document.querySelector('[data-ccg-more-toggle]').getAttribute('aria-expanded') === 'true'", "More expanded state");

    const after = await execute(sessionId, `
      return (function () {
        const toggle = document.querySelector('[data-ccg-more-toggle]');
        const menu = document.querySelector('[data-ccg-more-menu]');
        const rect = menu ? menu.getBoundingClientRect() : null;
        return {
          expanded: toggle ? toggle.getAttribute('aria-expanded') : null,
          hidden: menu ? menu.hidden : null,
          display: menu ? getComputedStyle(menu).display : '',
          visible: Boolean(menu && !menu.hidden && getComputedStyle(menu).display !== 'none' && rect && rect.width > 1 && rect.height > 1)
        };
      })();
    `);

    if (after.expanded !== "true" || after.hidden !== false || !after.visible) {
      throw new Error(`More click did not open a visible menu: ${JSON.stringify(after)}`);
    }

    const fallbackVisible = await execute(sessionId, `
      return Array.from(document.querySelectorAll('.ccg-socials-fallback')).some((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
      });
    `);
    if (fallbackVisible) throw new Error("Legacy text-social fallback is visible after navigation finalisation.");

    console.log("Navigation More browser audit passed.");
    console.log("- Canonical Omega navigation is visible without a ready/sync hiding lifecycle");
    console.log("- 1440px desktop More is visible and enabled");
    console.log("- About Me and Contact are present");
    console.log("- Clicking More opens a visible dropdown");
    console.log("- Legacy text-social fallback is not visible");
  } finally {
    if (sessionId) {
      try { await webdriver("DELETE", `/session/${sessionId}`); } catch (error) {}
    }
    driver.kill("SIGTERM");
    await new Promise((resolve) => siteServer.close(resolve));
    if (driverError && process.env.CCG_NAV_AUDIT_DEBUG === "1") process.stderr.write(driverError);
  }
}

main().catch((error) => {
  console.error(`Navigation More browser audit failed: ${error.message}`);
  process.exit(1);
});
