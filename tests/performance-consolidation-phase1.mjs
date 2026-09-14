import fs from "node:fs";

const home = fs.readFileSync("home.html", "utf8");
const homeCss = fs.readFileSync("resources/css/home.css", "utf8");
const sw = fs.readFileSync("service-worker.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const c64Preload = '    <link rel="preload" as="image" href="resources/images/hero/ccg-hero-c64.png" fetchpriority="high" type="image/png">';
const amigaPreload = '    <link rel="preload" as="image" href="resources/images/hero/ccg-hero-amiga.png" fetchpriority="high" type="image/png">';

assert(!home.includes("home-debug.css"), "home.html must not request the retired home-debug.css file");
assert(home.split(c64Preload).length - 1 === 1, "C64 hero preload must remain present exactly once");
assert(home.split(amigaPreload).length - 1 === 1, "Amiga hero preload must remain present exactly once");
assert(homeCss.includes("CONSOLIDATED FROM FORMER home-debug.css"), "home.css must retain the former production correction rules");
assert(sw.includes('const CACHE_VERSION = "2026-09-14-public-release-v11";'), "service-worker cache version must follow the release contract");
assert(sw.includes('? networkFirstAsset(request)\n        : staleWhileRevalidate(request, ASSET_CACHE)'), "Lost Sizzler code must remain network-first while ordinary code assets use stale-while-revalidate");

console.log("Performance consolidation phase 1 guards passed.");
