import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { collectRoles } = require("../scripts/mark-rerelease-publishers.js");

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
    assert.match(
        css,
        /body\[data-ccg-directory\^="publisher"\] \.ccg-publishers-tools\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*0;/,
        "publisher search/filter controls should pin to the top of the viewport"
    );
    assert.match(
        css,
        /body\[data-ccg-directory="publisher-index"\] #publisherGrid > \[data-publisher-card\]\s*\{[\s\S]*?scroll-margin-top:\s*118px;/,
        "publisher alphabet jumps should account for the sticky tools without the old header gap"
    );
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

test("publisher index shows focused search first and keeps complete directory available", () => {
    const js = read("js/publisher-pages.js");
    const css = read("resources/css/publishers.css");
    const html = read("games/publishers/index.html");

    const publisherLinks = Array.from(html.matchAll(/class="ccg-publisher-card__link" href="([^"]+)"/g), (match) => match[1]);
    const unique = new Set(publisherLinks);
    assert.ok(publisherLinks.length >= 200, "the complete publisher listing remains in static HTML");
    assert.ok(unique.size >= 200, "all unique publisher routes remain available without JavaScript");
    assert.match(html, /id="publisherSearchInput"/);
    assert.match(html, /id="publisherGrid"/);

    assert.match(js, /archiveSection\?\.closest\("\[data-publisher-directory-disclosure\]"\)/);
    assert.match(html, /<details class="ccg-publisher-directory-disclosure" data-publisher-directory-disclosure>/);
    assert.match(html, /<summary class="ccg-publisher-directory-disclosure__summary">Browse the other 194 publishers A–Z<\/summary>/);
    assert.match(html, /<h2 id="all-publishers-title">Other Publishers<\/h2>/);
    assert.match(read("scripts/generate-publisher-pages.js"), /Browse the other \$\{remainingGroups\.length\} publishers A–Z/);
    assert.match(js, /ensurePublisherAlphabetNav\(archiveCards, directory\)/);
    assert.match(js, /directory\.insertBefore\(alphabetNav, archiveSection\)/);
    assert.match(js, /if \(directory\) directory\.open = Boolean\(query\) \|\| manuallyExpanded/);
    assert.match(js, /directory\?\.addEventListener\("toggle"/);
    assert.match(js, /if \(normalize\(search\?\.value\)\) event\.preventDefault\(\)/);
    assert.match(js, /query \? renderSearchResults\(query\) : renderDirectory\(\)/);
    assert.match(js, /" publishers found"/);
    assert.match(js, /" publishers available"/);

    assert.match(css, /\.ccg-publisher-directory-disclosure__summary:focus-visible/);
    assert.match(css, /\.ccg-publisher-directory-disclosure\[open\]/);
    assert.doesNotMatch(css, /#publisherGrid\s*\{[^}]*display:\s*none/s, "the static directory is not hidden with CSS");
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

test("publisher regeneration preserves every referenced re-release role badge", () => {
    const workflow = read(".github/workflows/publisher-archives.yml");
    const generatorStep = workflow.indexOf("run: node scripts/generate-publisher-pages.js");
    const logoStep = workflow.indexOf("run: node scripts/apply-publisher-logos.js");
    const roleStep = workflow.indexOf("run: node scripts/mark-rerelease-publishers.js");
    const seoStep = workflow.indexOf("run: node scripts/audit-publisher-seo-evidence-tolerant.js");
    assert.ok(generatorStep >= 0 && logoStep > generatorStep && roleStep > logoStep && seoStep > roleStep,
        "regeneration must restore publisher re-release badges after logos and before final audits");
    assert.match(workflow, /node --check scripts\/mark-rerelease-publishers\.js/);

    const publisherIndex = read("games/publishers/index.html");
    const roles = collectRoles(JSON.parse(read("games/games.json")));
    assert.ok(roles.size > 0, "source catalogue includes re-release-only publisher credits");
    let verified = 0;
    for (const slug of roles) {
        const href = 'href="/games/publishers/' + slug + '/"';
        const start = publisherIndex.indexOf(href);
        if (start < 0) continue;
        const end = publisherIndex.indexOf("</a>", start);
        assert.ok(end > start, "re-release publisher card has closing anchor: " + slug);
        assert.match(publisherIndex.slice(start, end), /ccg-publisher-role-badge/,
            "re-release role retained on publisher card: " + slug);
        const page = "games/publishers/" + slug + "/index.html";
        if (fs.existsSync(path.join(ROOT, page))) {
            assert.match(read(page), /ccg-publisher-role-badge/,
                "re-release role retained on publisher archive page: " + slug);
        }
        verified += 1;
    }
    assert.ok(verified > 0, "found publisher routes to validate re-release labels");
});

test("publisher archive generator and refresh workflow preserve social image dimensions and genre enrichment", () => {
    const generator = read("scripts/generate-publisher-pages.js");
    const workflow = read(".github/workflows/publisher-archives.yml");
    const index = read("games/publishers/index.html");
    const example = read("games/publishers/ocean-software/index.html");

    for (const item of [generator, index, example]) {
        assert.match(item, /<meta property="og:image:height" content="630">/);
        assert.match(item, /<meta property="og:image:width" content="1200">/);
    }
    const history = workflow.indexOf("run: node scripts/materialize-publisher-histories-tolerant.js");
    const link = workflow.indexOf("run: node scripts/link-publisher-strength-genres.js");
    const audit = workflow.indexOf("run: node scripts/audit-publisher-seo-evidence-tolerant.js");
    assert.ok(history >= 0 && link > history && audit > link,
        "publisher genre-strength links must be restored between history materialisation and output validation");
    assert.match(workflow, /node --check scripts\/link-publisher-strength-genres\.js/);
    assert.match(example, /ccg-publisher-history__genre-link/,
        "canonical genre strength links present on historical publisher archive");
});

test("public code cache includes the shared directory stylesheet", () => {
    const sw = read("service-worker.js");

    assert.match(sw, /CODE_CACHE_VERSION = "20\d{2}-\d{2}-\d{2}-public-code-v[0-9]+"/);
    assert.match(sw, /\/resources\/css\/ccg-archive-directory\.css/);
});
