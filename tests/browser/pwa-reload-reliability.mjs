import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
let slowProbe = false;
const watchdog = setTimeout(() => {
  console.error("PWA_RELOAD_BROWSER_WATCHDOG: browser regression exceeded 45 seconds");
  try { server?.closeAllConnections?.(); } catch (error) {}
  process.exit(1);
}, 45000);

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"]
]);

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-cache, no-store, must-revalidate"
  });
  res.end(body);
}

function probeDocument() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>CCG reload probe</title></head>
<body><main id="probe">reload-probe-ok</main></body></html>`;
}

function safeFilePath(pathname) {
  let relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!relative) relative = "home.html";
  if (relative.endsWith("/")) relative += "index.html";
  const filePath = path.resolve(root, relative);
  return filePath.startsWith(root + path.sep) ? filePath : null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");

  if (url.pathname === "/reload-probe.html") {
    const sendProbe = () => {
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache"
      });
      res.end(probeDocument());
    };

    if (slowProbe) {
      const timer = setTimeout(() => {
        if (!res.writableEnded) sendProbe();
      }, 20000);
      timer.unref();
      req.on("close", () => clearTimeout(timer));
      return;
    }
    sendProbe();
    return;
  }

  const filePath = safeFilePath(url.pathname);
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    send(res, 404, "not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "content-type": mime.get(ext) || "application/octet-stream",
    "cache-control": "no-cache, no-store, must-revalidate"
  });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  console.log("PWA_RELOAD_PHASE initial-navigation");
  await page.goto(`${origin}/reload-probe.html`, { waitUntil: "domcontentloaded", timeout: 15000 });

  console.log("PWA_RELOAD_PHASE register-worker");
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register("/service-worker.js", {
      scope: "/",
      updateViaCache: "none"
    });
    await navigator.serviceWorker.ready;
    if (registration.installing) {
      await new Promise((resolve) => {
        const worker = registration.installing;
        const done = () => {
          if (worker.state === "installed" || worker.state === "activated" || worker.state === "redundant") {
            worker.removeEventListener("statechange", done);
            resolve();
          }
        };
        worker.addEventListener("statechange", done);
        done();
      });
    }
  });

  console.log("PWA_RELOAD_PHASE first-controlled-reload");
  await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
  assert.equal(
    await page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    true,
    "probe page should be controlled after the first service-worker reload"
  );

  console.log("PWA_RELOAD_PHASE seed-stale-code-cache");
  await page.evaluate(async () => {
    const old = await caches.open("ccg-code-obsolete-reload-probe");
    await old.put(
      "/js/ccg-recent-content.js",
      new Response("STALE_RELOAD_SENTINEL", {
        headers: { "content-type": "application/javascript" }
      })
    );
  });

  console.log("PWA_RELOAD_PHASE verify-current-code");
  const codeText = await page.evaluate(async () => {
    const response = await fetch("/js/ccg-recent-content.js");
    return response.text();
  });
  assert.doesNotMatch(codeText, /STALE_RELOAD_SENTINEL/);
  assert.match(codeText, /CCG_RECENT_CONTENT_READY/);

  // Ensure the current page has been written to the versioned page cache.
  console.log("PWA_RELOAD_PHASE prime-page-cache");
  await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });

  console.log("PWA_RELOAD_PHASE stalled-network-reload");
  slowProbe = true;
  const started = Date.now();
  await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
  const elapsed = Date.now() - started;

  assert.equal(await page.locator("#probe").textContent(), "reload-probe-ok");
  assert.ok(
    elapsed >= 6500 && elapsed < 14000,
    `stalled navigation should recover from cache after the bounded navigation wait; elapsed=${elapsed}ms`
  );

  console.log(JSON.stringify({
    controlled: true,
    staleNamespaceIgnored: true,
    stalledReloadRecovered: true,
    elapsedMs: elapsed
  }));
} finally {
  slowProbe = false;
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  try { server.closeAllConnections?.(); } catch (error) {}
  await new Promise((resolve) => server.close(resolve));
  clearTimeout(watchdog);
}
