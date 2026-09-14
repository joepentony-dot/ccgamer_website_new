import fs from "node:fs";

const html = fs.readFileSync("home.html", "utf8");
const css = fs.readFileSync("resources/css/home.css", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!fs.existsSync("resources/css/home-debug.css"), "legacy home-debug.css must remain retired");
assert(!html.includes("home-debug.css"), "home.html must not request retired home-debug.css");
assert(html.includes('href="resources/css/home.css"'), "home.css must remain loaded");
assert(html.includes('href="resources/css/ccg-mobile-lite.css"'), "mobile-lite stylesheet must remain loaded after home.css");
assert(css.includes("CONSOLIDATED HOME CORRECTIONS"), "consolidated correction marker must remain in home.css");
assert(css.includes('html[data-ccg-page="home"] .home-visitor-callout'), "visitor callout corrections must remain");
assert(css.includes('commodore-64-logo.webp'), "C64 featured-video platform identity must remain");
assert(css.includes('commodore-amiga-logo.webp'), "Amiga featured-video platform identity must remain");
assert(css.includes('html[data-ccg-page="home"] .home-hero__leaderboard-cta'), "single-game CTA correction must remain");

console.log("Homepage CSS consolidation guard passed.");
