#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const sitemapPath = path.join(repoRoot, "sitemap-pages.xml");
const downloadsPagePath = path.join(repoRoot, "games", "downloads", "index.html");
const downloadsPageRelative = "games/downloads/index.html";
const DOWNLOAD_URL = "https://www.cheekycommodoregamer.co.uk/games/downloads/";

function fail(message) {
    console.error(`[downloads-sitemap] ${message}`);
    process.exit(1);
}

function pageLastModified() {
    if (!fs.existsSync(downloadsPagePath)) {
        fail("Missing generated games/downloads/index.html.");
    }

    try {
        execFileSync("git", ["diff", "--quiet", "--", downloadsPageRelative], {
            cwd: repoRoot,
            stdio: "ignore"
        });

        const committedDate = execFileSync(
            "git",
            ["log", "-1", "--format=%cI", "--", downloadsPageRelative],
            {
                cwd: repoRoot,
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"]
            }
        ).trim();

        if (committedDate) return committedDate.slice(0, 10);
    } catch (error) {
        // A changed or newly generated page should use today's date.
    }

    return new Date().toISOString().slice(0, 10);
}

function main() {
    if (!fs.existsSync(sitemapPath)) {
        fail("Missing sitemap-pages.xml.");
    }

    const lastmod = pageLastModified();
    const entry = `  <url>\n    <loc>${DOWNLOAD_URL}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
    let xml = fs.readFileSync(sitemapPath, "utf8");
    const escapedUrl = DOWNLOAD_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existingPattern = new RegExp(
        `  <url>\\s*<loc>${escapedUrl}<\\/loc>\\s*<lastmod>[^<]+<\\/lastmod>\\s*<\\/url>`,
        "m"
    );

    if (existingPattern.test(xml)) {
        xml = xml.replace(existingPattern, entry);
    } else {
        const genresMarker = "  <url>\n    <loc>https://www.cheekycommodoregamer.co.uk/games/genres/</loc>";
        if (xml.includes(genresMarker)) {
            xml = xml.replace(genresMarker, `${entry}\n${genresMarker}`);
        } else if (xml.includes("</urlset>")) {
            xml = xml.replace("</urlset>", `${entry}\n</urlset>`);
        } else {
            fail("sitemap-pages.xml does not contain a closing urlset element.");
        }
    }

    const occurrences = (xml.match(new RegExp(escapedUrl, "g")) || []).length;
    if (occurrences !== 1) {
        fail(`Expected one downloads URL in sitemap-pages.xml, found ${occurrences}.`);
    }

    fs.writeFileSync(sitemapPath, xml, "utf8");
    console.log(`[downloads-sitemap] Added or refreshed ${DOWNLOAD_URL} with lastmod ${lastmod}.`);
}

main();
