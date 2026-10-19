import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("developer archive keeps every route in static accessible HTML", () => {
    const html = read("games/developers/index.html");
    const generator = read("scripts/generate-developer-pages.js");
    const gridStart = html.indexOf('id="developerGrid"');
    const gridEnd = html.indexOf('id="developerEmptyState"', gridStart);
    assert.ok(gridStart >= 0 && gridEnd > gridStart, "generated developer directory bounds exist");
    const grid = html.slice(gridStart, gridEnd);
    const fullRoutes = Array.from(grid.matchAll(/href="(\/games\/developers\/[^"]+\/)"[\s\S]*?data-developer-card/g), (m) => m[1]);
    const count = (grid.match(/\bdata-developer-card\b/g) || []).length;
    assert.ok(count > 0, "nonempty developer directory");
    assert.equal(fullRoutes.length, count, "each developer card retains its canonical route");
    assert.equal(new Set(fullRoutes).size, count, "all developer routes are unique inside directory");
    assert.match(html, /<details class="ccg-developer-directory-disclosure" data-developer-directory-disclosure>/);
    assert.ok(html.includes(`<summary class="ccg-developer-directory-disclosure__summary">Browse all ${count} developers A–Z</summary>`),
        "summary advertises the generated directory total");
    assert.ok(html.includes(`<strong id="developerVisibleCount">${count}</strong> developers available`),
        "static count describes available, not expanded, developer pages");
    assert.match(generator, /Browse all \$\{groups\.length\} developers A–Z/);
    assert.match(generator, /id="developerVisibleCount">\$\{groups\.length\}<\/strong> developers available/);
    assert.match(html, /id="developerSearchInput"/);
    assert.match(html, /data-developer-system="c64"/);
    assert.match(html, /data-developer-system="amiga"/);
});

test("developer directory expands when filtering and restores user-selected state", () => {
    const js = read("js/developer-pages.js");
    const css = read("resources/css/developers.css");
    const browserAudit = read("scripts/audit-responsive-browser.js");
    assert.match(browserAudit, /"\/games\/developers\/index\.html"/);
    assert.match(browserAudit, /auditDeveloperDirectory\(sessionId, viewport\)/);
    assert.match(browserAudit, /Developer search failed at/);
    assert.match(browserAudit, /Developer platform filter restoration failed at/);
    assert.match(js, /grid\.closest\("\[data-developer-directory-disclosure\]"\)/);
    assert.match(js, /let manuallyExpanded = Boolean\(directory\?\.open\)/);
    assert.match(js, /manuallyExpanded = !directory\.open/);
    assert.match(js, /const hasFilter = Boolean\(query\) \|\| system !== "all"/);
    assert.match(js, /directory\.open = hasFilter \|\| manuallyExpanded/);
    assert.match(js, /featuredSection\.hidden = hasFilter/);
    assert.match(js, /event\.preventDefault\(\)/);
    assert.match(css, /\.ccg-developer-directory-disclosure__summary:focus-visible/);
    assert.match(css, /\.ccg-developer-directory-disclosure\[open\]/);
    assert.doesNotMatch(css, /#developerGrid\s*\{[^}]*display:\s*none/s,
        "native static directory must remain openable without JavaScript");
});
