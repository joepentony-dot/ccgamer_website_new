import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const SHOP = "https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp";

test("homepage merch feature links to the existing Fourthwall shop without external embeds", () => {
    const html = read("home.html");
    const start = html.indexOf('class="home-merch-promo ccg-chapter"');
    const support = html.indexOf('class="home-support-art home-cta-upgrade"');
    assert.ok(start > 0, "homepage merch promotion is missing");
    assert.ok(support > start, "merchandise should sit immediately before optional support");
    assert.ok(html.includes('href="/resources/css/home-fourthwall-merch.css"'));
    const promo = html.slice(start, support);
    assert.ok(promo.includes('href="' + SHOP + '"'));
    assert.match(promo, /target="_blank" rel="noopener noreferrer"/);
    assert.doesNotMatch(promo, /<iframe|<script|<img|fetch\(/i);
    assert.ok(promo.includes('id="home-merch-title"'));
});

test("canonical navigation and the first-paint homepage link preserve merchant target", () => {
    const home = read("home.html");
    const core = read("js/ccg-nav-core.js");
    const fit = read("js/ccg-nav-fit.js");
    const navCss = read("resources/css/ccg-nav-fit.css");
    assert.match(core, /\["Merch", "https:\/\/cheeky-commodore-gamer-shop\.fourthwall\.com\/en-gbp"\]/);
    assert.match(fit, /PINNED_MORE_LABELS = new Set\(\[[^\]]*"merch"/);
    assert.ok(navCss.includes('a[href="' + SHOP + '"]'));
    assert.match(core, /link\.target = "_blank";\s*link\.rel = "noopener noreferrer";/);
    assert.match(fit, /link\.target = "_blank";\s*link\.rel = "noopener noreferrer";/);
    assert.ok(home.includes('href="' + SHOP + '" class="ccg-nav__link" target="_blank"'));
});

test("merchandise styles are home-only and do not change archive thumbnails", () => {
    const css = read("resources/css/home-fourthwall-merch.css");
    assert.match(css, /html\[data-ccg-page="home"\] \.home-merch-promo/);
    assert.doesNotMatch(css, /ccg-card|home-archive-route|home-video-card|object-fit|position:\s*fixed/);
    assert.doesNotMatch(css, /@import|url\(|animation:/i);
});
