import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { collectRoles } = require("../scripts/mark-rerelease-publishers.js");
const { publisherIndexCountSuffix, publisherGameCountSuffix } = require("../js/publisher-pages.js");

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
    assert.match(html, /id="publisherVisibleCount">\d+<\/strong> publishers available/, "default static count describes total available, not expanded cards");
    assert.match(read("scripts/generate-publisher-pages.js"), /id="publisherVisibleCount">\$\{groups\.length\}<\/strong> publishers available/,
        "authoritative publisher generator preserves honest no-JS count text");

    assert.match(js, /archiveSection\?\.closest\("\[data-publisher-directory-disclosure\]"\)/);
    assert.match(html, /<details class="ccg-publisher-directory-disclosure" data-publisher-directory-disclosure>/);
    const directoryStart = html.indexOf('id="publisherGrid"');
    const directoryEnd = html.indexOf('id="publisherEmptyState"', directoryStart);
    assert.ok(directoryStart >= 0 && directoryEnd > directoryStart, "directory cards have a defined generated section");
    const remainingCount = (html.slice(directoryStart, directoryEnd).match(/\bdata-publisher-card\b/g) || []).length;
    const featuredCount = (html.match(/<article class="ccg-publisher-card ccg-publisher-card--featured" data-publisher-card/g) || []).length;
    assert.ok(remainingCount > 0, "remaining publisher directory is populated");
    assert.equal(remainingCount + featuredCount, unique.size, "featured and remaining static cards cover every unique publisher");
    assert.ok(html.includes(`<summary class="ccg-publisher-directory-disclosure__summary">Browse the other ${remainingCount} publishers A–Z</summary>`),
        "summary must derive its count from the currently generated nonfeatured cards");
    assert.match(html, /<h2 id="all-publishers-title">Other Publishers<\/h2>/);
    assert.match(read("scripts/generate-publisher-pages.js"), /Browse the other \$\{remainingGroups\.length\} publishers A–Z/);
    assert.match(js, /ensurePublisherAlphabetNav\(archiveCards, directory\)/);
    assert.match(js, /directory\.insertBefore\(alphabetNav, archiveSection\)/);
    assert.match(js, /if \(directory\) directory\.open = Boolean\(query\) \|\| manuallyExpanded/);
    assert.match(js, /directory\?\.addEventListener\("toggle"/);
    assert.match(js, /if \(normalize\(search\?\.value\)\) event\.preventDefault\(\)/);
    assert.match(js, /query \? renderSearchResults\(query\) : renderDirectory\(\)/);
    assert.match(js, /publisherIndexCountSuffix\(visible, Boolean\(query\)\)/);
    assert.match(js, /prepareLiveCount\(count\)/);

    assert.match(css, /\.ccg-publisher-directory-disclosure__summary:focus-visible/);
    assert.match(css, /\.ccg-publisher-directory-disclosure\[open\]/);
    assert.doesNotMatch(css, /#publisherGrid\s*\{[^}]*display:\s*none/s, "the static directory is not hidden with CSS");
});

test("publisher search and game counts use singular labels and announce updates", () => {
    assert.equal(publisherIndexCountSuffix(0, false), " publishers available");
    assert.equal(publisherIndexCountSuffix(1, false), " publisher available");
    assert.equal(publisherIndexCountSuffix(1, true), " publisher found");
    assert.equal(publisherIndexCountSuffix(2, true), " publishers found");
    assert.equal(publisherGameCountSuffix(0), " games shown");
    assert.equal(publisherGameCountSuffix(1), " game shown");
    assert.equal(publisherGameCountSuffix(2), " games shown");
    const runtime = read("js/publisher-pages.js");
    const generator = read("scripts/generate-publisher-pages.js");
    assert.match(runtime, /publisherGameCountSuffix\(visible\)/);
    assert.match(runtime, /container\.setAttribute\("role", "status"\)/);
    assert.match(runtime, /container\.setAttribute\("aria-live", "polite"\)/);
    assert.match(runtime, /container\.setAttribute\("aria-atomic", "true"\)/);
    assert.match(generator, /group\.count === 1 \? "game" : "games"/);
    assert.equal((generator.match(/role="status" aria-live="polite" aria-atomic="true"/g) || []).length, 2);
});

test("publisher rendered audit follows generated directory totals, not fixed catalogue numbers", () => {
    const audit = read("scripts/audit-responsive-browser.js");
    assert.match(audit, /initial\.fullLinkCount !== expectedPublisherCount/);
    assert.match(audit, /initial\.otherDirectoryCount !== expectedDirectoryCount/);
    assert.match(audit, /restored\.originalCards !== expectedDirectoryCount/);
    assert.match(audit, /indexHtml\.slice\(gridStart, gridEnd\)\.match/);
    assert.doesNotMatch(audit, /(?:fullLinkCount|otherDirectoryCount|originalCards)\s*<\s*(?:190|206)/);
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
    assert.equal((workflow.match(/^      - "scripts\/link-publisher-strength-genres\.js"$/gm) || []).length, 2,
        "genre-strength linker changes must trigger publisher refresh on push and pull request");
    assert.match(example, /ccg-publisher-history__genre-link/,
        "canonical genre strength links present on historical publisher archive");
});

test("public code cache includes the shared directory stylesheet", () => {
    const sw = read("service-worker.js");

    assert.match(sw, /CODE_CACHE_VERSION = "20\d{2}-\d{2}-\d{2}-public-code-v[0-9]+"/);
    assert.match(sw, /\/resources\/css\/ccg-archive-directory\.css/);
});

test("developer index reduces default clutter without dropping a credited route", () => {
    const html = read("games/developers/index.html");
    const generator = read("scripts/generate-developer-pages.js");
    const runtime = read("js/developer-pages.js");
    const css = read("resources/css/developers.css");

    const links = [...html.matchAll(/<a class="ccg-developer-card [^"]*"\s+href="\/games\/developers\/([^/]+)\//g)]
        .map((match) => match[1]);
    const totalMatch = html.match(/id="developerVisibleCount">(\d+)<\/strong> developers available/);
    assert.ok(totalMatch, "default static count describes available credits, not expanded cards");
    const expected = Number(totalMatch[1]);
    assert.equal(links.length, expected, "every developer appears exactly once as a static card");
    assert.equal(new Set(links).size, expected, "the featured set and directory never duplicate a route");

    const featured = [...html.matchAll(/<a class="ccg-developer-card ccg-developer-card--featured"\s+href="\/games\/developers\/([^/]+)\//g)]
        .map((match) => match[1]);
    const directoryStart = html.indexOf('id="developerGrid"');
    const directoryEnd = html.indexOf('id="developerEmptyState"', directoryStart);
    assert.ok(directoryStart > 0 && directoryEnd > directoryStart, "other credits have a static crawlable directory");
    const other = [...html.slice(directoryStart, directoryEnd).matchAll(/<a class="ccg-developer-card [^"]*"\s+href="\/games\/developers\/([^/]+)\//g)]
        .map((match) => match[1]);
    assert.ok(featured.length > 0 && other.length > 0);
    assert.equal(featured.length + other.length, expected);
    assert.ok(html.includes(`Browse the other ${other.length} developers A–Z</summary>`));
    assert.match(html, /<details class="ccg-developers-section ccg-developers-directory" id="developerDirectory" data-developer-directory-disclosure>/);
    assert.match(html, /<h2 id="all-developers-title">Other Developers<\/h2>/);
    assert.match(html, /id="developerSearchInput"/);
    assert.match(generator, /new Set\(represented\.map\(\(group\) => group\.slug\)\)/);
    assert.match(generator, /groups\.filter\(\(group\) => !representedSlugs\.has\(group\.slug\)\)/);
    assert.match(generator, /Browse the other \$\{remainingGroups\.length\} developers A–Z/);
    assert.match(runtime, /data-developer-search-result/);
    assert.match(runtime, /allCards\.filter\(\(card\) => matches\(card, query\)\)/);
    assert.match(runtime, /directory\.open = hasSearch \|\| system !== "all" \|\| manuallyExpanded/);
    assert.match(runtime, /event\.preventDefault\(\)/);
    assert.match(css, /\.ccg-developers-directory > summary:focus-visible/);
    assert.match(css, /\.ccg-developers-directory > section/);
    assert.doesNotMatch(css, /#developerGrid\s*\{[^}]*display:\s*none/s);
});


test("developer index announces accurate singular/plural live search and filter counts", () => {
    const runtime = read("js/developer-pages.js");
    const marker = '    function setPressed(buttons, activeValue, attributeName) {';
    assert.ok(runtime.includes(marker), "the live-count formatter is exercised from actual runtime source");
    const sandbox = { document: { readyState: "loading", addEventListener() {} } };
    vm.runInNewContext(
        runtime.replace(marker, '    globalThis.__testDeveloperCountSuffix = developerCountSuffix;\\n\\n' + marker).replace(/\\n/g, "\n"),
        sandbox
    );
    const format = sandbox.__testDeveloperCountSuffix;
    assert.equal(typeof format, "function");
    for (const [count, found, available] of [
        [0, " developers found", " developers available"],
        [1, " developer found", " developer available"],
        [2, " developers found", " developers available"],
        [47, " developers found", " developers available"]
    ]) {
        assert.equal(format(count, true), found);
        assert.equal(format(count, false), available);
    }
    const liveRegion = /<p class="ccg-developers-visible-count" role="status" aria-live="polite" aria-atomic="true">/;
    assert.match(read("games/developers/index.html"), liveRegion);
    assert.match(read("scripts/generate-developer-pages.js"), liveRegion);
    assert.ok(runtime.includes("count.parentElement.lastChild.nodeValue = developerCountSuffix(visible, hasSearch);"));
});

test("developer index keeps complete static A-Z links and opens bookmarked system results", () => {
    const html = read("games/developers/index.html");
    const generator = read("scripts/generate-developer-pages.js");
    const js = read("js/developer-pages.js");
    const css = read("resources/css/developers.css");

    const detailsTag = /<details class="ccg-developers-section ccg-developers-directory" id="developerDirectory" data-developer-directory-disclosure>/;
    assert.match(html, detailsTag, "the native directory is closed before JS and is keyboard accessible");
    assert.match(generator, detailsTag, "the authoritative generator preserves the native disclosure");
    const summary = html.match(/<summary>Browse the other (\d+) developers A–Z<\/summary>/);
    assert.ok(summary, "the summary accurately counts nonfeatured developers");
    const directoryStart = html.indexOf('<div class="ccg-developer-grid" id="developerGrid">');
    const directoryEnd = html.indexOf('id="developerEmptyState"', directoryStart);
    assert.ok(directoryStart >= 0 && directoryEnd > directoryStart, "directory links exist in static HTML");
    const otherHrefs = Array.from(html.slice(directoryStart, directoryEnd).matchAll(/href="(\/games\/developers\/[^"]+\/)"(?:\s|>)/g), (match) => match[1]);
    assert.equal(otherHrefs.length, Number(summary[1]), "every nonfeatured developer is available without JavaScript");

    const featuredStart = html.indexOf('aria-labelledby="represented-developers-title"');
    const featuredEnd = html.indexOf("</section>", featuredStart);
    assert.ok(featuredStart >= 0 && featuredEnd > featuredStart, "featured credits remain visible");
    const featuredHrefs = Array.from(html.slice(featuredStart, featuredEnd).matchAll(/href="(\/games\/developers\/[^"]+\/)"(?:\s|>)/g), (match) => match[1]);
    const total = Number(html.match(/id="developerVisibleCount">(\d+)<\/strong> developers available/)?.[1]);
    assert.ok(Number.isInteger(total) && total > 0, "the static total remains available");
    assert.equal(featuredHrefs.length + otherHrefs.length, total, "featured and other links cover the full archive");
    assert.equal(new Set([...featuredHrefs, ...otherHrefs]).size, total, "no credited route is duplicated or lost");

    assert.match(js, /readInitialSystem\(\["all", "c64", "amiga"\]\)/,
        "bookmarked C64/Amiga system filters are read on initialisation");
    assert.match(js, /directory\.open = hasSearch \|\| system !== "all" \|\| manuallyExpanded/,
        "active search and bookmarked system filters open the directory");
    assert.match(js, /event\.preventDefault\(\)/,
        "the disclosure cannot be closed while filtered results are active");
    assert.match(css, /\.ccg-developers-directory > summary:focus-visible/,
        "native directory disclosure keeps visible keyboard focus");
});

test("Zzap archive quick links target distinct preserved archive sections", () => {
    const html = read("zzap64/index.html");
    const css = read("resources/css/zzap64-awards.css");
    const targets = [
        ["zzap-award-videos", "zzap-video-years-title", "zzapYearCards"],
        ["zzap-award-search", "zzap-index-title", "zzapAwardsGrid"],
        ["zzap-additional-reviews", "zzap-all-reviews-title", "zzapReviewGrid"]
    ];

    assert.match(html, /<nav class="zzap-archive__jump-nav" aria-label="Jump to Zzap!64 archive section">/,
        "jump destinations must be announced as navigation");
    for (const [id, headingId, originalGrid] of targets) {
        assert.equal((html.match(new RegExp('href="#' + id + '"', 'g')) || []).length, 1,
            "one clear quick-nav entry exists for " + id);
        assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1,
            "one stable scroll target exists for " + id);
        assert.ok(html.includes('id="' + headingId + '"'), "existing heading contract survives: " + headingId);
        assert.ok(html.includes('id="' + originalGrid + '"'), "existing runtime grid survives: " + originalGrid);
    }
    assert.match(html, /id="zzap-video-years-title" class="zzap-archive__section-title"/,
        "year videos use a visible heading");
    assert.match(html, /id="zzap-index-title" class="zzap-archive__section-title"/,
        "award search uses a visible heading");
    assert.match(css, /\.zzap-archive__destination\s*\{\s*scroll-margin-top:\s*calc\(var\(--ccg-header-height, 92px\) \+ 16px\);/,
        "anchor targets account for fixed navigation height");
    assert.match(css, /\.zzap-archive__jump-nav a:focus-visible/,
        "keyboard navigation gets an obvious focus indication");
});

test("Music Hub composer letters have one delegated controller and preserve keyboard focus", () => {
    const pages = read("js/music-composer-pages.js");
    const utils = read("js/music-composer-utils.js");
    const page = read("music/index.html");
    const start = pages.indexOf("function renderHubAccordion(");
    const end = pages.indexOf("async function renderHubCards(", start);
    assert.ok(start >= 0 && end > start, "composer accordion renderer exists");
    const renderer = pages.slice(start, end);

    assert.match(utils, /accordion\.addEventListener\("click", \(event\) => \{/,
        "the existing composer utility delegates letter clicks to the accordion");
    assert.match(utils, /setMusicHubAccordionState\(group, nextOpen, true\)/,
        "the shared controller persists user-selected open state");
    assert.doesNotMatch(renderer, /\.addEventListener\("click"/,
        "the composer renderer must not register a second, conflicting click handler");
    assert.match(renderer, /window\.CCGMusicHubOmega\?\.refreshAccordion\?\.\(\)/,
        "the shared controller must be rebound after filter redraws when needed");
    assert.match(renderer, /group\.dataset\.ccgUserOpen === "true"/,
        "previously selected groups must be read before a search redraw");
    assert.match(renderer, /openSet\.add\(letter\)/,
        "a visible, manually expanded letter remains open");
    assert.match(renderer, /openSet\.delete\(letter\)/,
        "a visible, manually collapsed letter remains closed");
    assert.doesNotMatch(renderer, /openSet = new Set\(existingGroups/,
        "search filtering must not discard user choices for temporarily hidden letters");
    assert.match(renderer, /data-ccg-user-open="/,
        "user open state must survive redraw in rendered group markup");
    assert.match(renderer, /const shouldOpen = hasQuery \|\| openSet\.has\(letter\)/,
        "matching search letter groups stay expanded");
    assert.match(page, /id="composer-discovery-accordion"/);
    assert.match(page, /class="composer-accordion__header" type="button" aria-expanded=/);
});

test("Games Archive combines title search with the selected release year", () => {
    const source = read("js/games-library.js");
    const page = read("games/index.html");
    const start = source.indexOf("function setupSearch()");
    const end = source.indexOf("function setupSystemFilter()", start);
    assert.ok(start >= 0 && end > start, "game search binding exists");
    const searchBinding = source.slice(start, end);
    assert.match(searchBinding, /CCG_ACTIVE_QUERY = normalizeSearchText\(raw\)/,
        "search terms must still be normalised");
    assert.match(searchBinding, /applyActiveFilters\(\{ preserveScroll: true \}\)/,
        "typing and clearing search both rebuild the filtered index");
    assert.doesNotMatch(searchBinding, /setYearFilterSpan\("all"/,
        "search input must not silently reset a selected release year");
    assert.match(source, /function getFilteredGames\(\)[\s\S]*?matchesYearRange\(game\.year\)/,
        "year filtering must remain part of the title-search eligibility check");
    assert.match(source, /function getFilteredGames\(\)[\s\S]*?matchesSearchQuery\(game, queryData\)/,
        "normal title matching must still operate inside the filtered archive");
    assert.match(source, /yearSelect\.addEventListener\("change"/,
        "the visitor must remain able to change or reset the year explicitly");
    assert.match(page, /id="gamesSearchInput"/);
    assert.match(page, /id="gamesYearSelect"/);
});

test("Games Archive free-text search finds actual release years alongside titles", () => {
    const source = read("js/games-library.js");
    const games = JSON.parse(read("games/games-search.json"));
    const library = new Function("window", "document",
        source + "\nreturn { getSearchQueryData, matchesSearchQuery };"
    )({ matchMedia: () => ({ matches: false }), innerWidth: 1440 }, { addEventListener() {} });
    const find = (term) => games.filter(game =>
        library.matchesSearchQuery(game, library.getSearchQueryData(term)));

    for (const year of [1986, 1987]) {
        const expected = games.filter(game => Number(game.year) === year).map(game => game.slug).sort();
        const actual = find(String(year)).map(game => game.slug).sort();
        assert.ok(expected.length > 0, "source catalogue contains " + year + " games");
        assert.deepEqual(actual, expected, "free-text year search returns the actual " + year + " catalogue");
    }

    const ace = games.find(game => game.slug === "ace-of-aces");
    assert.ok(ace && Number(ace.year) === 1986, "fixture is an actual 1986 game");
    assert.ok(find("ace of aces").some(game => game.slug === ace.slug),
        "existing title search still works");
    assert.ok(find("1986 ace").some(game => game.slug === ace.slug),
        "year and title tokens can be combined");
    assert.equal(library.matchesSearchQuery(ace, library.getSearchQueryData("1987")), false,
        "a game does not match the wrong release year");
});

test("Games Archive clear control preserves keyboard workflow and active filters", () => {
    const source = read("js/games-library.js");
    const page = read("games/index.html");
    const styles = read("resources/css/games.css");
    const start = source.indexOf("function setupSearch()");
    const end = source.indexOf("function setupSystemFilter()", start);
    assert.ok(start >= 0 && end > start, "archive search binding is present");
    const binding = source.slice(start, end);
    const clearStart = binding.indexOf('if (clearBtn) {');
    assert.ok(clearStart >= 0, "clear control is bound");
    const clearHandler = binding.slice(clearStart);
    assert.match(clearHandler, /input\.value = "";/,
        "clear button empties the current query");
    assert.match(clearHandler, /input\.dispatchEvent\(new Event\("input", \{ bubbles: true \}\)\);/,
        "clearing must reuse the existing input filtering pipeline");
    assert.match(clearHandler, /input\.focus\(\{ preventScroll: true \}\);/,
        "keyboard focus returns to the search input without jumping the page");
    assert.doesNotMatch(clearHandler, /CCG_ACTIVE_QUERY(?:_RAW)?\s*=/,
        "clear must not manage a separate query state");
    assert.doesNotMatch(clearHandler, /setYearFilterSpan\("all"/,
        "clear must preserve the visitor's chosen release year");
    assert.match(page, /id="gamesSearchInput"/);
    assert.match(page, /id="gamesSearchClear" type="button" aria-label="Clear game search"/);
    assert.match(styles, /\.games-search input\[type="search"\]:focus-visible/,
        "the restored input focus is visually indicated");
});

test("Games Archive empty results explain active search and filters without clearing them", () => {
    const source = read("js/games-library.js");
    const page = read("games/index.html");
    const start = source.indexOf("function setEmptyState(isEmpty)");
    const end = source.indexOf("function updateSingleResultLayout(", start);
    assert.ok(start >= 0 && end > start, "empty-state controller is present");
    const handler = source.slice(start, end);
    assert.match(handler, /CCG_ACTIVE_QUERY_RAW\.trim\(\)/);
    assert.match(handler, /getSystemFilterLabel\(CCG_ACTIVE_SYSTEM_FILTER\)/);
    assert.match(handler, /getYearFocusLabel\(\)/);
    assert.match(handler, /if \(query && filters\.length\)/);
    assert.match(handler, /else if \(query\)/);
    assert.match(handler, /else if \(filters\.length\)/);
    assert.match(handler, /message\.textContent =/);
    assert.doesNotMatch(handler, /setYearFilterSpan|setSystemFilter|input\.value\s*=/,
        "display-only empty state must not reset the user's filters");
    assert.match(page, /id="gamesEmptyState"/);
});

test("Music Hub composer search stays above A–Z without obscuring letter groups", () => {
    const css = read("resources/css/ccg-archive-directory.css");
    const markup = read("music/index.html");
    const generator = read("scripts/generate-composer-pages.js");
    const selector = 'body[data-ccg-directory="music-index"] .composer-discovery__search-wrap';
    const searchStyleStart = css.indexOf(selector + " {");
    const searchStyleEnd = css.indexOf("}", searchStyleStart);
    assert.ok(searchStyleStart >= 0 && searchStyleEnd > searchStyleStart, "music search style exists");
    const rule = css.slice(searchStyleStart, searchStyleEnd);
    assert.match(rule, /position:\s*static\s*;/, "composer search remains above first letter in normal flow");
    assert.doesNotMatch(rule, /(?:top|z-index):/, "no desktop sticky offset or layer over the accordion");
    assert.doesNotMatch(css.slice(searchStyleEnd), /composer-discovery__search-wrap\s*\{\s*top:/,
        "mobile rules do not reintroduce sticky offsets");
    const inputPos = markup.indexOf('id="composer-discovery-search"');
    const accordionPos = markup.indexOf('id="composer-discovery-accordion"');
    assert.ok(inputPos >= 0 && accordionPos > inputPos, "input precedes the alphabet directory in static HTML");
    assert.match(generator, /composer-discovery__search-wrap[\s\S]*?composer-discovery-accordion/,
        "regeneration retains the same search-then-accordion order");
});


test("homepage prioritises playable archive discovery before optional merchandise", () => {
    const html = read("home.html");
    const hero = html.indexOf('<section class="home-hero home-hero--streamlined"');
    const discovery = html.indexOf('class="home-section home-section--highlights');
    const emulator = html.indexOf('class="home-c64-emulator-promo"');
    const merch = html.indexOf('<section class="home-merch-promo"');
    const community = html.indexOf('<section class="home-community-latest');
    assert.ok(hero >= 0 && hero < discovery && discovery < emulator && emulator < merch && merch < community,
        "hero and core archive links come before the merchandise CTA, community follows merchandise");
    assert.equal(html.match(/class="home-merch-promo"/g)?.length, 1, "merchandise CTA exists exactly once");
    assert.equal(html.match(/class="home-c64-emulator-promo"/g)?.length, 1, "emulator CTA stays unique");
    const merchPanel = html.slice(merch, community);
    assert.match(merchPanel, /The CCG Merch Shop/);
    assert.match(merchPanel, /EXPLORE MERCH/);
    assert.doesNotMatch(merchPanel, /New CCG Merch Coming Soon/);
    assert.match(merchPanel, /href="https:\/\/cheeky-commodore-gamer-shop\.fourthwall\.com\/en-gbp"/,
        "merchandise panel should preserve the official Fourthwall destination");
    assert.match(read("resources/css/home-fourthwall-merch.css"), /Scoped below the homepage archive discovery/);
});

test("Games Archive search comes before optional browse destinations and results remain reachable", () => {
    const html = read("games/index.html");
    const hero = html.indexOf('class="games-hero"');
    const search = html.indexOf('class="games-tools ccg-chapter"');
    const browse = html.indexOf('class="games-omega-discovery ccg-chapter"');
    const library = html.indexOf('class="games-library ccg-chapter"');
    assert.ok(hero >= 0 && hero < search && search < browse && browse < library,
        "search and filters appear immediately after the hero, before optional browsing and results");
    assert.equal(html.match(/id="gamesSearchInput"/g)?.length, 1);
    assert.equal(html.match(/id="gamesYearSelect"/g)?.length, 1);
    assert.equal(html.match(/id="gamesAccordion"/g)?.length, 1);
    assert.match(html.slice(search, browse), /data-system-filter="c64"/);
    assert.match(html.slice(search, browse), /data-system-filter="amiga"/);
    assert.match(html.slice(browse, library), /<details class="games-omega-discovery__more">/);
    for (const route of ["/games/genres/", "/games/publishers/", "/games/collections/", "/games/years/", "/games/developers/"]) {
        assert.ok(html.slice(browse, library).includes('href="' + route + '"'),
            "all browse destinations retained: " + route);
    }
    assert.match(html.slice(library), /id="gamesStaticFallback"/,
        "crawlable game links remain below the rendered library");
});


test("developer detail generator and all 47 published pages retain accurate headings and game-count grammar", () => {
    const { buildDeveloperGroups } = require("../scripts/developer-utils.js");
    const { renderDeveloperPage } = require("../scripts/generate-developer-pages.js");
    const games = JSON.parse(read("games/games.json"));
    const groups = buildDeveloperGroups(games);
    const metadata = JSON.parse(read("games/developers/developers.json"));
    assert.equal(groups.length, metadata.length, "all developer routes remain represented");
    assert.ok(groups.length > 0, "the catalogue has credited developers");

    for (const group of groups) {
        const file = "games/developers/" + group.slug + "/index.html";
        const published = read(file);
        const generated = renderDeveloperPage(group);
        const heading = /<h1 class="ccg-developers-hero__title">([^<]+)<\/h1>/;
        const count = /<strong id="developerGameVisibleCount">(\d+)<\/strong> (game|games) shown/;
        const actualHeading = published.match(heading)?.[1];
        const generatedHeading = generated.match(heading)?.[1];
        const actualCount = published.match(count);
        const generatedCount = generated.match(count);

        assert.equal(actualHeading, generatedHeading, file + " heading matches the source generator");
        assert.ok(actualCount && generatedCount, file + " has a visible, grammatical count");
        assert.equal(Number(actualCount[1]), group.count, file + " displays the real credit count");
        assert.equal(actualCount[2], group.count === 1 ? "game" : "games", file + " pluralisation");
        assert.equal(actualCount[0], generatedCount[0], file + " count matches the source generator");
        if (group.count > 1 && /\bgames$/i.test(group.name)) {
            assert.equal(actualHeading, group.name + " — Developer Archive",
                file + " must not repeat Games Games");
        }
    }

    const runtime = read("js/developer-pages.js");
    assert.match(runtime, /visible === 1 \? " game shown" : " games shown"/,
        "live C64/Amiga and title filtering must update singular and plural count labels");
});


test("music composer dynamic HTML escapes editable credits", () => {
    const source = read("js/music-composer-pages.js");
    const between = (start, end) => {
        const from = source.indexOf(start);
        const to = source.indexOf(end, from + start.length);
        assert.ok(from >= 0 && to > from, "composer source section exists: " + start);
        return source.slice(from, to);
    };

    // Execute the actual runtime markup functions, rather than testing a
    // separately implemented encoder that could diverge from production.
    const snippets = [
        between("  function escapeComposerMarkup(", "\n  function getCanonicalComposerName("),
        between("  function cardMarkup(", "\n  function renderHubAccordion("),
        between("  function renderHubAccordion(", "\n  async function renderHubCards(")
    ];
    const search = { value: "", addEventListener() {} };
    const accordion = { innerHTML: "", querySelectorAll: () => [] };
    const document = {
        getElementById(id) {
            return id === "composer-discovery-search" ? search : accordion;
        }
    };
    const runtime = vm.runInNewContext(snippets.join("\n") +
        "\n({ escapeComposerMarkup, cardMarkup, renderHubAccordion })", {
        document,
        window: { CCGMusicHubOmega: { refreshAccordion() {} } },
        getComposerUrl: (composer) => "/music/" + composer.slug + "/",
        getPlatformLabel: () => "C64",
        composerSortLetter: () => "R",
        normaliseName: (value) => String(value || "").toLowerCase()
    });

    const injectedName = 'Rogue"><img src=x onerror=alert(1)>&';
    const composer = { name: injectedName, slug: "rogue", aliases: [] };
    const stats = new Map([["rogue", { games: [{}] }]]);
    const card = runtime.cardMarkup(composer, "/resources/images/composers/rogue.webp", stats, false);
    runtime.renderHubAccordion([composer], stats);

    for (const html of [card, accordion.innerHTML]) {
        assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/,
            "catalogue credit must not become an executable HTML element");
        assert.match(html, /Rogue&quot;&gt;&lt;img src=x onerror=alert\(1\)&gt;&amp;/,
            "quotes, tags and ampersands must be encoded in dynamic markup");
    }
    assert.match(card, /alt="Rogue&quot;&gt;&lt;img/,
        "composer image alt attribute must not be broken by a quoted name");
    assert.equal(runtime.escapeComposerMarkup("Chris Hülsbeck"), "Chris Hülsbeck",
        "normal accented names remain unchanged");
    assert.equal(runtime.escapeComposerMarkup("Tom & Jerry's"), "Tom &amp; Jerry&#39;s");

    assert.doesNotMatch(source, /\$\{composer\.(?:name|bio|born|birthplace)\}/,
        "no raw composer credit is interpolated into a template");
    assert.match(source, /const safeName = requestedName \? escapeComposerMarkup\(requestedName\)/,
        "unknown composer search terms must also be encoded");
    assert.match(source, /\$\{escapeComposerMarkup\(displayMeta\)\}/,
        "dynamic track metadata is encoded");
});

test("Music Hub composer search ignores track badges and explains empty results", () => {
    const source = read("js/music-composer-utils.js");
    const section = (start, end) => {
        const a = source.indexOf(start);
        const b = source.indexOf(end, a + start.length);
        assert.ok(a >= 0 && b > a, "source function exists: " + start);
        return source.slice(a, b);
    };
    class FakeElement {
        constructor() { this.dataset = {}; this.hidden = false; this.textContent = ""; this.parent = null; }
        remove() { if (this.parent) this.parent.empty = null; }
    }
    class FakeAnchor extends FakeElement {
        constructor(name, count, href) {
            super();
            this.href = href;
            this.textContent = name + count;
            this.childNodes = [{ textContent: name }, { textContent: String(count) }];
            this.countBadge = this.childNodes[1];
        }
        getAttribute() { return this.href; }
        querySelector() { return this.countBadge; }
    }
    class FakeInput extends FakeElement { constructor() { super(); this.value = ""; } }
    class FakeGroup extends FakeElement {
        constructor(chips) {
            super();
            this.chips = chips;
            this.dataset.ccgUserOpen = "false";
            this.count = { dataset: { ccgTotalCount: String(chips.length) }, textContent: String(chips.length) };
        }
        querySelectorAll() { return this.chips; }
        querySelector() { return this.count; }
    }
    class FakeAccordion extends FakeElement {
        constructor(groups) { super(); this.groups = groups; this.empty = null; }
        querySelectorAll() { return this.groups; }
        querySelector() { return this.empty; }
        appendChild(node) { node.parent = this; this.empty = node; }
    }
    const runtime = vm.runInNewContext(
        section("  function getMusicHubChipSearchText(", "\n  function applyMusicHubAccordionSearch(") +
        section("  function applyMusicHubAccordionSearch(", "\n  function bindMusicHubAccordion(") +
        "\n({ getMusicHubChipSearchText, applyMusicHubAccordionSearch })", {
            Element: FakeElement,
            HTMLAnchorElement: FakeAnchor,
            HTMLInputElement: FakeInput,
            document: { createElement: () => new FakeElement() },
            normalizeComposerName: (value) => String(value || "").toLowerCase().trim(),
            prepareMusicHubAccordionGroup: () => {},
            setMusicHubAccordionState: (group, open) => { group.open = Boolean(open); }
        }
    );
    const rob = new FakeAnchor("Rob Hubbard", "32", "/music/rob-hubbard/");
    const julie = new FakeAnchor("Julie Dunn", "6", "/music/david-dunn/");
    const group = new FakeGroup([rob, julie]);
    const accordion = new FakeAccordion([group]);
    const search = new FakeInput();
    assert.equal(runtime.getMusicHubChipSearchText(rob), "rob hubbard");
    assert.match(runtime.getMusicHubChipSearchText(julie), /david dunn/);
    search.value = "32";
    runtime.applyMusicHubAccordionSearch(accordion, search);
    assert.equal(group.hidden, true, "track-count-only query has no composer matches");
    assert.equal(accordion.empty?.textContent, "No composers match this search.");
    assert.equal(group.count.textContent, "0");
    search.value = "Hubbard";
    runtime.applyMusicHubAccordionSearch(accordion, search);
    assert.equal(rob.hidden, false);
    assert.equal(julie.hidden, true);
    assert.equal(group.open, true);
    assert.equal(accordion.empty, null);
    search.value = "David Dunn";
    runtime.applyMusicHubAccordionSearch(accordion, search);
    assert.equal(julie.hidden, false, "historic alias still matches");
    search.value = "";
    runtime.applyMusicHubAccordionSearch(accordion, search);
    assert.equal(rob.hidden, false);
    assert.equal(julie.hidden, false);
    assert.equal(group.count.textContent, "2");
    assert.equal(accordion.empty, null);
    assert.ok(read("resources/css/music-hub-omega.css").includes(".composer-accordion__empty {"));
    assert.ok(read("music/index.html").includes('aria-live="polite"'));
});
