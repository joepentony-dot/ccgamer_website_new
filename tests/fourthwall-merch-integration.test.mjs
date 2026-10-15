import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const SHOP = "https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp";

test("homepage advertises the existing Fourthwall shop below community and before support", () => {
    const html = read("home.html");
    const start = html.indexOf('class="home-merch-promo ccg-chapter"');
    const community = html.indexOf('class="home-community-latest ccg-chapter"');
    const support = html.indexOf('class="home-support-art home-cta-upgrade"');
    assert.ok(start > community && support > start, "the merch panel must follow community and precede support");
    assert.ok(html.includes('rel="preload" href="/resources/css/home-fourthwall-merch.css" as="style"'));
    assert.ok(html.includes('<noscript><link rel="stylesheet" href="/resources/css/home-fourthwall-merch.css"'));
    const panel = html.slice(start, support);
    assert.match(panel, /<section[^>]*class="home-merch-promo ccg-chapter"[^>]*>\s*<a class="home-merch-promo__link"/);
    assert.ok(panel.includes('href="' + SHOP + '"'));
    assert.ok(panel.indexOf('home-merch-promo__title') > panel.indexOf('home-merch-promo__link'));
    assert.ok(panel.indexOf('home-merch-promo__action') < panel.lastIndexOf('</a>'));
    assert.doesNotMatch(panel, /<a\b[^>]*class="home-merch-promo__action"/);
    assert.equal((panel.match(/<a\b/g) || []).length, 1, "one full-panel link");
    assert.match(panel, /target="_blank" rel="noopener noreferrer"/);
    assert.match(panel, /data-ccg-revenue-link="fourthwall-merch"/);
    assert.ok(panel.includes('id="home-merch-title"'));
    assert.doesNotMatch(panel, /<iframe|<script|<img|fetch\(/i);
});

test("merch promotion leaves canonical homepage navigation untouched", () => {
    const html = read("home.html");
    const core = read("js/ccg-nav-core.js");
    assert.doesNotMatch(core, /fourthwall\.com/);
    assert.equal(html.split(SHOP).length - 1, 1, "only the full-panel link should point to Fourthwall");
    assert.ok(html.includes('<li><a href="/emulation.html" class="ccg-nav__link">Emulation</a></li>'));
});

test("merchandise styles are scoped and don't alter archive tiles or create heavy embeds", () => {
    const css = read("resources/css/home-fourthwall-merch.css");
    assert.match(css, /html\[data-ccg-page="home"\] \.home-merch-promo/);
    assert.match(css, /\.home-merch-promo__link\s*\{/);
    assert.match(css, /\.home-merch-promo__link:focus-visible/);
    assert.match(css, /\.home-merch-promo:focus-within/);
    assert.doesNotMatch(css, /ccg-card|home-archive-route|home-video-card|object-fit|position:\s*fixed/);
    assert.doesNotMatch(css, /@import|url\(|animation:/i);
});
