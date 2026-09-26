import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const serviceWorker = fs.readFileSync("service-worker.js", "utf8");
const releaseCheck = fs.readFileSync("js/ccg-release-check.js", "utf8");

test("page and code fallbacks stay in the current public-code namespace", () => {
  assert.match(
    serviceWorker,
    /const PAGE_CACHE = `ccg-pages-\$\{CACHE_VERSION\}-\$\{CODE_CACHE_VERSION\}`/
  );

  const start = serviceWorker.indexOf("async function cacheFirstCodeAsset");
  const end = serviceWorker.indexOf("async function cacheFirstAsset", start);
  const cacheFirst = start >= 0 && end > start ? serviceWorker.slice(start, end) : "";

  assert.match(cacheFirst, /const cache = await caches\.open\(CODE_CACHE\)/);
  assert.match(cacheFirst, /const cached = await cache\.match\(request/);
  assert.match(cacheFirst, /const shellCache = await caches\.open\(SHELL_CACHE\)/);
  assert.match(cacheFirst, /const shellCached = await shellCache\.match\(request/);
  assert.doesNotMatch(cacheFirst, /await caches\.match\(request/);
});

test("reload navigation and service-worker shell install are both bounded", () => {
  assert.match(serviceWorker, /const NAVIGATION_TIMEOUT_MS = 7000;/);
  assert.match(serviceWorker, /const SHELL_FETCH_TIMEOUT_MS = 5000;/);
  assert.match(serviceWorker, /Promise\.race\(\[[\s\S]*navigationTimeout\(\)/);
  assert.match(serviceWorker, /async function fetchShellWithTimeout\(request\)/);
  assert.match(serviceWorker, /Promise\.race\(\[fetch\(request\), timeout\]\)/);
  assert.match(serviceWorker, /const response = await fetchShellWithTimeout\(request\)/);
  assert.match(serviceWorker, /await cache\.match\(cacheKey\)[\s\S]*caches\.match\(OFFLINE_URL\)/);
});

test("manual release reload activates fresh code or waits for cache-clear acknowledgement", () => {
  assert.match(serviceWorker, /PUBLIC_CACHES_CLEARED/);
  assert.match(serviceWorker, /replyPort\?\.postMessage\?\.\(\{ type: "PUBLIC_CACHES_CLEARED", ok \}\)/);
  assert.match(releaseCheck, /function requestPublicCacheClear\(worker\)/);
  assert.match(releaseCheck, /new MessageChannel\(\)/);
  assert.match(releaseCheck, /await requestPublicCacheClear\(worker\)/);
  assert.match(releaseCheck, /function waitForWaitingWorker\(registration, timeoutMs = 2600\)/);

  const start = releaseCheck.indexOf("async function activateRelease");
  const end = releaseCheck.indexOf("function showUpdatePanel", start);
  const activate = start >= 0 && end > start ? releaseCheck.slice(start, end) : "";

  const updateIndex = activate.indexOf("registration?.update?.()");
  const waitIndex = activate.indexOf("await waitForWaitingWorker(registration)");
  const waitingIndex = activate.indexOf("if (waiting)");
  const skipIndex = activate.indexOf('waiting.postMessage({ type: "SKIP_WAITING" })');
  const clearIndex = activate.indexOf("await clearPublicCaches(registration)");
  const finalReloadIndex = activate.lastIndexOf("window.location.reload()");

  assert.ok(updateIndex >= 0 && waitIndex > updateIndex, "update check must run before waiting-worker activation");
  assert.ok(waitingIndex > waitIndex && skipIndex > waitingIndex, "a ready replacement worker must activate before reload");
  assert.ok(clearIndex > waitingIndex, "cache clearing is fallback-only when no replacement worker is ready");
  assert.ok(finalReloadIndex > clearIndex, "fallback reload must happen after the cache-clear acknowledgement");
});
