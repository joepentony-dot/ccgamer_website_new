import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("service-worker.js", "utf8");

assert.match(
  source,
  /const NAVIGATION_TIMEOUT_MS = 7000;/,
  "public navigations must have a bounded online wait"
);
assert.match(
  source,
  /Promise\.race\(\[\s*\(async \(\) => \{/,
  "navigation preload and fetch must be bounded by a timeout race"
);
assert.match(
  source,
  /navigationTimeout\(\)/,
  "network-first navigation must include the timeout guard"
);
assert.match(
  source,
  /await cache\.match\(cacheKey\)[\s\S]*caches\.match\(request, \{ ignoreSearch: true \}\)[\s\S]*caches\.match\(OFFLINE_URL\)/,
  "timed-out reloads must fall back to the page cache and then the offline shell"
);
const cacheVersion = source.match(/const CODE_CACHE_VERSION = "2026-09-26-public-code-v(\d+)";/);
assert.ok(cacheVersion, "service worker must publish a numbered public code cache namespace");
assert.ok(
  Number(cacheVersion[1]) >= 34,
  "reload-safety service-worker changes must remain on public code cache v34 or newer"
);

console.log("Service-worker reload navigation safety regression passed.");
