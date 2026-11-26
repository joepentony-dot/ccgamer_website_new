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

test("home community rating summary uses genuine 1–10 data and distinguishes empty from invalid", () => {
    const source = read("js/ccg-home-community.js");
    const fn = source.match(/function ratingSummary\(row\) \{[\s\S]*?\n  \}/)?.[0];
    assert.ok(fn);
    const summary = new Function(fn + "; return ratingSummary;")();
    for (const [input,want] of [[{"rating_count":2,"average_rating":8.5},{"count":2,"average":8.5}],[{"rating_count":"1","average_rating":"10"},{"count":1,"average":10}],[{"rating_count":0,"average_rating":0},{"count":0,"average":null}],[null,null],[{"rating_count":2,"average_rating":11},null],[{"rating_count":-1,"average_rating":5},null],[{"rating_count":1.2,"average_rating":8},null],[{"rating_count":2,"average_rating":null},null],[{"rating_count":1,"average_rating":0},null]]) assert.deepEqual(summary(input),want);
    assert.match(source, /supabase\.rpc\("ccg_game_rating_summary"/);
    assert.match(source, /Reviews are temporarily unavailable/);
    assert.match(source, /#ccg-community-game-title/);
    assert.doesNotMatch(source, /\.from\("ratings"\)/);
});

test("refined homepage keeps all canonical routes and prepaint Pulse below archive discovery", () => {
    const home = read("home.html");
    const hero = home.indexOf('class="home-hero home-hero--streamlined"');
    const archive = home.indexOf('class="home-archive-launchpad"');
    const pulse = home.indexOf('data-ccg-static-pulse="true"');
    const videos = home.indexOf('class="home-featured-videos"');
    const originals = home.indexOf('class="home-mobile-originals"');
    const community = home.indexOf('id="homeCommunityLatest"');
    const hardware = home.indexOf('class="ccg-thea1200-home"');
    const merch = home.indexOf('class="home-merch-promo"');
    assert.ok(hero < archive && archive < pulse && pulse < videos && videos < originals && originals < community && community < hardware && hardware < merch);
    assert.match(home, /<\/section>\n<script src="\/js\/ccg-archive-pulse-randomizer\.js"><\/script>/);
    assert.match(home, /class="home-mobile-originals__links"/);
    assert.match(home, /href="\/arcade\/c64-dungeon-carnage\/"/);
    assert.match(home, /href="\/choose-your-own-adventure\/"/);
    assert.equal((home.match(/https:\/\/cheeky-commodore-gamer-shop\.fourthwall\.com\/en-gbp/g)||[]).length,1);
});

test("top-rated page uses canonical public 1–10 ratings and complete bounded reads", () => {
    const source = read("resources/js/community/community-api.js");
    const fn = source.match(/function aggregatePublicRatings\(rows, limit\) \{[\s\S]*?\n\}/)?.[0];
    assert.ok(fn);
    const aggregate = new Function(fn + ";return aggregatePublicRatings;")();
    const rows = [{"game_key":"z-game","rating":7},{"game_key":"a-game","rating":7},{"game_key":"b-game","rating":6},{"game_key":"b-game","rating":8},{"game_key":"best-game","rating":9},{"game_key":"low-game","rating":3}];
    assert.deepEqual(aggregate(rows,30),[{"game_slug":"best-game","avg_rating":9,"rating_count":1},{"game_slug":"b-game","avg_rating":7,"rating_count":2},{"game_slug":"a-game","avg_rating":7,"rating_count":1},{"game_slug":"z-game","avg_rating":7,"rating_count":1},{"game_slug":"low-game","avg_rating":3,"rating_count":1}]);
    assert.deepEqual(aggregate([],30),[]);
    assert.equal(aggregate(rows,2).length,2);
    for (const row of [{game_key:"../bad",rating:5},{game_key:"a",rating:11},{game_key:"a",rating:0},{game_key:"a",rating:3.5}]) assert.throws(()=>aggregate([row],30));
    const top = source.slice(source.indexOf("export async function listTopRated("),source.indexOf("export async function listActivity("));
    assert.match(top,/\.from\('ratings'\)/);
    assert.match(top,/\.select\('game_key,rating', \{count: 'exact'\}\)/);
    assert.match(top,/rows\.length === expected/);
    assert.doesNotMatch(top,/game_rating_stats|user_id|profile_id/);
    assert.match(read("resources/js/community/top-rated-page.js"),/\/10 · /);
    assert.match(read("js/ccg-home-community.js"),/\/community\/top-rated\.html/);
});

test("desktop More handles a real first click before the deferred fit", () => {
    const source = read("js/ccg-nav-fit.js");
    const start = source.indexOf("    function bindMoreControls(");
    const end = source.indexOf("    function measureFitBounds(", start);
    assert.ok(start >= 0 && end > start);
    const bindSource = source.slice(start, end);
    for (const [scenario, expected] of Object.entries({
        first: [1, 1, 0], open: [1, 0, 1], mobile: [0, 0, 0],
        "no-links": [1, 0, 0], disabled: [1, 0, 0]
    })) {
        const handlers = [];
        let fits = 0, opens = 0, closes = 0;
        const menu = { hidden: scenario !== "open", links: scenario === "open" ? 13 : 0 };
        const nav = { querySelector: () => menu };
        const wrap = {};
        class Element {
            closest(selector) {
                return selector === ".ccg-nav" ? nav : selector === ".ccg-nav__more" ? wrap : this;
            }
        }
        const toggle = new Element();
        toggle.disabled = false;
        const header = { dataset: {}, contains: () => true, addEventListener(type, fn, capture) {
            if (type === "click" && capture === true) handlers.push(fn);
        }};
        const document = { addEventListener() {} };
        const bind = new Function("document", "Element", "isDesktop", "fitNavigation",
            "menuHasOverflowLinks", "openMore", "closeMore", bindSource + "\nreturn bindMoreControls;")(
            document, Element, () => scenario !== "mobile",
            () => { fits++; menu.links = scenario === "no-links" ? 0 : 13; toggle.disabled = scenario === "disabled"; },
            value => value.links > 0, () => { opens++; }, () => { closes++; }
        );
        bind(header);
        assert.equal(handlers.length, 1);
        handlers[0]({ target: toggle, preventDefault() {}, stopImmediatePropagation() {} });
        assert.deepEqual([fits, opens, closes], expected, scenario);
    }
    assert.match(source, /&& \(!desktop \|\| menuHasOverflowLinks\(menu\)\)/);
});
