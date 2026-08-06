import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

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
