// Regression guard for the standalone Amazon Influencer shop.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const html = read("retro-shop.html");
const home = read("home.html");
const support = read("support.html");
const game = read("js/affiliate-products.js");
const css = read("resources/css/retro-shop.css");
const sharedCss = read("resources/css/ccg-affiliate-showcase.css");
const manifest = JSON.parse(read("tools/seo/static-pages.json"));
const sitemap = read("sitemap-pages.xml");

assert.match(html, /<link rel="canonical" href="https:\/\/www\.cheekycommodoregamer\.co\.uk\/retro-shop\.html"/);
assert.match(html, /As an Amazon Associate I earn from qualifying purchases\./);
assert.match(html, /href="\/affiliate-disclosure\.html"/);
assert.match(home, /href="\/retro-shop\.html"/);
assert.match(support, /href="\/retro-shop\.html"/);
assert.match(game, /data-ccg-retro-shop-link/);
assert.match(game, /header && !header\.querySelector/);
assert.match(sharedCss, /ccg-retro-shop-game-link/);
assert.match(css, /prefers-reduced-motion/);
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
  4,
  "Each external Amazon storefront / collection link must be marked sponsored"
);
console.log("[retro-shop] Page links, disclosures, HTML paths, tag fidelity, game link and sitemap validated.");
