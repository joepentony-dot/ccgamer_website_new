#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");
const INVALID_PUBLISHERS = new Set(["2 logos", "3 logos"]);

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
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

    games.forEach((game) => {
        const credits = game && typeof game === "object" ? game.credits : null;
        if (!credits || typeof credits !== "object") return;

        const current = credits.publisher;
        const publishers = Array.isArray(current)
            ? current
            : (current === null || current === undefined || current === "" ? [] : [current]);

        const filtered = publishers.filter((publisher) => {
            const isInvalid = INVALID_PUBLISHERS.has(normalize(publisher));
            if (isInvalid) {
                removals.push({
                    id: String(game.id || ""),
                    slug: String(game.slug || ""),
                    title: String(game.title || game.id || "Unknown game"),
                    publisher: String(publisher)
                });
            }
            return !isInvalid;
        });

        if (filtered.length === publishers.length) return;

        if (Array.isArray(current)) {
            credits.publisher = filtered;
        } else {
            credits.publisher = filtered[0] || "";
        }
    });

    if (!removals.length) {
        console.log("[publisher-cleanup] No invalid publisher labels found.");
        return;
    }

    fs.writeFileSync(gamesPath, `${JSON.stringify(games, null, 2)}\n`, "utf8");

    console.log(`[publisher-cleanup] Removed ${removals.length} invalid publisher value(s):`);
    removals.forEach((entry) => {
        console.log(`  - ${entry.title} (${entry.slug || entry.id}): ${entry.publisher}`);
    });
    console.log("[publisher-cleanup] No other credit fields or publisher values were changed.");
}

main();
