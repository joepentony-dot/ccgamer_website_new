#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { buildPublisherGroups } = require("./publisher-utils");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const START_MARKER = "<!-- CCG-PUBLISHER-SEO:START -->";
const END_MARKER = "<!-- CCG-PUBLISHER-SEO:END -->";
const SCHEMA_START_MARKER = "<!-- CCG-PUBLISHER-SCHEMA:START -->";
const SCHEMA_END_MARKER = "<!-- CCG-PUBLISHER-SCHEMA:END -->";

const gamesPath = path.join(repoRoot, "games", "games.json");
const profilesPath = path.join(repoRoot, "data", "publisher-profiles.json");
const publishersDir = path.join(repoRoot, "games", "publishers");

function fail(message) {
    console.error(`[publisher-seo] ${message}`);
    process.exit(1);
}

function readJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        fail(`Could not parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
    }
}

function writeFileIfChanged(filePath, content) {
    const next = String(content);
    const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    if (previous === next) return false;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, next, "utf8");
    return true;
}

function htmlEscape(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function jsonForHtml(value) {
    return JSON.stringify(value, null, 2)
        .replace(/</g, "\\u003c")
        .replace(/-->/g, "--\\u003e");
}

function stripHtml(value) {
    return String(value || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function truncateDescription(value, maxLength = 158) {
    const text = stripHtml(value);
    if (text.length <= maxLength) return text;
    const shortened = text.slice(0, maxLength - 1).replace(/\s+\S*$/, "").trim();
    return `${shortened}…`;
}

function removeMarkedBlock(html, startMarker, endMarker) {
    const start = html.indexOf(startMarker);
    if (start === -1) return html;
    const end = html.indexOf(endMarker, start);
    if (end === -1) return html;
    return `${html.slice(0, start)}${html.slice(end + endMarker.length)}`;
}

function replaceTitle(html, title) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${htmlEscape(title)}</title>`);
}

function replaceMeta(html, selector, value) {
    const escaped = htmlEscape(value);
    const attribute = selector.attribute;
    const name = selector.name;
    const pattern = new RegExp(`<meta\\s+${attribute}="${name}"\\s+content="[^"]*"\\s*\/?>`, "i");
    if (!pattern.test(html)) return html;
    return html.replace(pattern, `<meta ${attribute}="${name}" content="${escaped}">`);
}

function replaceHeroIntro(html, text) {
    const pattern = /(<p class="ccg-publishers-hero__intro">)[\s\S]*?(<\/p>)/i;
    if (!pattern.test(html)) return html;
    return html.replace(pattern, `$1\n                    ${htmlEscape(text)}\n                $2`);
}

function platformLabel(group) {
    if (group.c64Count && group.amigaCount) return "C64 & Amiga";
    if (group.c64Count) return "Commodore 64";
    if (group.amigaCount) return "Amiga";
    return "retro";
}

function archiveYears(group) {
    if (!group.firstYear || !group.lastYear) return "the years currently represented in the archive";
    if (group.firstYear === group.lastYear) return String(group.firstYear);
    return `${group.firstYear}–${group.lastYear}`;
}

function plural(count, singular, pluralForm = `${singular}s`) {
    return `${count} ${count === 1 ? singular : pluralForm}`;
}

function normalizeGenres(game) {
    const raw = game?.genres || game?.genre || [];
    if (Array.isArray(raw)) return raw.map((item) => String(item || "").trim()).filter(Boolean);
    if (typeof raw === "string") return raw.split(",").map((item) => item.trim()).filter(Boolean);
    return [];
}

function genreSlug(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getPublisherGames(group, fullGameMap) {
    return group.games
        .map((record) => fullGameMap.get(record.slug) || record)
        .filter(Boolean);
}

function selectArchiveGames(games, limit = 6) {
    return [...games]
        .sort((a, b) => {
            const ratingA = Number(a?.ccg_rating);
            const ratingB = Number(b?.ccg_rating);
            const safeA = Number.isFinite(ratingA) ? ratingA : -1;
            const safeB = Number.isFinite(ratingB) ? ratingB : -1;
            if (safeA !== safeB) return safeB - safeA;

            const videoA = String(a?.videoid || a?.video || a?.youtube || "").trim() ? 1 : 0;
            const videoB = String(b?.videoid || b?.video || b?.youtube || "").trim() ? 1 : 0;
            if (videoA !== videoB) return videoB - videoA;

            return String(a?.title || "").localeCompare(String(b?.title || ""), "en", { sensitivity: "base" });
        })
        .slice(0, limit);
}

function selectGenres(games, limit = 5) {
    const counts = new Map();
    games.forEach((game) => {
        normalizeGenres(game).forEach((genre) => {
            const key = genre.toLowerCase();
            if (key === "top picks") return;
            const current = counts.get(key) || { name: genre, count: 0 };
            current.count += 1;
            counts.set(key, current);
        });
    });

    return Array.from(counts.values())
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
        .slice(0, limit);
}

function buildArchiveParagraphs(group, games) {
    const platformParts = [];
    if (group.c64Count) platformParts.push(plural(group.c64Count, "Commodore 64 game"));
    if (group.amigaCount) platformParts.push(plural(group.amigaCount, "Amiga game"));
    const otherCount = Math.max(0, group.count - group.c64Count - group.amigaCount);
    if (otherCount) platformParts.push(plural(otherCount, "other-format game"));

    const selected = selectArchiveGames(games, 5);
    const selectedNames = selected.map((game) => String(game?.title || "").trim()).filter(Boolean);
    const examples = selectedNames.length
        ? `Titles represented here include ${selectedNames.join(", ")}.`
        : "The available titles are listed below.";

    return [
        `The Cheeky Commodore Gamer database currently credits ${group.name} on ${plural(group.count, "game")} spanning ${archiveYears(group)}. ${platformParts.length ? `The present archive contains ${platformParts.join(" and ")}.` : ""}`.trim(),
        `${examples} This page is generated from the main game database and updates when new releases are added with the same publisher credit.`
    ];
}

function buildSelectedGameLinks(games) {
    const selected = selectArchiveGames(games);
    if (!selected.length) return "";

    return `<div class="ccg-publisher-seo__links" aria-label="Selected games from this publisher">
        <h3>Selected games in this archive</h3>
        <div class="ccg-publisher-seo__chips">
            ${selected.map((game) => `<a href="/games/${htmlEscape(game.slug)}/">${htmlEscape(game.title)}</a>`).join("\n            ")}
        </div>
    </div>`;
}

function buildGenreLinks(games) {
    const genres = selectGenres(games);
    if (!genres.length) return "";

    return `<div class="ccg-publisher-seo__links" aria-label="Related game genres">
        <h3>Genres represented</h3>
        <div class="ccg-publisher-seo__chips">
            ${genres.map((genre) => `<a href="/games/genres/${htmlEscape(genreSlug(genre.name))}-games.html">${htmlEscape(genre.name)} games <span>${genre.count}</span></a>`).join("\n            ")}
        </div>
    </div>`;
}

function buildFacts(group, profile) {
    const facts = [];
    if (profile?.founded) facts.push(["Founded", profile.founded]);
    if (Array.isArray(profile?.founders) && profile.founders.length) facts.push(["Founders", profile.founders.join(", ")]);
    if (profile?.location) facts.push(["Base", profile.location]);
    if (profile?.focus) facts.push(["Known for", profile.focus]);

    facts.push(["CCG archive", plural(group.count, "game")]);
    if (group.c64Count) facts.push(["Commodore 64", plural(group.c64Count, "game")]);
    if (group.amigaCount) facts.push(["Amiga", plural(group.amigaCount, "game")]);
    if (group.firstYear && group.lastYear) facts.push(["Years represented", archiveYears(group)]);

    return `<dl class="ccg-publisher-seo__facts">
        ${facts.map(([label, value]) => `<div><dt>${htmlEscape(label)}</dt><dd>${htmlEscape(value)}</dd></div>`).join("\n        ")}
    </dl>`;
}

function buildSources(profile) {
    if (!Array.isArray(profile?.sources) || !profile.sources.length) return "";
    const safeSources = profile.sources.filter((source) => /^https:\/\//i.test(String(source?.url || "")));
    if (!safeSources.length) return "";

    return `<details class="ccg-publisher-seo__sources">
        <summary>Publisher history sources</summary>
        <ul>
            ${safeSources.map((source) => `<li><a href="${htmlEscape(source.url)}" target="_blank" rel="noopener noreferrer">${htmlEscape(source.label || source.url)}</a></li>`).join("\n            ")}
        </ul>
    </details>`;
}

function buildSeoSection(group, profile, games) {
    const paragraphs = Array.isArray(profile?.history) && profile.history.length
        ? profile.history
        : buildArchiveParagraphs(group, games);

    const kicker = profile ? "Publisher history" : "Archive context";
    const heading = profile ? `${group.name}: Publisher History` : `About ${group.name} in the CCG Archive`;

    return `${START_MARKER}
            <section class="ccg-publisher-seo" id="publisher-background" aria-labelledby="publisher-background-title">
                <div class="ccg-publisher-seo__heading">
                    <p class="ccg-publishers-section__kicker">${htmlEscape(kicker)}</p>
                    <h2 id="publisher-background-title">${htmlEscape(heading)}</h2>
                </div>

                <div class="ccg-publisher-seo__layout">
                    <div class="ccg-publisher-seo__copy">
                        ${paragraphs.map((paragraph) => `<p>${htmlEscape(paragraph)}</p>`).join("\n                        ")}
                        ${buildSelectedGameLinks(games)}
                        ${buildGenreLinks(games)}
                        ${buildSources(profile)}
                    </div>
                    ${buildFacts(group, profile)}
                </div>
            </section>
            ${END_MARKER}`;
}

function buildProfileSchema(group, profile, metaTitle, metaDescription) {
    if (!profile) return "";
    const canonical = `${SITE_ORIGIN}/games/publishers/${group.slug}/`;
    const organization = {
        "@type": "Organization",
        "@id": `${canonical}#publisher`,
        name: group.name,
        description: stripHtml(profile.history.join(" "))
    };

    if (profile.founded) organization.foundingDate = String(profile.founded);
    if (profile.location) {
        organization.foundingLocation = {
            "@type": "Place",
            name: profile.location
        };
    }
    if (Array.isArray(profile.founders) && profile.founders.length) {
        organization.founder = profile.founders.map((name) => ({ "@type": "Person", name }));
    }

    const schema = {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        "@id": `${canonical}#publisher-history`,
        url: canonical,
        name: metaTitle,
        description: metaDescription,
        mainEntity: organization,
        isPartOf: {
            "@type": "WebSite",
            name: "Cheeky Commodore Gamer",
            url: SITE_ORIGIN
        }
    };

    const citations = (profile.sources || [])
        .map((source) => String(source?.url || "").trim())
        .filter((url) => /^https:\/\//i.test(url));
    if (citations.length) schema.citation = citations;

    return `${SCHEMA_START_MARKER}
    <script type="application/ld+json" id="ccg-publisher-profile-schema">
${jsonForHtml(schema)}
    </script>
    ${SCHEMA_END_MARKER}`;
}

function buildMeta(group, profile) {
    const platform = platformLabel(group);
    const yearText = group.firstYear && group.lastYear ? `, covering ${archiveYears(group)}` : "";

    if (profile) {
        return {
            title: `${group.name} ${platform} Games & Publisher History | CCG`,
            description: truncateDescription(`Browse ${plural(group.count, `${group.name} ${platform} game`)}${yearText}. Read a sourced publisher history and open every title in the CCG archive.`),
            hero: `${profile.history[0]} Browse ${plural(group.count, "catalogued game")} below.`
        };
    }

    return {
        title: `${group.name} ${platform} Games | CCG Publisher Archive`,
        description: truncateDescription(`Browse ${plural(group.count, `${group.name} ${platform} game`)}${yearText}. Search the CCG archive and open videos, manuals, screenshots and game information.`),
        hero: `Browse ${plural(group.count, `${group.name} title`)} currently catalogued by Cheeky Commodore Gamer, spanning ${archiveYears(group)}.`
    };
}

function enrichPublisherPage(group, profiles, fullGameMap) {
    const filePath = path.join(publishersDir, group.slug, "index.html");
    if (!fs.existsSync(filePath)) return false;

    const profile = profiles[group.slug] && typeof profiles[group.slug] === "object"
        ? profiles[group.slug]
        : null;
    const games = getPublisherGames(group, fullGameMap);
    const meta = buildMeta(group, profile);

    let html = fs.readFileSync(filePath, "utf8");
    html = removeMarkedBlock(html, START_MARKER, END_MARKER);
    html = removeMarkedBlock(html, SCHEMA_START_MARKER, SCHEMA_END_MARKER);

    html = replaceTitle(html, meta.title);
    html = replaceMeta(html, { attribute: "name", name: "description" }, meta.description);
    html = replaceMeta(html, { attribute: "property", name: "og:title" }, meta.title);
    html = replaceMeta(html, { attribute: "property", name: "og:description" }, meta.description);
    html = replaceMeta(html, { attribute: "name", name: "twitter:title" }, meta.title);
    html = replaceMeta(html, { attribute: "name", name: "twitter:description" }, meta.description);
    html = replaceHeroIntro(html, meta.hero);

    if (!html.includes("/resources/css/publisher-profiles.css")) {
        html = html.replace(
            '<link rel="stylesheet" href="/resources/css/publishers.css">',
            '<link rel="stylesheet" href="/resources/css/publishers.css">\n    <link rel="stylesheet" href="/resources/css/publisher-profiles.css">'
        );
    }

    const schema = buildProfileSchema(group, profile, meta.title, meta.description);
    if (schema) {
        html = html.replace("    <link rel=\"icon\" href=\"/favicon.ico\">", `${schema}\n\n    <link rel="icon" href="/favicon.ico">`);
    }

    const section = buildSeoSection(group, profile, games);
    const toolsAnchor = '            <section class="ccg-publishers-tools" aria-label="Game filters">';
    if (html.includes(toolsAnchor)) {
        html = html.replace(toolsAnchor, `${section}\n\n${toolsAnchor}`);
    } else {
        console.warn(`[publisher-seo] Could not find insertion point for ${group.slug}`);
        return false;
    }

    return writeFileIfChanged(filePath, html);
}

function main() {
    const games = readJson(gamesPath, []);
    if (!Array.isArray(games) || !games.length) fail("games/games.json is empty or invalid.");

    const profiles = readJson(profilesPath, {});
    const fullGameMap = new Map(
        games
            .filter((game) => game && game.slug)
            .map((game) => [String(game.slug).trim(), game])
    );
    const groups = buildPublisherGroups(games);

    let changed = 0;
    let profiled = 0;
    groups.forEach((group) => {
        if (profiles[group.slug]) profiled += 1;
        if (enrichPublisherPage(group, profiles, fullGameMap)) changed += 1;
    });

    console.log(`[publisher-seo] Enriched ${groups.length} publisher pages (${profiled} researched profiles, ${changed} files changed).`);
}

main();
