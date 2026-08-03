#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
    buildPublisherGroups,
    getPublisherNames,
    normalizePublisherKey
} = require("./publisher-utils");

const repoRoot = path.resolve(__dirname, "..");
const gamesPath = path.join(repoRoot, "games", "games.json");
const publishersDir = path.join(repoRoot, "resources", "images", "publishers");
const CORRECTION_BRANCH = "codex/correct-publisher-assignments";

const REQUESTED_CORRECTIONS = new Map([
    ["popeye-c64-popeye-donpriestley", "Piranha"],
    ["give-my-regards-to-broad-street", "Argus Press Software"],
    ["thing-on-a-spring", "Gremlin Graphics"],
    ["soccer-boss", "Alternative Software"],
    ["miner-2049er", "Big Five Software"],
    ["black-knight", "Interdisc"],
    ["arachnophobia", "Titus Software"]
]);

const RETIRED_PUBLISHERS = new Set([
    "macmillan",
    "ozisoft",
    "peaksoft",
    "reston publishing company",
    "roflow computer software",
    "titus"
]);

const RETIRED_SLUGS = [
    "macmillan",
    "ozisoft",
    "peaksoft",
    "reston-publishing-company",
    "roflow-computer-software",
    "titus"
];

const LOGO_RENAMES = new Map([
    ["64-supersoft.png", "supersoft.png"],
    ["origin.png", "origin-systems.png"],
    ["rabbit.png", "rabbit-software.png"],
    ["rack-hewson.png", "rack-it-hewson.png"],
    ["rack-it.png", "reaktor-software.png"],
    ["sci.png", "the-sales-curve.png"],
    ["sega-corporation.png", "sega.png"],
    ["task-set.png", "taskset.png"],
    ["the-one.png", "the-one-amiga.png"],
    ["tronic.png", "tronix-publishing.png"]
]);

function normalize(value) {
    return String(value ?? "")
        .trim()
        .replace(/[’‘]/g, "'")
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function asList(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (value === null || value === undefined || value === "") return [];
    return [String(value).trim()].filter(Boolean);
}

function effectivePublishers(game) {
    const creditPublishers = asList(game?.credits?.publisher);
    return creditPublishers.length ? creditPublishers : asList(game?.publisher);
}

function setPublishers(game, publishers) {
    const values = [...publishers];
    game.publisher = values.length === 1 ? values[0] : values;

    if (!game.credits || typeof game.credits !== "object" || Array.isArray(game.credits)) {
        game.credits = {};
    }
    game.credits.publisher = values;
}

function run(command, args) {
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        stdio: "inherit",
        env: process.env
    });

    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(" ")} failed with status ${result.status ?? 1}.`);
    }
}

function applyRequestedCorrections() {
    if (!fs.existsSync(gamesPath)) {
        throw new Error(`Missing ${path.relative(repoRoot, gamesPath)}`);
    }

    const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
    if (!Array.isArray(games)) {
        throw new Error("games/games.json must contain a top-level array.");
    }

    const changed = [];

    for (const [slug, publisher] of REQUESTED_CORRECTIONS) {
        const matches = games.filter((game) => String(game?.slug || "") === slug);
        if (matches.length !== 1) {
            throw new Error(`${slug} matched ${matches.length} game records; expected exactly one.`);
        }

        const game = matches[0];
        const before = effectivePublishers(game);
        setPublishers(game, [publisher]);
        changed.push(`${game.title || slug}: ${before.join(" | ") || "none"} -> ${publisher}`);
    }

    for (const game of games) {
        const current = effectivePublishers(game);
        const filtered = current.filter((publisher) => !RETIRED_PUBLISHERS.has(normalize(publisher)));

        if (filtered.length === current.length) continue;
        if (!filtered.length) {
            throw new Error(
                `${game.title || game.slug || "Unknown game"} would have no publisher after retired labels were removed.`
            );
        }
        setPublishers(game, filtered);
    }

    const leftovers = [];
    for (const game of games) {
        const assigned = [
            ...asList(game?.publisher),
            ...asList(game?.credits?.publisher)
        ];
        for (const publisher of assigned) {
            if (RETIRED_PUBLISHERS.has(normalize(publisher))) {
                leftovers.push(`${game.slug || game.title}: ${publisher}`);
            }
        }
    }

    if (leftovers.length) {
        throw new Error(`Retired publisher labels remain:\n${leftovers.join("\n")}`);
    }

    fs.writeFileSync(gamesPath, `${JSON.stringify(games, null, 2)}\n`, "utf8");

    console.log("[publisher-corrections] Applied:");
    changed.forEach((line) => console.log(`  - ${line}`));
}

function renamePublisherLogos() {
    for (const [oldName, newName] of LOGO_RENAMES) {
        const sourcePath = path.join(publishersDir, oldName);
        if (!fs.existsSync(sourcePath)) continue;

        const destinationPath = path.join(publishersDir, newName);
        fs.rmSync(destinationPath, { force: true });
        fs.renameSync(sourcePath, destinationPath);
        console.log(`[publisher-corrections] Renamed logo: ${oldName} -> ${newName}`);
    }
}

function removeRetiredPublisherAssets() {
    const extensions = ["png", "webp", "jpg", "jpeg", "svg"];

    for (const slug of RETIRED_SLUGS) {
        for (const extension of extensions) {
            fs.rmSync(path.join(publishersDir, `${slug}.${extension}`), { force: true });
        }
    }

    fs.rmSync(path.join(publishersDir, "game_publisher_changes.csv"), { force: true });
    fs.rmSync(path.join(publishersDir, "remove_publishers.txt"), { force: true });
}

function verifyRequestedCorrections() {
    const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
    const problems = [];

    for (const [slug, expectedPublisher] of REQUESTED_CORRECTIONS) {
        const game = games.find((entry) => entry.slug === slug);
        if (!game) {
            problems.push(`Missing game record: ${slug}`);
            continue;
        }

        const publishers = getPublisherNames(game);
        if (publishers.length !== 1 || publishers[0] !== expectedPublisher) {
            problems.push(
                `${slug}: expected only ${expectedPublisher}, found ${publishers.join(" | ") || "none"}`
            );
        }
    }

    for (const game of games) {
        const assigned = [
            ...asList(game?.publisher),
            ...asList(game?.credits?.publisher)
        ];
        for (const publisher of assigned) {
            if (RETIRED_PUBLISHERS.has(normalizePublisherKey(publisher))) {
                problems.push(`${game.slug || game.title}: retired publisher remains (${publisher})`);
            }
        }
    }

    const groups = buildPublisherGroups(games);
    const groupSlugs = new Set(groups.map((group) => group.slug));

    for (const slug of RETIRED_SLUGS) {
        if (groupSlugs.has(slug)) {
            problems.push(`Retired publisher group still generated: ${slug}`);
        }
        if (fs.existsSync(path.join(repoRoot, "games", "publishers", slug))) {
            problems.push(`Retired publisher directory still exists: games/publishers/${slug}`);
        }
    }

    if (!groupSlugs.has("titus-software")) {
        problems.push("Titus Software publisher group is missing.");
    }

    if (problems.length) {
        throw new Error(problems.join("\n"));
    }

    console.log("[publisher-corrections] Validation passed.");
}

function removeTemporaryBranchFiles() {
    const temporaryPaths = [
        path.join(repoRoot, ".github", "workflows", "apply-publisher-corrections.yml"),
        path.join(repoRoot, "scripts", "apply-publisher-corrections.js"),
        path.join(repoRoot, "publisher-correction-trigger.txt"),
        path.join(repoRoot, "docs", "publisher-correction-request.md"),
        path.join(repoRoot, "docs", "publisher-correction-request-2.md")
    ];

    temporaryPaths.forEach((filePath) => fs.rmSync(filePath, { force: true }));
}

function commitOneTimeCorrection() {
    const isCorrectionRun = process.env.GITHUB_ACTIONS === "true"
        && process.env.GITHUB_HEAD_REF === CORRECTION_BRANCH;
    if (!isCorrectionRun) {
        console.log("[publisher-corrections] No one-time PR rebuild required for this run.");
        return;
    }

    console.log(`[publisher-corrections] Running corrective rebuild for ${CORRECTION_BRANCH}.`);

    renamePublisherLogos();
    removeRetiredPublisherAssets();
    run(process.execPath, [path.join(repoRoot, "scripts", "rebuild-games.js")]);
    verifyRequestedCorrections();
    run("git", ["diff", "--check"]);

    run("git", ["fetch", "origin", "main", "--depth=1"]);
    run("git", ["checkout", "origin/main", "--", ".github/workflows/games-publishing.yml"]);
    run("git", ["checkout", "origin/main", "--", "scripts/remove-invalid-publisher-labels.js"]);
    removeTemporaryBranchFiles();

    run("git", ["add", "-A"]);
    run("git", ["reset", "--", "index.html", "home.html", "resources/css/intro.css", "js/index-intro.js"]);

    const status = spawnSync("git", ["diff", "--cached", "--quiet"], {
        cwd: repoRoot,
        stdio: "inherit",
        env: process.env
    });

    if (status.status === 0) {
        throw new Error("The corrective rebuild produced no staged changes.");
    }
    if (status.status !== 1) {
        throw new Error(`Could not inspect staged corrections (status ${status.status ?? "unknown"}).`);
    }

    run("git", ["config", "user.name", "github-actions[bot]"]);
    run("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
    run("git", ["commit", "-m", "Correct publisher assignments and regenerate archives"]);
    run("git", ["push", "origin", `HEAD:${CORRECTION_BRANCH}`]);

    console.log("[publisher-corrections] Corrective commit pushed to the PR branch.");
}

function main() {
    applyRequestedCorrections();
    commitOneTimeCorrection();
}

main();
