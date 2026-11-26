import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

test("home discovery dashboard exposes the primary archive routes", () => {
    const html = read("home.html");

    assert.match(html, /class="home-archive-launchpad"/);
    [
        "/games/",
        "/games/discover/",
        "/games/genres/",
        "/games/publishers/",
        "/games/collections/",
        "/music/",
        "/zzap64/",
        "/games/collections/retro-specials.html"
    ].forEach((href) => {
        assert.ok(html.includes('href="' + href + '"'), "missing home archive route: " + href);
    });
});

test("home discovery dashboard stays compact without taking over thumbnail rendering", () => {
    const css = read("resources/css/home.css");
    const marker = "HOME ARCHIVE DISCOVERY DASHBOARD";
    const start = css.indexOf(marker);

    assert.notEqual(start, -1, "home archive dashboard CSS marker is missing");

    const dashboardCss = css.slice(start);
    assert.match(dashboardCss, /\.home-archive-launchpad/);
    assert.match(dashboardCss, /repeat\(4, minmax\(0, 1fr\)\)/);
    assert.match(dashboardCss, /repeat\(2, minmax\(0, 1fr\)\)/);
    assert.doesNotMatch(dashboardCss, /object-fit\s*:/i);
    assert.doesNotMatch(dashboardCss, /^\s*transform\s*:/im);
});

test("home dashboard release advances the public code cache", () => {
    const sw = read("service-worker.js");
    assert.match(sw, /CODE_CACHE_VERSION = "20\d{2}-\d{2}-\d{2}-public-code-v[0-9]+"/);
});


test("featured gameplay video buttons deterministically start the embed", () => {
    const js = read("js/home-dynamic.js");

    assert.match(js, /playButton\.addEventListener\("click", startPlayback\)/);
    assert.match(js, /autoplay: "1"/);
    assert.match(js, /iframe\.dataset\.autoplayRequested = "true"/);
    assert.match(js, /card\.classList\.add\("is-playing"\)/);
    assert.match(js, /playVideo\(player\)/);
    assert.doesNotMatch(js, /if \(hasVideo && iframe && isMobileDevice\)/);
});

test("home mobile carousel position follows actual scroll and clamps both ends", () => {
    const source = read("js/home-dynamic.js");
    const fn = source.match(/function carouselIndex\(positions, left, max\) \{[\s\S]*?\n    \}/)?.[0];
    assert.ok(fn);
    const index = new Function(fn + "; return carouselIndex;")();
    for (const [positions,left,max,want] of [[[],0,0,0],[[0,100,180],0,180,0],[[0,100,180],95,180,1],[[0,100,180],179,180,2],[[0,100,180],55,180,1],[[0,0],0,0,0],[[0,50,50],50,50,2]]) assert.equal(index(positions,left,max),want);
    const css = read("resources/css/home-mobile-launchpad.css");
    assert.match(css, /padding-bottom: 58px/);
    assert.match(css, /grid-template-columns: 44px minmax\(0, 1fr\) 44px/);
    assert.match(source, /grid\.addEventListener\("scroll", queue, \{ passive: true \}\)/);
    assert.match(source, /prefers-reduced-motion: reduce/);
});
