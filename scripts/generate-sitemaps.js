#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { generateRetroPages } = require("./generate-retro-pages");

const SITE_ROOT = "https://www.cheekycommodoregamer.co.uk";

const repoRoot = path.resolve(__dirname, "..");
const gamesDir = path.join(repoRoot, "games");
const sitemapPath = path.join(repoRoot, "sitemap.xml");
const sitemapGamesPath = path.join(repoRoot, "sitemap-games.xml");
const sitemapPagesPath = path.join(repoRoot, "sitemap-pages.xml");

const excludedGameDirs = new Set(["collections", "genres"]);

function formatDate(date) {
    return date.toISOString().split("T")[0];
}

function getLastmod(filePath) {
    try {
        const stat = fs.statSync(filePath);
        return formatDate(stat.mtime);
    } catch (err) {
        return formatDate(new Date());
    }
}

function buildUrlEntry(loc, lastmod) {
    const safeLoc = String(loc).replace(/&/g, '&amp;');
    return `  <url>\n    <loc>${safeLoc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
}

function buildSitemap(urls) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n`
        + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
        + `${urls.join("\n")}\n`
        + `</urlset>\n`;
}

function buildSitemapIndex(entries) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n`
        + `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
        + `${entries.join("\n")}\n`
        + `</sitemapindex>\n`;
}

function buildSitemapIndexEntry(loc, lastmod) {
    const safeLoc = String(loc).replace(/&/g, '&amp;');
    return `  <sitemap>\n    <loc>${safeLoc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`;
}

function getGameSlugs() {
    const entries = fs.readdirSync(gamesDir, { withFileTypes: true });
    const slugs = [];

    entries.forEach((entry) => {
        if (!entry.isDirectory()) return;
        if (excludedGameDirs.has(entry.name)) return;

        const indexPath = path.join(gamesDir, entry.name, "index.html");
        if (!fs.existsSync(indexPath)) return;

        slugs.push({
            slug: entry.name,
            indexPath
        });
    });

    return slugs;
}

function buildGameSitemap() {
    const gameSlugs = getGameSlugs();
    const urls = gameSlugs.map(({ slug, indexPath }) => {
        const loc = `${SITE_ROOT}/games/${slug}/`;
        const lastmod = getLastmod(indexPath);
        return buildUrlEntry(loc, lastmod);
    });

    const xml = buildSitemap(urls);
    fs.writeFileSync(sitemapGamesPath, xml, "utf8");

    return {
        count: gameSlugs.length,
        urls: urls.length
    };
}

function buildPagesSitemap() {
    const pageEntries = [
        { loc: `${SITE_ROOT}/`, file: path.join(repoRoot, "index.html") },
        { loc: `${SITE_ROOT}/home.html`, file: path.join(repoRoot, "home.html") },
        { loc: `${SITE_ROOT}/about.html`, file: path.join(repoRoot, "about.html") },
        { loc: `${SITE_ROOT}/contact.html`, file: path.join(repoRoot, "contact.html") },
        { loc: `${SITE_ROOT}/emulation.html`, file: path.join(repoRoot, "emulation.html") },
        { loc: `${SITE_ROOT}/games/`, file: path.join(repoRoot, "games", "index.html") },
        { loc: `${SITE_ROOT}/games/collections/`, file: path.join(repoRoot, "games", "collections", "index.html") },
        { loc: `${SITE_ROOT}/games/collections/amiga-demo-music.html`, file: path.join(repoRoot, "games", "collections", "amiga-demo-music.html") },
        { loc: `${SITE_ROOT}/games/collections/retro-events.html`, file: path.join(repoRoot, "games", "collections", "retro-events.html") },
        { loc: `${SITE_ROOT}/games/collections/retro-specials.html`, file: path.join(repoRoot, "games", "collections", "retro-specials.html") },
        { loc: `${SITE_ROOT}/games/genres/`, file: path.join(repoRoot, "games", "genres", "index.html") },
        { loc: `${SITE_ROOT}/quiz/`, file: path.join(repoRoot, "quiz", "index.html") },
        { loc: `${SITE_ROOT}/quiz/quiz.html`, file: path.join(repoRoot, "quiz", "quiz.html") },
        { loc: `${SITE_ROOT}/redirect.html`, file: path.join(repoRoot, "redirect.html") },
        { loc: `${SITE_ROOT}/complete-index.html`, file: path.join(repoRoot, "complete-index.html") },
        { loc: `${SITE_ROOT}/music/`, file: path.join(repoRoot, "music", "index.html") }
    ];

    const musicDir = path.join(repoRoot, "music");
    if (fs.existsSync(musicDir)) {
        fs.readdirSync(musicDir, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html' && entry.name !== 'composer.html')
            .forEach((entry) => {
                const slug = entry.name.replace(/\.html$/i, '');
                pageEntries.push({ loc: `${SITE_ROOT}/music/${slug}/`, file: path.join(musicDir, entry.name) });
            });
    }

    const retroPages = generateRetroPages();
    const uniqueEntries = [...pageEntries, ...retroPages.pageEntries].filter((entry, index, arr) => (
        arr.findIndex((candidate) => candidate.loc === entry.loc) === index
    ));

    const urls = uniqueEntries.map((entry) => {
        const lastmod = getLastmod(entry.file);
        return buildUrlEntry(entry.loc, lastmod);
    });

    const xml = buildSitemap(urls);
    fs.writeFileSync(sitemapPagesPath, xml, "utf8");

    return {
        urls: urls.length,
        retroUrls: retroPages.pageEntries.length
    };
}

function buildRootSitemap() {
    const now = formatDate(new Date());
    const entries = [
        buildSitemapIndexEntry(`${SITE_ROOT}/sitemap-games.xml`, now),
        buildSitemapIndexEntry(`${SITE_ROOT}/sitemap-pages.xml`, now)
    ];

    const xml = buildSitemapIndex(entries);
    fs.writeFileSync(sitemapPath, xml, "utf8");
}

function main() {
    const gameStats = buildGameSitemap();
    const pageStats = buildPagesSitemap();
    buildRootSitemap();

    console.log(`Game pages found: ${gameStats.count}`);
    console.log(`URLs written (games): ${gameStats.urls}`);
    console.log(`URLs written (pages): ${pageStats.urls}`);
    console.log(`Retro video pages generated: ${pageStats.retroUrls}`);
    console.log("Sitemaps written:");
    console.log(`- ${sitemapPath}`);
    console.log(`- ${sitemapGamesPath}`);
    console.log(`- ${sitemapPagesPath}`);
}

main();
