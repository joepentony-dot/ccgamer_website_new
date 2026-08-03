#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");

const INVALID_PUBLISHERS = new Set([
    "2 logos",
    "3 logos",
    "advantage*artworx",
    "data east",
    "datacompaniet",
    "dro soft",
    "ecp",
    "empire interactive",
    "entertainment usa",
    "erbe software",
    "gamestar",
    "gametek",
    "green valley publishing",
    "happy software",
    "kids!",
    "mastertronic plus",
    "mcm software"
]);

const PUBLISHER_OVERRIDES = new Map([
    ["android-nim", ["64 Tape Computing"]],
    ["batman-the-caped-crusader", ["Ocean Software"]],
    ["championship-wrestling", ["Epyx"]],
    ["donald-ducks-playground", ["Sierra On-Line"]],
    ["double-dare", ["Alternative Software"]],
    ["dreamweb", ["Empire Software"]],
    ["face-off", ["Activision"]],
    ["falcon-patrol", ["Virgin Games"]],
    ["herberts-dummy-run", ["Mikro-Gen"]],
    ["ikari-warriors", ["Elite"]],
    ["kung-fu-master", ["US Gold"]],
    ["mr-robot-and-his-robot-factory", ["Datamost"]],
    ["ninja", ["Mastertronic"]],
    ["paperboy", ["Elite"]],
    ["psycho-hopper", ["Mastertronic"]],
    ["raging-beast", ["Firebird"]],
    ["rebel", ["Virgin Games"]],
    ["tapper", ["US Gold"]],
    ["the-goonies", ["Datasoft"]],
    ["wwf-wrestlemania", ["Ocean Software"]]
]);

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}

function normalizePublishers(value) {
    if (Array.isArray(value)) return value.map((publisher) => String(publisher));
    if (value === null || value === undefined || value === "") return [];
    return [String(value)];
}

function samePublishers(left, right) {
    return left.length === right.length
        && left.every((publisher, index) => publisher === right[index]);
}

function main() {
    if (!fs.existsSync(gamesPath)) {
        throw new Error(`Missing ${path.relative(repoRoot, gamesPath)}`);
    }

    const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
    if (!Array.isArray(games)) {
        throw new Error("games/games.json must contain a top-level array.");
    }

    const removals = [];
    const corrections = [];
    const correctedSlugs = new Set();

    games.forEach((game) => {
        const credits = game && typeof game === "object" ? game.credits : null;
        if (!credits || typeof credits !== "object") return;

        const slug = String(game.slug || "");
        const currentPublishers = normalizePublishers(credits.publisher);
        const override = PUBLISHER_OVERRIDES.get(slug);

        if (override) {
            correctedSlugs.add(slug);

            if (!samePublishers(currentPublishers, override)) {
                credits.publisher = [...override];
                corrections.push({
                    id: String(game.id || ""),
                    slug,
                    title: String(game.title || game.id || "Unknown game"),
                    before: currentPublishers,
                    after: override
                });
            }
            return;
        }

        const filtered = currentPublishers.filter((publisher) => {
            const isInvalid = INVALID_PUBLISHERS.has(normalize(publisher));
            if (isInvalid) {
                removals.push({
                    id: String(game.id || ""),
                    slug,
                    title: String(game.title || game.id || "Unknown game"),
                    publisher: String(publisher)
                });
            }
            return !isInvalid;
        });

        if (filtered.length === currentPublishers.length) return;

        if (Array.isArray(credits.publisher)) {
            credits.publisher = filtered;
        } else {
            credits.publisher = filtered[0] || "";
        }
    });

    const missingOverrides = [...PUBLISHER_OVERRIDES.keys()]
        .filter((slug) => !correctedSlugs.has(slug));
    if (missingOverrides.length) {
        throw new Error(`Publisher override targets were not found: ${missingOverrides.join(", ")}`);
    }

    const remainingInvalidAssignments = [];
    games.forEach((game) => {
        normalizePublishers(game?.credits?.publisher).forEach((publisher) => {
            if (!INVALID_PUBLISHERS.has(normalize(publisher))) return;
            remainingInvalidAssignments.push({
                game: String(game.slug || game.id || game.title || "Unknown game"),
                publisher: String(publisher)
            });
        });
    });

    if (remainingInvalidAssignments.length) {
        throw new Error(
            `Invalid publisher labels remain assigned: ${remainingInvalidAssignments
                .map((entry) => `${entry.game} (${entry.publisher})`)
                .join(", ")}`
        );
    }

    if (!removals.length && !corrections.length) {
        console.log("[publisher-cleanup] Publisher assignments are already current.");
        return;
    }

    fs.writeFileSync(gamesPath, `${JSON.stringify(games, null, 2)}\n`, "utf8");

    if (corrections.length) {
        console.log(`[publisher-cleanup] Corrected ${corrections.length} publisher assignment(s):`);
        corrections.forEach((entry) => {
            console.log(
                `  - ${entry.title} (${entry.slug || entry.id}): `
                + `${entry.before.join(", ") || "none"} -> ${entry.after.join(", ")}`
            );
        });
    }

    if (removals.length) {
        console.log(`[publisher-cleanup] Removed ${removals.length} invalid publisher value(s):`);
        removals.forEach((entry) => {
            console.log(`  - ${entry.title} (${entry.slug || entry.id}): ${entry.publisher}`);
        });
    }

    console.log("[publisher-cleanup] No other credit fields were changed.");
}

main();
