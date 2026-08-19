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
const W3C_ELEMENT_KEY = "element-6066-11e4-a52e-4f735466cecf";
const LIVE_BASE_URL = String(process.env.CCG_NAV_AUDIT_BASE_URL || "").trim().replace(/\/+$/, "");
const LOCAL_BASE_URL = `http://${HOST}:${SITE_PORT}`;

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

function auditBaseUrl() {
  return LIVE_BASE_URL || LOCAL_BASE_URL;
}

function normalizeText(value) {
  return String(value || "").replace(/\r\n/g, "\n");
}

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

async function fetchLiveText(relativePath) {
  const separator = relativePath.includes("?") ? "&" : "?";
  const response = await fetch(`${LIVE_BASE_URL}${relativePath}${separator}ccg-nav-audit=${Date.now()}`, {
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Live ${relativePath} returned ${response.status}.`);
  return response.text();
}

async function verifyLiveReleaseAssets() {
  if (!LIVE_BASE_URL) return;

  const assets = [
    ["/service-worker.js", "service-worker.js"],
    ["/js/ccg-nav-fit.js", "js/ccg-nav-fit.js"],
    ["/resources/css/ccg-nav-fit.css", "resources/css/ccg-nav-fit.css"],
    ["/resources/css/ccg-mode-identity.css", "resources/css/ccg-mode-identity.css"],
    ["/js/ccg-global-search.js", "js/ccg-global-search.js"],
    ["/js/zzap64-awards.js", "js/zzap64-awards.js"],
    ["/resources/css/ccg-global-search.css", "resources/css/ccg-global-search.css"],
    ["/resources/css/zzap64-performance.css", "resources/css/zzap64-performance.css"]
  ];

  for (const [remotePath, localPath] of assets) {
    const expected = normalizeText(fs.readFileSync(path.join(ROOT, localPath), "utf8"));
    const actual = normalizeText(await fetchLiveText(remotePath));
    if (actual !== expected) {
      throw new Error(`Live ${remotePath} does not match the repository release being audited.`);
    }
  }
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

async function findElement(sessionId, selector) {
  const value = await webdriver("POST", `/session/${sessionId}/element`, {
    using: "css selector",
    value: selector
  });
  const id = value?.[W3C_ELEMENT_KEY] || value?.ELEMENT;
  if (!id) throw new Error(`WebDriver did not return an element id for ${selector}.`);
  return id;
}

async function clickElement(sessionId, selector) {
  const id = await findElement(sessionId, selector);
  await webdriver("POST", `/session/${sessionId}/element/${encodeURIComponent(id)}/click`, {});
}

async function openHome(sessionId, width) {
  await webdriver("POST", `/session/${sessionId}/window/rect`, { width, height: 1000 });
  await webdriver("POST", `/session/${sessionId}/url`, {
    url: `${auditBaseUrl()}/home.html?ccg-nav-audit=${Date.now()}`
  });

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

  await waitUntil(sessionId, canonicalNavExpression, `visible canonical Omega navigation at ${width}px`);
  await waitUntil(
    sessionId,
    "document.querySelector('[data-ccg-more-toggle]') && !document.querySelector('[data-ccg-more-toggle]').disabled",
    `enabled More toggle at ${width}px`
  );
}

async function openMoreWithRealClick(sessionId, width) {
  await clickElement(sessionId, "[data-ccg-more-toggle]");
  await waitUntil(
    sessionId,
    "document.querySelector('[data-ccg-more-toggle]').getAttribute('aria-expanded') === 'true'",
    `More expanded state at ${width}px`
  );

  const state = await execute(sessionId, `
    return (function () {
      const header = document.querySelector('[data-ccg-header]');
      const nav = document.querySelector('[data-ccg-header] .ccg-nav');
      const menu = document.querySelector('[data-ccg-more-menu]');
      const rect = menu ? menu.getBoundingClientRect() : null;
      return {
        headerOpen: Boolean(header && header.classList.contains('ccg-header--more-open')),
        navOpen: Boolean(nav && nav.classList.contains('ccg-nav--more-open')),
        hidden: menu ? menu.hidden : null,
        display: menu ? getComputedStyle(menu).display : '',
        pointerEvents: menu ? getComputedStyle(menu).pointerEvents : '',
        zIndex: menu ? getComputedStyle(menu).zIndex : '',
        visible: Boolean(menu && !menu.hidden && getComputedStyle(menu).display !== 'none' && rect && rect.width > 1 && rect.height > 1)
      };
    })();
  `);

  if (!state.headerOpen || !state.navOpen || state.hidden !== false || !state.visible || state.pointerEvents === "none") {
    throw new Error(`More did not open as an interactive top-layer menu at ${width}px: ${JSON.stringify(state)}`);
  }
}

async function assertLinkOwnsItsHitTarget(sessionId, label, href) {
  const probe = await execute(sessionId, `
    return (function () {
      const link = Array.from(document.querySelectorAll('[data-ccg-more-menu] a[href]'))
        .find((candidate) => candidate.textContent.trim() === ${JSON.stringify(label)} && candidate.getAttribute('href') === ${JSON.stringify(href)});
      if (!link) return { found: false };
      const rect = link.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const top = document.elementFromPoint(x, y);
      return {
        found: true,
        linkDisplay: getComputedStyle(link).display,
        linkPointerEvents: getComputedStyle(link).pointerEvents,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        topTag: top ? top.tagName : '',
        topClass: top ? top.className : '',
        topHref: top && top.closest ? top.closest('a')?.getAttribute('href') || '' : '',
        ownsPoint: Boolean(top && (top === link || link.contains(top)))
      };
    })();
  `);

  if (!probe.found) throw new Error(`More does not contain ${label} (${href}).`);
  if (probe.linkDisplay === "none" || probe.linkPointerEvents === "none" || probe.rect.width <= 1 || probe.rect.height <= 1) {
    throw new Error(`${label} is not interactable: ${JSON.stringify(probe)}`);
  }
  if (!probe.ownsPoint) {
    throw new Error(`${label} is covered by another element: ${JSON.stringify(probe)}`);
  }
}

async function clickMoreDestination(sessionId, width, label, href, expectedPath) {
  await openHome(sessionId, width);
  await openMoreWithRealClick(sessionId, width);
  await assertLinkOwnsItsHitTarget(sessionId, label, href);

  const escapedHref = href.replace(/"/g, '\\"');
  await clickElement(sessionId, `[data-ccg-more-menu] a[href="${escapedHref}"]`);
  await waitUntil(
    sessionId,
    `window.location.pathname === ${JSON.stringify(expectedPath)}`,
    `${label} navigation at ${width}px`
  );

  const destinationState = await execute(sessionId, `
    return {
      pathname: window.location.pathname,
      canonicalShell: Boolean(document.querySelector('[data-ccg-static-shell="2026-08-19-v1"]')),
      header: Boolean(document.querySelector('[data-ccg-header]'))
    };
  `);

  if (!destinationState.header || !destinationState.canonicalShell) {
    throw new Error(`${label} destination did not render the canonical shared header: ${JSON.stringify(destinationState)}`);
  }
}

async function main() {
  const driverPath = findChromeDriver();
  const siteServer = LIVE_BASE_URL ? null : createServer();
  if (siteServer) await new Promise((resolve) => siteServer.listen(SITE_PORT, HOST, resolve));

  await verifyLiveReleaseAssets();

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
          pageLoadStrategy: "none",
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

    for (const width of [1440, 1920]) {
      await clickMoreDestination(sessionId, width, "Install CCG App", "/install-app.html", "/install-app.html");
      const installState = await execute(sessionId, `
        return (function () {
          const visibleSecondary = Array.from(document.querySelectorAll('[data-ccg-nav-secondary] > li > .ccg-nav__link'))
            .filter((link) => getComputedStyle(link.closest('li')).display !== 'none')
            .map((link) => link.textContent.trim());
          return {
            emulationVisible: visibleSecondary.includes('Emulation'),
            installVisible: visibleSecondary.includes('Install CCG App')
          };
        })();
      `);
      if (!installState.emulationVisible || installState.installVisible) {
        throw new Error(`Install page desktop navigation is not stable at ${width}px: ${JSON.stringify(installState)}`);
      }
      await clickMoreDestination(sessionId, width, "About Me", "/about.html", "/about.html");
      await clickMoreDestination(sessionId, width, "Contact", "/contact.html", "/contact.html");
    }

    await openHome(sessionId, 1440);
    const navState = await execute(sessionId, `
      return (function () {
        const nav = document.querySelector('[data-ccg-header] .ccg-nav');
        const style = nav ? getComputedStyle(nav) : null;
        const pinned = Array.from(document.querySelectorAll('[data-ccg-nav-secondary] > li')).filter((item) => {
          const href = item.querySelector('a')?.getAttribute('href');
          return href === '/install-app.html' || href === '/about.html' || href === '/contact.html';
        });
        return {
          syncing: document.documentElement.classList.contains('ccg-nav-syncing'),
          readyClass: document.documentElement.classList.contains('ccg-nav-ready'),
          visibility: style ? style.visibility : '',
          opacity: style ? style.opacity : '',
          display: style ? style.display : '',
          pinnedHidden: pinned.every((item) => getComputedStyle(item).display === 'none'),
          moreDisplay: getComputedStyle(document.querySelector('.ccg-nav__more')).display
        };
      })();
    `);

    if (navState.syncing || navState.readyClass) {
      throw new Error(`Obsolete navigation lifecycle class is still active: ${JSON.stringify(navState)}`);
    }
    if (navState.display === "none" || navState.visibility === "hidden" || Number(navState.opacity || 1) === 0) {
      throw new Error(`Canonical navigation is hidden: ${JSON.stringify(navState)}`);
    }
    if (!navState.pinnedHidden || navState.moreDisplay === "none") {
      throw new Error(`Desktop first-paint geometry contract is not stable: ${JSON.stringify(navState)}`);
    }

    const fallbackVisible = await execute(sessionId, `
      return Array.from(document.querySelectorAll('.ccg-socials-fallback')).some((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
      });
    `);
    if (fallbackVisible) throw new Error("Legacy text-social fallback is visible after navigation finalisation.");

    console.log(`${LIVE_BASE_URL ? "Live" : "Local"} Navigation More browser audit passed.`);
    if (LIVE_BASE_URL) console.log(`- Public release assets match the repository release at ${LIVE_BASE_URL}`);
    console.log("- Canonical Omega navigation remains visible without an obsolete hide/show lifecycle");
    console.log("- Desktop Install CCG App, About Me and Contact copies stay out of the visible row while More keeps its slot");
    console.log("- Real WebDriver pointer clicks open More at 1440px and 1920px");
    console.log("- Install CCG App, About Me and Contact own their hit targets and navigate successfully at both widths");
    console.log("- Install page keeps Emulation visible while Install CCG App remains inside More");
    console.log("- Destination pages retain the canonical shared header");
    console.log("- Legacy text-social fallback is not visible");
  } finally {
    if (sessionId) {
      try { await webdriver("DELETE", `/session/${sessionId}`); } catch (error) {}
    }
    driver.kill("SIGTERM");
    if (siteServer) await new Promise((resolve) => siteServer.close(resolve));
    if (driverError && process.env.CCG_NAV_AUDIT_DEBUG === "1") process.stderr.write(driverError);
  }
}

main().catch((error) => {
  console.error(`Navigation More browser audit failed: ${error.message}`);
  process.exit(1);
});