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
