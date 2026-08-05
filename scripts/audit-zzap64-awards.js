#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const matcher = require("../js/ccg-zzap64-matcher.js");

const ROOT = path.resolve(__dirname, "..");
const YEARS = [1985, 1986, 1987, 1988, 1989];
const MONTHS = new Set([
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]);
const AWARDS = new Set(["Gold Medal", "Sizzler", "Silver Medal"]);
const SYSTEMS = new Set(["C64", "Amiga"]);
const EXPECTED_COUNTS = new Map([[1985, 50], [1988, 54]]);
const ALLOWED_UNSCORED = new Set([
    "1986|graphic adventure creator",
    "1986|the sentinel",
    "1987|shoot em up construction kit",
    "1987|computer scrabble deluxe",
    "1989|falcon",
    "1989|f 16 combat pilot"
]);
const REQUIRED_FILES = [
    "resources/images/zzap64/zzap64-gold-medal.webp",
    "resources/images/zzap64/zzap64-sizzler.webp",
    "resources/images/platforms/commodore-64-logo.webp",
    "resources/images/platforms/commodore-amiga-logo.webp",
    "resources/css/zzap64-awards-logos.css",
    "js/zzap64-awards-logo-styles.js",
    "js/ccg-zzap64-matcher.js"
];
const problems = [];
const records = [];

function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function read(relativePath) {
    const filePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(filePath)) {
        problems.push(`Missing required file: ${relativePath}.`);
        return "";
    }
    return fs.readFileSync(filePath, "utf8");
}

function readJson(relativePath) {
    try {
        return JSON.parse(read(relativePath));
    } catch (error) {
        problems.push(`${relativePath} is invalid JSON: ${error.message}`);
        return null;
    }
}

function entryFrom(raw, year) {
    if (Array.isArray(raw)) {
        return {
            year,
            month: raw[0],
            title: raw[1],
            award: raw[2],
            score: raw[3],
            system: raw[4] || "C64"
        };
    }
    return {
        year: Number(raw.year || year),
        month: raw.month,
        title: raw.title || raw.game,
        award: raw.award,
        score: raw.score,
        system: raw.system || raw.platform || "C64"
    };
}

REQUIRED_FILES.forEach((relativePath) => {
    const filePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(filePath)) problems.push(`Missing Zzap asset/module: ${relativePath}.`);
    else if (!fs.statSync(filePath).size) problems.push(`Empty Zzap asset/module: ${relativePath}.`);
});

YEARS.forEach((year) => {
    const relativePath = `data/zzap64-awards/${year}.json`;
    const data = readJson(relativePath);
    const rows = Array.isArray(data) ? data : (data?.entries || data?.awards || []);
    if (!rows.length) {
        problems.push(`${relativePath} contains no award records.`);
        return;
    }
    if (EXPECTED_COUNTS.has(year) && rows.length !== EXPECTED_COUNTS.get(year)) {
        problems.push(`${relativePath} should contain ${EXPECTED_COUNTS.get(year)} records, found ${rows.length}.`);
    }

    rows.forEach((raw, index) => {
        const entry = entryFrom(raw, year);
        const where = `${relativePath} record ${index + 1}`;
        if (entry.year !== year) problems.push(`${where} has the wrong year.`);
        if (!MONTHS.has(entry.month)) problems.push(`${where} has invalid month: ${entry.month}.`);
        if (!String(entry.title || "").trim()) problems.push(`${where} has no title.`);
        if (!AWARDS.has(entry.award)) problems.push(`${where} has invalid award: ${entry.award}.`);
        if (!SYSTEMS.has(entry.system)) problems.push(`${where} has invalid system: ${entry.system}.`);
        if (entry.score !== null && (!Number.isInteger(entry.score) || entry.score < 0 || entry.score > 100)) {
            problems.push(`${where} has invalid score: ${entry.score}.`);
        }
        records.push(entry);
    });
});

const duplicates = new Set();
records.forEach((entry) => {
    const key = [entry.year, entry.month, normalize(entry.title), entry.award, entry.system].join("|");
    if (duplicates.has(key)) problems.push(`Duplicate award record: ${key}.`);
    duplicates.add(key);
});

const unscored = new Set(records
    .filter((entry) => entry.score === null)
    .map((entry) => `${entry.year}|${normalize(entry.title)}`));
unscored.forEach((key) => {
    if (!ALLOWED_UNSCORED.has(key)) problems.push(`Unexpected unscored record: ${key}.`);
});
ALLOWED_UNSCORED.forEach((key) => {
    if (!unscored.has(key)) problems.push(`Expected unscored record is missing: ${key}.`);
});

function findRecord(year, title, system) {
    return records.find((entry) => (
        entry.year === year
        && normalize(entry.title) === normalize(title)
        && (!system || entry.system === system)
    ));
}

function verifyRecord(year, title, expected) {
    const entry = findRecord(year, title, expected.system);
    if (!entry) {
        problems.push(`Missing verification record: ${year} ${title}.`);
        return;
    }
    Object.entries(expected).forEach(([field, value]) => {
        if (entry[field] !== value) problems.push(`${year} ${title} should have ${field}=${value}, found ${entry[field]}.`);
    });
}

verifyRecord(1985, "Elite", { score: 95, award: "Gold Medal", system: "C64" });
verifyRecord(1985, "Finders Keepers", { score: 90, award: "Sizzler", system: "C64" });
verifyRecord(1988, "Barbarian II: The Dungeon of Drax", { score: 96, award: "Gold Medal", system: "C64" });
verifyRecord(1988, "Corruption", { score: 90, award: "Sizzler", system: "C64" });
verifyRecord(1988, "Ultima IV", { score: 91, system: "Amiga" });
verifyRecord(1988, "Fish!", { score: 93, system: "Amiga" });
verifyRecord(1988, "Nebulus", { score: 97, system: "Amiga" });

const gamesData = readJson("games/games.json");
const games = Array.isArray(gamesData) ? gamesData : (gamesData?.games || []);
if (!games.length) problems.push("games/games.json contains no games for matching.");
const index = matcher.buildGameIndex(games);

[
    [1985, "Elite", "C64"],
    [1985, "Finders Keepers", "C64"],
    [1988, "Barbarian II: The Dungeon of Drax", "C64"],
    [1988, "Nebulus", "Amiga"]
].forEach(([year, title, system]) => {
    const entry = findRecord(year, title, system);
    const game = entry ? matcher.findGame(entry, index) : null;
    if (!game || !matcher.gameHref(game)) problems.push(`Known existing review does not link: ${title} (${system}).`);
});

const matchedRecords = records.filter((entry) => matcher.findGame(entry, index)).length;
if (!matchedRecords) problems.push("No Zzap records match games/games.json.");

const archiveScript = read("js/zzap64-awards.js");
[
    ["Not yet reviewed", "Missing-game fallback text is absent."],
    ["Not scored by Zzap!64", "Unscored fallback text is absent."],
    ["compareEntriesAlphabetically", "Alphabetical ordering is absent."],
    ["Open game page", "Game-link affordance is absent."],
    ["/games/games.json", "The full system-aware game archive is not used."],
    ["ccg-zzap64-matcher.js", "The shared matcher is not loaded."],
    ["zzap64-gold-medal.webp", "Gold Medal artwork is not rendered."],
    ["zzap64-sizzler.webp", "Sizzler artwork is not rendered."],
    ["commodore-64-logo.webp", "C64 platform artwork is not rendered."],
    ["commodore-amiga-logo.webp", "Amiga platform artwork is not rendered."]
].forEach(([needle, message]) => {
    if (!archiveScript.includes(needle)) problems.push(message);
});

const logoCss = read("resources/css/zzap64-awards-logos.css");
[
    ".zzap-award-card__award-logo",
    ".zzap-award-card__platform",
    ".zzap-award-card__bottom",
    "data-game-linked"
].forEach((selector) => {
    if (!logoCss.includes(selector)) problems.push(`Missing Zzap logo style: ${selector}.`);
});

if (problems.length) {
    console.error("Zzap!64 awards audit failed:");
    problems.forEach((problem) => console.error(` - ${problem}`));
    process.exit(1);
}

console.log(`Zzap!64 awards audit passed: ${records.length} records, ${matchedRecords} linked game records, ${unscored.size} intentionally unscored.`);
