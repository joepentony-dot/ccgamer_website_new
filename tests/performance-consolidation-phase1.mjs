import fs from "node:fs";

const home = fs.readFileSync("home.html", "utf8");
const homeCss = fs.readFileSync("resources/css/home.css", "utf8");
const sw = fs.readFileSync("service-worker.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!home.includes("home-debug.css"), "home.html must not request the retired home-debug.css file");
assert(!home.includes('href="resources/images/hero/ccg-hero-c64.png" fetchpriority="high"'), "home.html must not statically preload the C64 hero alongside the Amiga hero");
assert(!home.includes('href="resources/images/hero/ccg-hero-amiga.png" fetchpriority="high"'), "home.html must not statically preload the Amiga hero alongside the C64 hero");
assert(home.includes("document.documentElement.getAttribute('data-ccg-mode')"), "home.html must select the hero preload from the saved mode");
assert(homeCss.includes("CONSOLIDATED FROM FORMER home-debug.css"), "home.css must retain the former production correction rules");
assert(sw.includes('2026-09-14-public-release-v11-performance'), "service-worker cache version must be bumped");
assert(sw.includes('? networkFirstAsset(request)\n        : staleWhileRevalidate(request, ASSET_CACHE)'), "Lost Sizzler code must remain network-first while ordinary code assets use stale-while-revalidate");

console.log("Performance consolidation phase 1 guards passed.");
