import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (path) => fs.readFileSync(path, "utf8");
const globalJs = read("js/ccg-global.js");
const start = globalJs.indexOf('    if (document.documentElement.getAttribute("data-ccg-page") === "single-game") {');
const end = globalJs.indexOf("    /* ======================================================", start);
assert.ok(start > 0 && end > start, "Shared request code remains self-contained");
const fixture = globalJs.slice(start, end);

function setup(fetch, page = "single-game") {
    const window = { ccgGetSiteRoot: () => "/" };
    const document = { documentElement: { getAttribute: () => page } };
    vm.runInNewContext(fixture, { window, document, fetch });
    return window;
}

test("single game shares one full catalogue transfer and one parse", async () => {
    let requests = 0;
    let parses = 0;
    const window = setup((url, options) => {
        requests++;
        assert.equal(url, "/games/games.json");
        assert.equal(options.cache, "no-store");
        return Promise.resolve({ ok: true, json: () => { parses++; return Promise.resolve([{ slug: "wasteland" }]); } });
    });
    const [a, b, c] = await Promise.all([
        window.ccgLoadSharedGames(), window.ccgLoadSharedGames(), window.ccgLoadSharedGames()
    ]);
    assert.equal(requests, 1);
    assert.equal(parses, 1);
    assert.equal(a, b);
    assert.equal(b, c);
    assert.equal(a[0].slug, "wasteland");
});

test("failed first request does not permanently poison catalogue load", async () => {
    let attempts = 0;
    const window = setup(() => {
        attempts++;
        return Promise.resolve(attempts === 1
            ? { ok: false, status: 503 }
            : { ok: true, json: () => Promise.resolve([{ slug: "1942" }]) });
    });
    await assert.rejects(window.ccgLoadSharedGames());
    assert.equal((await window.ccgLoadSharedGames())[0].slug, "1942");
    assert.equal(attempts, 2);
});

test("catalogue helper is single-game-only and legacy fallbacks remain", () => {
    assert.equal(setup(() => { throw Error("Should not fetch"); }, "genre-index").ccgLoadSharedGames, undefined);
    const game = read("js/load-single-game.js");
    const smart = read("js/ccg-smart-discovery.js");
    const archive = read("js/ccg-archive-schema.js");
    assert.match(game, /await window\.ccgLoadSharedGames\(\)/);
    assert.match(game, /for \(const url of urls\)/);
    assert.match(smart, /window\.ccgLoadSharedGames\(\)/);
    assert.match(smart, /fetch\(DATA_PATH, \{ cache: "force-cache" \}\)/);
    assert.match(archive, /window\.ccgLoadSharedGames\(\)/);
    assert.match(archive, /fetch\(GAME_DATA_PATH, \{ cache: "force-cache" \}\)/);
});
