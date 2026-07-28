#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const developersDir = path.join(repoRoot, "games", "developers");
const metadataPath = path.join(developersDir, "developers.json");

// Keep generated descriptions neutral and grammatically valid for both
// personal names and company names without trying to infer entity type.
function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAllLiteral(text, search, replacement) {
    return text.replace(new RegExp(escapeRegExp(search), "g"), replacement);
}

function main() {
    if (!fs.existsSync(metadataPath)) {
        throw new Error("Developer metadata is missing. Run the developer generator first.");
    }

    const groups = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    let changed = 0;
    const problems = [];

    for (const group of groups) {
        const filePath = path.join(developersDir, group.slug, "index.html");
        if (!fs.existsSync(filePath)) {
            problems.push(`Missing developer page: ${group.slug}`);
            continue;
        }

        const current = fs.readFileSync(filePath, "utf8");
        let next = current;
        next = replaceAllLiteral(
            next,
            `carrying a ${group.name} developer credit`,
            `grouped under the recorded developer credit ${group.name}`
        );
        next = replaceAllLiteral(
            next,
            `currently carrying a ${group.name} developer credit`,
            `currently grouped under the recorded developer credit ${group.name}`
        );

        if (/carrying a [^<"\n]+ developer credit/i.test(next)) {
            problems.push(`Uncorrected developer-credit article in ${group.slug}`);
        }

        if (next !== current) {
            fs.writeFileSync(filePath, next, "utf8");
            changed += 1;
        }
    }

    if (problems.length) {
        throw new Error(problems.join("\n"));
    }

    console.log(`[developers-copy] Pages corrected: ${changed}`);
}

main();
