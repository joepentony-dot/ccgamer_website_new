#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { applyTemplate, readTemplate } = require("./template-engine");

const SITE_ROOT = "https://www.cheekycommodoregamer.co.uk";
const repoRoot = path.resolve(__dirname, "..");
const gamesDir = path.join(repoRoot, "games");
const gamesJsonPath = path.join(gamesDir, "games.json");
const sitemapGamesPath = path.join(repoRoot, "sitemap-games.xml");
const gameTemplatePath = path.join(repoRoot, "templates", "game-template.html");
const redirectTemplatePath = path.join(repoRoot, "templates", "game-redirect-template.html");

function slugify(text) {
    return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function toGameId(slug) {
    return String(slug || "").replace(/-/g, "_");
}

function stripHtml(text) {
    return String(text || "").replace(/<[^>]*>/g, "").trim();
}

function normalizeThumbnail(thumbnail, slug) {
    const raw = String(thumbnail || "").trim();
    if (!raw) return `${toGameId(slug)}_europe.jpg`;
    return raw.includes("/") ? path.basename(raw) : raw;
}

function normalizeDescription(description, gameName) {
    const cleaned = stripHtml(description);
    if (cleaned) return cleaned;
    return `${gameName} on Commodore — screenshots, manual, downloads and video.`;
}

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith("--")) continue;
        const key = token.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith("--")) {
            args[key] = true;
            continue;
        }
        args[key] = next;
        i += 1;
    }
    return args;
}

function readGamesJson() {
    const raw = fs.readFileSync(gamesJsonPath, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
        throw new Error("games.json is not an array.");
    }
    return data;
}

function writeGamesJson(games) {
    fs.writeFileSync(gamesJsonPath, `${JSON.stringify(games, null, 2)}\n`, "utf8");
}

function validateGame(game) {
    const slug = slugify(game.slug || game.title);
    const title = stripHtml(game.title);
    const year = String(game.year || "").trim();
    const publisher = stripHtml(game.publisher || game.developer || "Unknown Publisher");
    const thumbnail = normalizeThumbnail(game.thumbnail, slug);
    const description = normalizeDescription(game.description || game.desc, title || "Game");

    const issues = [];
    if (!slug) issues.push("missing slug");
    if (!title) issues.push("missing title");
    if (!year) issues.push("missing year");
    if (!publisher) issues.push("missing publisher");
    if (!thumbnail) issues.push("missing thumbnail");

    return {
        issues,
        slug,
        title,
        year,
        publisher,
        thumbnail,
        description
    };
}

function loadTemplates() {
    return {
        gameTemplate: readTemplate(gameTemplatePath),
        redirectTemplate: readTemplate(redirectTemplatePath)
    };
}

function generatePageFiles(game, templates, options = {}) {
    const normalized = validateGame(game);
    if (normalized.issues.length > 0) {
        throw new Error(`${normalized.slug || game.slug || "unknown"}: ${normalized.issues.join(", ")}`);
    }

    const values = {
        GAME_NAME: normalized.title,
        YEAR: normalized.year,
        PUBLISHER: normalized.publisher,
        SLUG: normalized.slug,
        THUMBNAIL: normalized.thumbnail,
        DESCRIPTION: normalized.description
    };

    const canonicalDir = path.join(gamesDir, normalized.slug);
    const canonicalPath = path.join(canonicalDir, "index.html");
    const redirectPath = path.join(gamesDir, `${normalized.slug}.html`);

    const shouldWriteCanonical = options.force || !fs.existsSync(canonicalPath);
    const shouldWriteRedirect = options.force || !fs.existsSync(redirectPath);

    if (shouldWriteCanonical || shouldWriteRedirect) {
        fs.mkdirSync(canonicalDir, { recursive: true });
    }

    if (shouldWriteCanonical) {
        fs.writeFileSync(canonicalPath, applyTemplate(templates.gameTemplate, values), "utf8");
    }
    if (shouldWriteRedirect) {
        fs.writeFileSync(redirectPath, applyTemplate(templates.redirectTemplate, values), "utf8");
    }

    return {
        slug: normalized.slug,
        wroteCanonical: shouldWriteCanonical,
        wroteRedirect: shouldWriteRedirect
    };
}

function ensureGameEntry(games, payload) {
    const slug = slugify(payload.slug || payload.title);
    if (!slug) {
        throw new Error("--slug or --title is required for --add");
    }

    const existing = games.find((game) => slugify(game.slug || game.title) === slug);
    if (existing) {
        return { games, slug, added: false };
    }

    const title = stripHtml(payload.title || slug);
    const yearValue = Number(payload.year);
    const year = Number.isFinite(yearValue) ? yearValue : payload.year;
    const publisher = stripHtml(payload.publisher || "Unknown Publisher");
    const thumbnail = normalizeThumbnail(payload.thumbnail, slug);
    const description = normalizeDescription(payload.description, title);

    const entry = {
        system: payload.platform || "C64",
        id: toGameId(slug),
        slug,
        title,
        sorttitle: title,
        year,
        genres: [],
        collections: [],
        videoid: "",
        thumbnail: `resources/images/thumbnails/all/${thumbnail}`,
        music: [],
        pdf: "",
        disk: [],
        lemon: [],
        description,
        credits: {
            publisher: [publisher],
            producer: "",
            coder: [],
            graphics: [],
            musician: [],
            re_releaser: [],
            developer: ""
        },
        developer: ""
    };

    const next = [...games, entry].sort((a, b) => String(a.sorttitle || a.title || "").localeCompare(String(b.sorttitle || b.title || "")));
    return { games: next, slug, added: true };
}

function writeSitemapGames(games) {
    const today = new Date().toISOString().slice(0, 10);
    const slugs = games
        .map((game) => slugify(game.slug || game.title))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    for (const slug of slugs) {
        lines.push("  <url>");
        lines.push(`    <loc>${SITE_ROOT}/games/${slug}/</loc>`);
        lines.push(`    <lastmod>${today}</lastmod>`);
        lines.push("  </url>");
    }

    lines.push("</urlset>");
    fs.writeFileSync(sitemapGamesPath, `${lines.join("\n")}\n`, "utf8");
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const templates = loadTemplates();
    let games = readGamesJson();

    let addedGame = false;

    if (args.add) {
        const result = ensureGameEntry(games, args);
        games = result.games;
        if (result.added) {
            writeGamesJson(games);
            addedGame = true;
            console.log(`[UPDATE] games/games.json added slug: ${result.slug}`);
        } else {
            console.log(`[SKIP] games/games.json slug already exists: ${result.slug}`);
        }
    }

    let createdCanonical = 0;
    let createdRedirect = 0;

    for (const game of games) {
        const outcome = generatePageFiles(game, templates, { force: Boolean(args.force) });
        if (outcome.wroteCanonical) createdCanonical += 1;
        if (outcome.wroteRedirect) createdRedirect += 1;
    }

    if (addedGame || args["sync-sitemap"]) {
        writeSitemapGames(games);
        console.log(`[UPDATE] ${path.relative(repoRoot, sitemapGamesPath)}`);
    }

    console.log(`[DONE] Canonical pages created: ${createdCanonical}; redirect stubs created: ${createdRedirect}.`);
}

main();
