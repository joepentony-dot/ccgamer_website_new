// Regression guard for the standalone Amazon Influencer shop.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const html = read("retro-shop.html");
const home = read("home.html");
const support = read("support.html");
const game = read("js/affiliate-products.js");
const css = read("resources/css/retro-shop.css");
const sharedCss = read("resources/css/ccg-affiliate-showcase.css");
const manifest = JSON.parse(read("tools/seo/static-pages.json"));
const sitemap = read("sitemap-pages.xml");
const config = JSON.parse(read("resources/data/affiliate-products.json"));

assert.match(html, /<link rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/retro-shop\.html"/);
assert.match(html, /As an Amazon Associate I earn from qualifying purchases\./);
assert.match(html, /href="\/affiliate-disclosure\.html"/);
assert.match(home, /href="\/retro-shop\.html"/);
assert.match(support, /href="\/retro-shop\.html"/);
assert.match(game, /data-ccg-retro-shop-link/);
assert.match(game, /header && !header\.querySelector/);
assert.match(sharedCss, /ccg-retro-shop-game-link/);
assert.match(css, /prefers-reduced-motion/);

// Before 4 December the THEA1200 retains its primary Amazon CTA, but the
// quieter MORE FROM AMAZON button opens our own shop in the same tab.
assert.match(game, /actions\.appendChild\(cta\)/);
assert.match(game, /shopLink\.href = resolveSiteUrl\("retro-shop\.html"\)/);
assert.match(game, /shopLink\.textContent = "MORE FROM AMAZON"/);
assert.doesNotMatch(game, /shopLink\.target = "_blank"/);
assert.doesNotMatch(game, /shopLink\.rel = "sponsored nofollow noopener noreferrer"/);
assert.match(game, /actions\.appendChild\(shopLink\)/);
assert.match(sharedCss, /\.ccg-home-affiliate-spotlight__shop-link:focus-visible/);
assert.ok(manifest.includes("retro-shop.html"), "Shop must be in the static sitemap source");
assert.match(sitemap, /https:\/\/www\.cheekycommodoregamer\.co\.uk\/retro-shop\.html/);

const listLinks = [...html.matchAll(/href="(https:\/\/www\.amazon\.co\.uk\/shop\/cheekycommodoregamer\/list\/[^"]+)"/g)]
  .map((match) => match[1].replaceAll("&amp;", "&"));
assert.equal(listLinks.length, 3, "All three curated collection links must be present once");
const expectedIds = ["1VTVYVC8X7SDE", "12HA8QPINLWST", "1OSXO76IN2A73"];
assert.deepEqual(
  listLinks.map((href) => new URL(href).pathname.split("/").at(-1)),
  expectedIds,
  "Collection links must match the owner-supplied Amazon URLs in their supplied order"
);
for (const href of listLinks) {
  const url = new URL(href);
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, "www.amazon.co.uk");
  assert.equal(url.searchParams.get("tag"), "joepentony-20");
  assert.equal(url.searchParams.get("originMarketplaceId"), "A1F83G8C2ARO7P");
}
assert.equal(
  (html.match(/rel="sponsored nofollow noopener noreferrer"/g) || []).length,
  14,
  "All ten products and the four storefront / collection links must be marked sponsored"
);

assert.equal(config.homepageSpotlight.end, "2026-12-03T23:59:59.999Z");
assert.equal(config.homepageRetroShop.start, "2026-12-04T00:00:00Z");
assert.equal(Date.parse(config.homepageRetroShop.start), Date.parse(config.homepageSpotlight.end) + 1);
assert.equal(config.homepageRetroShop.activeTag, "joepentony-20");
assert.deepEqual(config.homepageRetroShop.collections.map((item) => item.url), listLinks);
assert.match(game, /function armHomeShopSwitch\(config\)/);
assert.match(game, /document\.addEventListener\("visibilitychange"/);
assert.match(game, /window\.addEventListener\("pageshow"/);
assert.match(sharedCss, /\.ccg-home-affiliate-spotlight--retro-shop::after/);
assert.match(sharedCss, /\.ccg-home-retro-shop__links/);

// The shop must list every unique game-page affiliate product with the same
// live URL, ASIN and original CCG Associates tracking ID.
const products = Object.entries(config.products);
const productCards = [...html.matchAll(/<article class="ccg-retro-shop__pick" data-ccg-game-pick="([^"]+)">([\s\S]*?)<\/article>/g)];
assert.equal(products.length, 10);
assert.equal(productCards.length, products.length);
assert.deepEqual(productCards.map((match) => match[1]), products.map(([id]) => id));
for (const [index, [id, product]] of products.entries()) {
  const article = productCards[index][2];
  const href = article.match(/href="(https:\/\/www\.amazon\.co\.uk\/[^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  assert.ok(href, "Missing Amazon URL on " + id);
  assert.equal(href, product.url, "Existing URL parameters changed for " + id);
  assert.equal(new URL(href).searchParams.get("tag"), config.account.activeTag);
  assert.match(article, /rel="sponsored nofollow noopener noreferrer"/);
  assert.match(article, /data-ccg-revenue-link="amazon-associates-2026"/);
}
assert.match(css, /\.ccg-retro-shop__picks-grid/);

// Exercise the actual homepage renderer at the precise UK release boundary
// with a minimal DOM instead of relying only on source-code string checks.
let clock = Date.parse("2026-12-03T23:59:59.999Z");
class TestClock extends Date {
  static now() { return clock; }
}
let currentSpotlight = null;
const timerQueue = [];
const listeners = {};
const element = (tag) => ({
  tagName: tag,
  className: "",
  children: [],
  attributes: {},
  textContent: "",
  setAttribute(name, value) { this.attributes[name] = value; },
  getAttribute(name) { return this.attributes[name] ?? null; },
  append(...nodes) { this.children.push(...nodes); },
  appendChild(node) { this.children.push(node); return node; },
  remove() { if (currentSpotlight === this) currentSpotlight = null; }
});
const hero = {
  parentElement: {},
  insertAdjacentElement(_where, node) { currentSpotlight = node; }
};
const documentMock = {
  readyState: "complete",
  hidden: false,
  documentElement: { getAttribute(name) { return name === "data-ccg-page" ? "home" : null; } },
  head: { appendChild() {} },
  createElement: element,
  createTextNode(value) { return { textContent: value }; },
  getElementById() { return null; },
  querySelector(selector) {
    if (selector === "[data-ccg-home-affiliate-spotlight]") return currentSpotlight;
    if (selector === ".home-hero") return hero;
    return null;
  },
  addEventListener(name, callback) { listeners[name] = callback; }
};
const windowMock = {
  location: { href: "https://www.cheekycommodoregamer.co.uk/home.html" },
  setTimeout(callback, delay) {
    const entry = { callback, delay, cancelled: false };
    timerQueue.push(entry);
    return timerQueue.length;
  },
  clearTimeout(id) { if (timerQueue[id - 1]) timerQueue[id - 1].cancelled = true; },
  addEventListener(name, callback) { listeners[name] = callback; }
};
runInNewContext(game, {
  document: documentMock, window: windowMock, URL, Date: TestClock,
  fetch: async () => ({ ok: true, json: async () => config }),
  requestAnimationFrame: (callback) => callback()
}, { filename: "js/affiliate-products.js" });
assert.equal(timerQueue[0]?.delay, 0, "Home render should be scheduled at startup");
timerQueue[0].callback();
await new Promise((resolve) => setImmediate(resolve));
assert.ok(currentSpotlight?.className.includes("ccg-home-affiliate-spotlight"));
assert.ok(!currentSpotlight.className.includes("--retro-shop"), "A1200 must remain until midnight");
const findLinks = (node) => {
  const found = node?.tagName === "a" ? [node] : [];
  for (const child of node?.children || []) found.push(...findLinks(child));
  return found;
};
const beforeLinks = findLinks(currentSpotlight);
assert.ok(beforeLinks.some((link) => link.textContent === "MORE FROM AMAZON" && link.href === "/retro-shop.html" && !link.target));
assert.ok(beforeLinks.some((link) => String(link.href).includes("B0G1L9Q7WK")), "A1200 primary Amazon link missing");
const switchTimer = timerQueue.find((item) => !item.cancelled && item.delay > 0);
assert.ok(switchTimer, "A timer for 4 December must be armed");
clock = Date.parse("2026-12-04T00:00:00Z");
switchTimer.callback();
assert.ok(currentSpotlight?.className.includes("--retro-shop"), "The A1200 must be replaced at midnight");
const afterLinks = findLinks(currentSpotlight);
assert.equal(afterLinks.filter((link) => link.rel === "sponsored nofollow noopener noreferrer").length, 3);
assert.ok(afterLinks.some((link) => link.href === "/retro-shop.html" && link.textContent === "BROWSE ALL CCG PICKS"));
assert.ok(!afterLinks.some((link) => String(link.href).includes("B0G1L9Q7WK")), "A1200 advert must be gone after midnight");
listeners.visibilitychange();
assert.ok(currentSpotlight?.className.includes("--retro-shop"), "Returning from sleep must retain the shop");

console.log("[retro-shop] 10 original game-page URLs, Dec 4 midnight rollover, internal shop CTA, disclosures and existing collections validated.");

