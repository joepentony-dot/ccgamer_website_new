#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");

const CORRECTIONS = [
    {
        slug: "popeye-c64-popeye-donpriestley",
        title: "Popeye",
        publisher: "Piranha"
    },
    {
        slug: "give-my-regards-to-broad-street",
        title: "Give My Regards To Broad Street",
        publisher: "Argus Press Software"
    },
    {
        slug: "thing-on-a-spring",
        title: "Thing On A Spring",
        publisher: "Gremlin Graphics"
    },
    {
        slug: "soccer-boss",
        title: "Soccer Boss",
        publisher: "Alternative Software"
    },
    {
        slug: "miner-2049er",
        title: "Miner 2049er",
        publisher: "Big Five Software"
    },
    {
        slug: "black-knight",
        title: "Black Knight",
        publisher: "Interdisc"
    },
    {
        slug: "arachnophobia",
        title: "Arachnophobia",
        publisher: "Titus Software"
    }
];

const REMOVED_PUBLISHERS = new Set([
    "macmillan",
    "ozisoft",
    "peaksoft",
    "reston publishing company",
    "roflow computer software",
    "titus"
]);

function fail(message) {
    console.error(`[publisher-corrections] ${message}`);
    process.exit(1);
}

function normalize(value) {
    return String(value ?? "")
        .trim()
        .replace(/[’‘]/g, "'")
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function asList(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
}

function effectivePublishers(game) {
    const creditPublishers = asList(game?.credits?.publisher).filter(Boolean);
    const source = creditPublishers.length ? creditPublishers : asList(game?.publisher);
    return source.map((value) => String(value).trim()).filter(Boolean);
}

function setPublisher(game, publisher) {
    game.publisher = publisher;
    if (game.credits && typeof game.credits === "object" && !Array.isArray(game.credits)) {
        game.credits.publisher = publisher;
    }
}

function removeBlockedValue(value) {
    if (Array.isArray(value)) {
        const kept = value.filter((item) => !REMOVED_PUBLISHERS.has(normalize(item)));
        return kept.length ? kept : undefined;
    }
    if (REMOVED_PUBLISHERS.has(normalize(value))) return undefined;
    return value;
}

function scrubRemovedPublishers(game) {
    const before = [
        ...asList(game.publisher),
        ...asList(game?.credits?.publisher)
    ].map(normalize);
    const containedRemovedPublisher = before.some((name) => REMOVED_PUBLISHERS.has(name));

    const rootPublisher = removeBlockedValue(game.publisher);
    if (rootPublisher === undefined) delete game.publisher;
    else game.publisher = rootPublisher;

    if (game.credits && typeof game.credits === "object" && !Array.isArray(game.credits)) {
        const creditPublisher = removeBlockedValue(game.credits.publisher);
        if (creditPublisher === undefined) delete game.credits.publisher;
        else game.credits.publisher = creditPublisher;
    }

    return containedRemovedPublisher;
}

function findCorrectionMatch(games, correction) {
    const slugKey = normalize(correction.slug);
    const titleKey = normalize(correction.title);
    return games.filter((game) => (
        normalize(game?.slug) === slugKey ||
        normalize(game?.title) === titleKey
    ));
}

function main() {
    if (!fs.existsSync(gamesPath)) fail(`Missing ${path.relative(repoRoot, gamesPath)}`);

    let games;
    try {
        games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
    } catch (error) {
        fail(`Could not parse games/games.json: ${error.message}`);
    }
    if (!Array.isArray(games)) fail("games/games.json must contain an array.");

    const changed = [];
    for (const correction of CORRECTIONS) {
        const matches = findCorrectionMatch(games, correction);
        if (matches.length !== 1) {
            fail(`${correction.title} matched ${matches.length} records; expected exactly one.`);
        }

        const game = matches[0];
        const previous = effectivePublishers(game).join(" | ") || "(none)";
        setPublisher(game, correction.publisher);
        changed.push(`${game.title}: ${previous} -> ${correction.publisher}`);
    }

    const unresolved = [];
    for (const game of games) {
        const containedRemovedPublisher = scrubRemovedPublishers(game);
        if (containedRemovedPublisher && effectivePublishers(game).length === 0) {
            unresolved.push(`${game.title || game.slug || "Unknown game"} has no publisher after cleanup.`);
        }
    }
    if (unresolved.length) fail(unresolved.join("\n"));

    const leftovers = [];
    for (const game of games) {
        const values = [
            ...asList(game.publisher),
            ...asList(game?.credits?.publisher)
        ];
        for (const value of values) {
            if (REMOVED_PUBLISHERS.has(normalize(value))) {
                leftovers.push(`${game.title || game.slug}: ${value}`);
            }
        }
    }
    if (leftovers.length) fail(`Removed publisher values remain:\n${leftovers.join("\n")}`);

    for (const correction of CORRECTIONS) {
        const game = findCorrectionMatch(games, correction)[0];
        const effective = effectivePublishers(game);
        if (effective.length !== 1 || effective[0] !== correction.publisher) {
            fail(`${correction.title} did not resolve exclusively to ${correction.publisher}.`);
        }
    }

    fs.writeFileSync(gamesPath, `${JSON.stringify(games, null, 2)}\n`, "utf8");

    console.log("[publisher-corrections] Applied:");
    changed.forEach((line) => console.log(`- ${line}`));
    console.log(`[publisher-corrections] Removed publisher labels: ${Array.from(REMOVED_PUBLISHERS).join(", ")}`);
}

main();
