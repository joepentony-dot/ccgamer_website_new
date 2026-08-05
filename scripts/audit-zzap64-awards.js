#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

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
        problems.push(`Missing required file: ${relativePath}`);
        return "";
    }
    return fs.readFileSync(filePath, "utf8");
}

function normalizeEntry(raw, year) {
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

for (const year of YEARS) {
    const relativePath = `data/zzap64-awards/${year}.json`;
    const source = read(relativePath);
    if (!source) continue;

    let data;
    try {
        data = JSON.parse(source);
    } catch (error) {
        problems.push(`${relativePath} is invalid JSON: ${error.message}`);
        continue;
    }

    const rows = Array.isArray(data) ? data : (data.entries || data.awards || []);
    if (!Array.isArray(rows) || !rows.length) {
        problems.push(`${relativePath} contains no award records.`);
        continue;
    }

    if (EXPECTED_COUNTS.has(year) && rows.length !== EXPECTED_COUNTS.get(year)) {
        problems.push(`${relativePath} should contain ${EXPECTED_COUNTS.get(year)} records, found ${rows.length}.`);
    }

    rows.forEach((raw, index) => {
        const entry = normalizeEntry(raw, year);
        const where = `${relativePath} record ${index + 1}`;

        if (entry.year !== year) problems.push(`${where} has year ${entry.year}, expected ${year}.`);
        if (!MONTHS.has(entry.month)) problems.push(`${where} has invalid month: ${entry.month}.`);
        if (!String(entry.title || "").trim()) problems.push(`${where} has no game title.`);
        if (!AWARDS.has(entry.award)) problems.push(`${where} has invalid award: ${entry.award}.`);
        if (!SYSTEMS.has(entry.system)) problems.push(`${where} has invalid system: ${entry.system}.`);

        if (entry.score !== null) {
            if (!Number.isInteger(entry.score) || entry.score < 0 || entry.score > 100) {
                problems.push(`${where} has invalid score: ${entry.score}.`);
            }
        }

        records.push(entry);
    });
}

const seen = new Set();
for (const entry of records) {
    const key = [entry.year, entry.month, normalize(entry.title), entry.award, entry.system].join("|");
    if (seen.has(key)) problems.push(`Duplicate award record: ${key}.`);
    seen.add(key);
}

const actualUnscored = new Set(records
    .filter((entry) => entry.score === null)
    .map((entry) => `${entry.year}|${normalize(entry.title)}`));

for (const key of actualUnscored) {
    if (!ALLOWED_UNSCORED.has(key)) problems.push(`Unexpected unscored award record: ${key}.`);
}
for (const key of ALLOWED_UNSCORED) {
    if (!actualUnscored.has(key)) problems.push(`Expected unscored award record is missing: ${key}.`);
}

function find(year, title, system) {
    return records.find((entry) => (
        entry.year === year
        && normalize(entry.title) === normalize(title)
        && (!system || entry.system === system)
    ));
}

function expectRecord(year, title, expected) {
    const entry = find(year, title, expected.system);
    if (!entry) {
        problems.push(`Missing verification record: ${year} ${title}${expected.system ? ` (${expected.system})` : ""}.`);
        return;
    }
    Object.entries(expected).forEach(([field, value]) => {
        if (entry[field] !== value) {
            problems.push(`${year} ${title} should have ${field}=${value}, found ${entry[field]}.`);
        }
    });
}

expectRecord(1985, "Elite", { score: 95, award: "Gold Medal", system: "C64" });
expectRecord(1985, "Finders Keepers", { score: 90, award: "Sizzler", system: "C64" });
expectRecord(1988, "Barbarian II: The Dungeon of Drax", { score: 96, award: "Gold Medal", system: "C64" });
expectRecord(1988, "Corruption", { score: 90, award: "Sizzler", system: "C64" });
expectRecord(1988, "Ultima IV", { score: 91, system: "Amiga" });
expectRecord(1988, "Fish!", { score: 93, system: "Amiga" });
expectRecord(1988, "Nebulus", { score: 97, system: "Amiga" });

const archiveScript = read("js/zzap64-awards.js");
[
    ["Not yet reviewed", "Missing-game fallback text is absent."],
    ["Not scored by Zzap!64", "Unscored Zzap fallback text is absent."],
    ["compareEntriesAlphabetically", "Alphabetical ordering function is absent."],
    ["Open game page", "Game-link affordance text is absent."],
    ["value === null || value === undefined", "Null scores are not explicitly preserved."],
    ["games-search.json", "Future game-page matching does not use the generated search index."]
].forEach(([text, message]) => {
    if (!archiveScript.includes(text)) problems.push(message);
});

const css = read("resources/css/zzap64-awards.css");
[
    ".zzap-award-card__game-link",
    ".zzap-award-card__game-action",
    ".zzap-award-card__availability",
    ".zzap-award-card__score--unscored"
].forEach((selector) => {
    if (!css.includes(selector)) problems.push(`Missing Zzap archive style: ${selector}.`);
});

if (problems.length) {
    console.error("Zzap!64 awards audit failed:");
    problems.forEach((problem) => console.error(` - ${problem}`));
    process.exit(1);
}

console.log(`Zzap!64 awards audit passed: ${records.length} records, ${actualUnscored.size} intentionally unscored.`);
