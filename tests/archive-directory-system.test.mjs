import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

test("shared archive directory stylesheet covers archive families without synthetic scrolling", () => {
    const css = read("resources/css/ccg-archive-directory.css");

    assert.match(css, /body\[data-ccg-directory\]/);
    assert.match(css, /publisher-index/);
    assert.match(css, /genre-index/);
    assert.match(css, /collection-index/);
    assert.match(css, /music-index/);
    assert.match(css, /data-ccg-directory="genre-record"\] \.ccg-genre-grid/);
    assert.match(css, /data-collection="Retro Specials"/);
    assert.match(css, /data-collection="Retro Events"/);
    assert.match(css, /data-collection="Amiga Demo Music"/);
    assert.match(css, /position:\s*sticky/);
    assert.doesNotMatch(css, /scroll-behavior:\s*smooth/i);
});

test("publisher runtime adds dense directory shell and alphabet wayfinding", () => {
    const js = read("js/publisher-pages.js");

    assert.match(js, /ccg-archive-directory\.css/);
    assert.match(js, /enableArchiveDirectory\("publisher-index"\)/);
    assert.match(js, /enableArchiveDirectory\("publisher-record"\)/);
    assert.match(js, /ensurePublisherAlphabetNav/);
    assert.match(js, /dataset\.publisherInitial/);
    assert.match(js, /publisher-letter-/);
    assert.match(js, /clone\.removeAttribute\("id"\)/);
});

test("category and music runtimes opt into the shared directory shell", () => {
    const category = read("js/ccg-category-omega.js");
    const music = read("js/ccg-music-navigation.js");
    const composerRuntime = read("js/music-composer-pages.js");

    assert.match(category, /DIRECTORY_CSS_PATH/);
    assert.match(category, /ccgDirectory = kind \+ "-index"/);
    assert.match(category, /ccgDirectory = kind \+ "-record"/);
    assert.match(music, /ccg-archive-directory\.css/);
    assert.match(music, /music-index/);
    assert.match(music, /music-record/);
    assert.match(composerRuntime, /ccg-archive-directory\.css/);
    assert.match(composerRuntime, /enableArchiveDirectory/);
});

test("public code cache includes the shared directory stylesheet", () => {
    const sw = read("service-worker.js");

    assert.match(sw, /CODE_CACHE_VERSION = "2026-09-25-public-code-v[0-9]+"/);
    assert.match(sw, /\/resources\/css\/ccg-archive-directory\.css/);
});
