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
const CORRECTION_BRANCH = "codex/correct-publisher-assignments";

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

const RETIRED_PUBLISHERS = new Set([
    "macmillan",
    "ozisoft",
    "peaksoft",
    "reston publishing company",
    "roflow computer software",
    "titus"
]);

const PUBLISHER_OVERRIDES = new Map([
    ["android-nim", ["64 Tape Computing"]],
    ["arachnophobia", ["Titus Software"]],
    ["batman-the-caped-crusader", ["Ocean Software"]],
    ["black-knight", ["Interdisc"]],
    ["championship-wrestling", ["Epyx"]],
    ["donald-ducks-playground", ["Sierra On-Line"]],
    ["double-dare", ["Alternative Software"]],
    ["dreamweb", ["Empire Software"]],
    ["face-off", ["Activision"]],
    ["falcon-patrol", ["Virgin Games"]],
    ["give-my-regards-to-broad-street", ["Argus Press Software"]],
    ["herberts-dummy-run", ["Mikro-Gen"]],
    ["ikari-warriors", ["Elite"]],
    ["kung-fu-master", ["US Gold"]],
    ["miner-2049er", ["Big Five Software"]],
    ["mr-robot-and-his-robot-factory", ["Datamost"]],
    ["ninja", ["Mastertronic"]],
    ["paperboy", ["Elite"]],
    ["popeye-c64-popeye-donpriestley", ["Piranha"]],
    ["psycho-hopper", ["Mastertronic"]],
    ["raging-beast", ["Firebird"]],
    ["rebel", ["Virgin Games"]],
    ["soccer-boss", ["Alternative Software"]],
    ["tapper", ["US Gold"]],
    ["the-goonies", ["Datasoft"]],
    ["thing-on-a-spring", ["Gremlin Graphics"]],
    ["wwf-wrestlemania", ["Ocean Software"]]
]);

const REQUESTED_CORRECTIONS = new Map([
    ["popeye-c64-popeye-donpriestley", "Piranha"],
    ["give-my-regards-to-broad-street", "Argus Press Software"],
    ["thing-on-a-spring", "Gremlin Graphics"],
    ["soccer-boss", "Alternative Software"],
    ["miner-2049er", "Big Five Software"],
    ["black-knight", "Interdisc"],
    ["arachnophobia", "Titus Software"]
]);

const RETIRED_SLUGS = [
    "macmillan",
    "ozisoft",
    "peaksoft",
    "reston-publishing-company",
    "roflow-computer-software",
    "titus"
];

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}

function normalizePublishers(value) {
    if (Array.isArray(value)) return value.map((publisher) => String(publisher).trim()).filter(Boolean);
    if (value === null || value === undefined || value === "") return [];
    return [String(value).trim()].filter(Boolean);
}

function samePublishers(left, right) {
    return left.length === right.length
        && left.every((publisher, index) => publisher === right[index]);
}

function setPublishers(game, publishers) {
    const values = [...publishers];
    game.publisher = values.length === 1 ? values[0] : values;

    if (!game.credits || typeof game.credits !== "object" || Array.isArray(game.credits)) {
        game.credits = {};
    }
    game.credits.publisher = values;
}

function allAssignedPublishers(game) {
    return [
        ...normalizePublishers(game?.publisher),
        ...normalizePublishers(game?.credits?.publisher)
    ];
}

function effectivePublishers(game) {
    const creditPublishers = normalizePublishers(game?.credits?.publisher);
    return creditPublishers.length ? creditPublishers : normalizePublishers(game?.publisher);
}

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        stdio: "inherit",
        env: process.env,
        ...options
    });
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(" ")} failed with status ${result.status ?? 1}.`);
    }
}

function removeRetiredPublisherAssets() {
    const publishersDir = path.join(repoRoot, "resources", "images", "publishers");
    const extensions = ["png", "webp", "jpg", "jpeg", "svg"];

    for (const slug of RETIRED_SLUGS) {
        for (const extension of extensions) {
            fs.rmSync(path.join(publishersDir, `${slug}.${extension}`), { force: true });
        }
    }

    fs.rmSync(path.join(publishersDir, "game_publisher_changes.csv"), { force: true });
    fs.rmSync(path.join(publishersDir, "remove_publishers.txt"), { force: true });
}

function applyPublisherCleanup() {
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
        if (!game || typeof game !== "object") return;

        const slug = String(game.slug || "");
        const currentPublishers = effectivePublishers(game);
        const override = PUBLISHER_OVERRIDES.get(slug);

        if (override) {
            correctedSlugs.add(slug);
            if (!samePublishers(currentPublishers, override)
                || !samePublishers(normalizePublishers(game.publisher), override)) {
                setPublishers(game, override);
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

        const rootPublishers = normalizePublishers(game.publisher);
        const creditPublishers = normalizePublishers(game?.credits?.publisher);
        const source = creditPublishers.length ? creditPublishers : rootPublishers;
        const filtered = source.filter((publisher) => {
            const key = normalize(publisher);
            const isInvalid = INVALID_PUBLISHERS.has(key) || RETIRED_PUBLISHERS.has(key);
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

        if (samePublishers(source, filtered)) return;
        if (!filtered.length) {
            throw new Error(
                `${game.title || slug || "Unknown game"} would have no publisher after removing retired labels.`
            );
        }
        setPublishers(game, filtered);
    });

    const missingOverrides = [...PUBLISHER_OVERRIDES.keys()]
        .filter((slug) => !correctedSlugs.has(slug));
    if (missingOverrides.length) {
        throw new Error(`Publisher override targets were not found: ${missingOverrides.join(", ")}`);
    }

    const remainingInvalidAssignments = [];
    games.forEach((game) => {
        allAssignedPublishers(game).forEach((publisher) => {
            const key = normalize(publisher);
            if (!INVALID_PUBLISHERS.has(key) && !RETIRED_PUBLISHERS.has(key)) return;
            remainingInvalidAssignments.push({
                game: String(game.slug || game.id || game.title || "Unknown game"),
                publisher: String(publisher)
            });
        });
    });

    if (remainingInvalidAssignments.length) {
        throw new Error(
            `Invalid or retired publisher labels remain assigned: ${remainingInvalidAssignments
                .map((entry) => `${entry.game} (${entry.publisher})`)
                .join(", ")}`
        );
    }

    if (removals.length || corrections.length) {
        fs.writeFileSync(gamesPath, `${JSON.stringify(games, null, 2)}\n`, "utf8");
    }

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

    if (!removals.length && !corrections.length) {
        console.log("[publisher-cleanup] Publisher assignments are already current.");
    }

    console.log("[publisher-cleanup] No other credit fields were changed.");
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

    games.forEach((game) => {
        allAssignedPublishers(game).forEach((publisher) => {
            if (RETIRED_PUBLISHERS.has(normalizePublisherKey(publisher))) {
                problems.push(`${game.slug || game.title}: retired publisher remains (${publisher})`);
            }
        });
    });

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

    console.log("[publisher-cleanup] Requested publisher correction validation passed.");
}

function commitOneTimeCorrection() {
    const isCorrectionRun = process.env.GITHUB_ACTIONS === "true"
        && process.env.GITHUB_HEAD_REF === CORRECTION_BRANCH;
    if (!isCorrectionRun) return;

    console.log(`[publisher-cleanup] Running one-time corrective rebuild for ${CORRECTION_BRANCH}.`);
    removeRetiredPublisherAssets();
    run(process.execPath, [path.join(repoRoot, "scripts", "rebuild-games.js")]);
    verifyRequestedCorrections();
    run("git", ["diff", "--check"]);

    run("git", ["fetch", "origin", "main", "--depth=1"]);
    run("git", ["checkout", "origin/main", "--", ".github/workflows/games-publishing.yml"]);
    run("git", ["checkout", "origin/main", "--", "scripts/remove-invalid-publisher-labels.js"]);

    const temporaryPaths = [
        path.join(repoRoot, ".github", "workflows", "apply-publisher-corrections.yml"),
        path.join(repoRoot, "scripts", "apply-publisher-corrections.js"),
        path.join(repoRoot, "publisher-correction-trigger.txt")
    ];
    temporaryPaths.forEach((filePath) => fs.rmSync(filePath, { force: true }));

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
        throw new Error(`Could not inspect staged publisher corrections (status ${status.status ?? "unknown"}).`);
    }

    run("git", ["config", "user.name", "github-actions[bot]"]);
    run("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
    run("git", ["commit", "-m", "Correct publisher assignments and regenerate archives"]);
    run("git", ["push", "origin", `HEAD:${CORRECTION_BRANCH}`]);

    console.log("[publisher-cleanup] Corrective publisher commit pushed to the PR branch.");
}

function main() {
    applyPublisherCleanup();
    commitOneTimeCorrection();
}

main();
