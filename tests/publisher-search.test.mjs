import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const {
    normalize,
    parsePublisherCounts,
    publisherDataMatches
} = require("../js/publisher-pages.js");

test("featured publishers remain searchable", () => {
    const publishers = [
        { name: "Firebird", statsText: "35 C64 · 2 Amiga · 1984–1991" },
        { name: "Ocean Software", statsText: "42 C64 · 5 Amiga · 1983–1992" },
        { name: "Alternative Software", statsText: "7 C64 · 1986–1991" }
    ];

    const matches = publishers.filter((publisher) => (
        publisherDataMatches(publisher, "Firebird", "all")
    ));

    assert.equal(matches.length, 1);
    assert.equal(matches[0].name, "Firebird");
});

test("platform counts fall back to the visible publisher statistics", () => {
    assert.deepEqual(
        parsePublisherCounts({ statsText: "42 C64 · 5 Amiga · 1983–1992" }),
        { c64Count: 42, amigaCount: 5 }
    );

    assert.deepEqual(
        parsePublisherCounts({ statsText: "9 Amiga · 1990–1994" }),
        { c64Count: 0, amigaCount: 9 }
    );
});

test("C64, Amiga and Both filters use the parsed publisher counts", () => {
    const bothPublisher = {
        name: "Ocean Software",
        statsText: "42 C64 · 5 Amiga · 1983–1992"
    };
    const c64OnlyPublisher = {
        name: "Firebird",
        statsText: "35 C64 · 1984–1991"
    };

    assert.equal(publisherDataMatches(bothPublisher, "", "c64"), true);
    assert.equal(publisherDataMatches(bothPublisher, "", "amiga"), true);
    assert.equal(publisherDataMatches(bothPublisher, "", "both"), true);
    assert.equal(publisherDataMatches(c64OnlyPublisher, "", "both"), false);
    assert.equal(publisherDataMatches(c64OnlyPublisher, "", "amiga"), false);
});

test("publisher matching is case-insensitive and supports partial names", () => {
    const publisher = {
        name: "Electronic Arts",
        statsText: "12 C64 · 8 Amiga"
    };

    assert.equal(normalize("  FIREBIRD  "), "firebird");
    assert.equal(publisherDataMatches(publisher, "electronic", "all"), true);
    assert.equal(publisherDataMatches(publisher, "arts", "all"), true);
    assert.equal(publisherDataMatches(publisher, "firebird", "all"), false);
});

test("generated Firebird cards support the real runtime's count, search and platform filters", () => {
    const { buildPublisherGroups } = require("../scripts/publisher-utils.js");
    const { renderPublisherPage } = require("../scripts/generate-publisher-pages.js");
    const payload = require("../games/games.json");
    const group = buildPublisherGroups(Array.isArray(payload) ? payload : payload.games)
        .find((entry) => entry.slug === "firebird");
    assert.ok(group && group.c64Count > 0 && group.amigaCount > 0);
    const html = renderPublisherPage(group, {});
    const cards = [...html.matchAll(/<article\b([^>]*\bdata-publisher-game-card\b[^>]*)>/g)].map((match) => {
        const attributes = new Map([...match[1].matchAll(/(data-[\w-]+)(?:="([^"]*)")?/g)]
            .map((attribute) => [attribute[1], attribute[2] || ""]));
        return {
            attributes, hidden: false,
            dataset: Object.fromEntries([...attributes].map(([name, value]) => [
                name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
                value.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
            ]))
        };
    });
    assert.equal(cards.length, group.count, "All static catalogue cards must be present before enhancement");
    const listeners = new Map();
    const search = { value: "", addEventListener: (name, callback) => listeners.set(name, callback) };
    const liveAttributes = new Map();
    const count = { textContent: String(group.count), parentElement: {
        setAttribute: (name, value) => liveAttributes.set(name, value), lastChild: { nodeType: 3, nodeValue: " games shown" }
    } };
    const empty = { hidden: true };
    const buttons = ["all", "c64", "amiga"].map((system) => ({
        dataset: { publisherGameSystem: system }, classList: { toggle() {} },
        getAttribute: () => system, setAttribute() {}, addEventListener(name, callback) { this.click = callback; }
    }));
    const nodes = { publisherGameGrid: {
        querySelectorAll(selector) { return cards.filter((card) => card.attributes.has(selector.slice(1, -1))); }
    }, publisherGameSearchInput: search, publisherGameVisibleCount: count, publisherGameEmptyState: empty };
    const document = {
        readyState: "complete", body: { dataset: {} }, querySelector: () => ({}),
        getElementById: (id) => nodes[id] || null, querySelectorAll: () => buttons
    };
    vm.runInNewContext(fs.readFileSync(new URL("../js/publisher-pages.js", import.meta.url), "utf8"), {
        document, window: { location: { href: "https://www.cheekycommodoregamer.co.uk/games/publishers/firebird/", search: "" }, history: { replaceState() {} } },
        URL, URLSearchParams
    });
    const expectVisible = (expected) => {
        assert.equal(Number(count.textContent), expected);
        assert.equal(cards.filter((card) => !card.hidden).length, expected);
        assert.equal(empty.hidden, expected !== 0);
    };
    expectVisible(group.count);
    assert.equal(liveAttributes.get("role"), "status");
    assert.equal(liveAttributes.get("aria-live"), "polite");
    buttons[1].click(); expectVisible(group.c64Count);
    buttons[2].click(); expectVisible(group.amigaCount);
    buttons[0].click();
    const query = group.games[0].title.toLowerCase();
    search.value = query; listeners.get("input")();
    expectVisible(group.games.filter((game) => game.title.toLowerCase().includes(query)).length);
    search.value = "ccg-no-matching-game-987654"; listeners.get("input")(); expectVisible(0);
    search.value = ""; listeners.get("input")(); expectVisible(group.count);
});
