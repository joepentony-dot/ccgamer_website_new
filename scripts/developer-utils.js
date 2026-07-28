/* ============================================================
   CCG DEVELOPER UTILITIES
   ------------------------------------------------------------
   Shared normalization and grouping for generated developer
   archives. Source of truth remains: /games/games.json
============================================================ */

"use strict";

const DEVELOPER_ALIASES = new Map([
    ["inforgrames", "Infogrames"],
    ["infogrames", "Infogrames"]
]);

function normalizeDeveloperKey(value) {
    return String(value ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[’‘]/g, "'")
        .replace(/&/g, " and ")
        .replace(/\s+/g, " ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[.,]+$/g, "")
        .trim();
}

function canonicalizeDeveloperName(value) {
    const raw = String(value ?? "").trim().replace(/\s+/g, " ");
    if (!raw) return "";

    const key = normalizeDeveloperKey(raw);
    if (!key) return "";
    return DEVELOPER_ALIASES.get(key) || raw;
}

function slugifyDeveloper(value) {
    const canonical = canonicalizeDeveloperName(value);
    if (!canonical) return "";

    return canonical
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, " and ")
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-+|-+$/g, "");
}

function toList(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
}

function getDeveloperNames(game) {
    const credits = game && typeof game.credits === "object" && game.credits
        ? game.credits
        : {};
    const source = [
        ...toList(game?.developer),
        ...toList(game?.developers),
        ...toList(game?.developedBy),
        ...toList(credits.developer),
        ...toList(credits.developers)
    ];
    const seen = new Set();

    return source
        .map(canonicalizeDeveloperName)
        .filter(Boolean)
        .filter((name) => {
            const key = normalizeDeveloperKey(name);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function normalizeSystem(game) {
    const raw = String(game?.system || game?.platform || game?.computer || "").trim();
    const key = raw.toLowerCase();
    if (key.includes("amiga")) return "Amiga";
    if (key === "c64" || key.includes("commodore 64")) return "C64";
    return raw || "Other";
}

function getGameRecord(game) {
    const slug = String(game?.slug || "").trim();
    const title = String(game?.title || "").trim();
    if (!slug || !title) return null;

    const yearValue = Number(game?.year);
    return {
        slug,
        title,
        sortTitle: String(game?.sorttitle || title).trim(),
        year: Number.isFinite(yearValue) ? yearValue : null,
        system: normalizeSystem(game),
        thumbnail: String(game?.thumbnail || "").trim()
    };
}

function buildDeveloperGroups(games) {
    const bySlug = new Map();

    (Array.isArray(games) ? games : []).forEach((game) => {
        const gameRecord = getGameRecord(game);
        if (!gameRecord) return;

        getDeveloperNames(game).forEach((developerName) => {
            const slug = slugifyDeveloper(developerName);
            if (!slug) return;

            if (!bySlug.has(slug)) {
                bySlug.set(slug, {
                    name: developerName,
                    slug,
                    games: []
                });
            }

            const group = bySlug.get(slug);
            if (!group.games.some((entry) => entry.slug === gameRecord.slug)) {
                group.games.push(gameRecord);
            }
        });
    });

    return Array.from(bySlug.values())
        .map((group) => {
            group.games.sort((a, b) => (
                a.sortTitle.localeCompare(b.sortTitle, "en", { sensitivity: "base" }) ||
                (a.year || 0) - (b.year || 0)
            ));

            const years = group.games
                .map((game) => game.year)
                .filter((year) => Number.isFinite(year));

            group.count = group.games.length;
            group.c64Count = group.games.filter((game) => game.system === "C64").length;
            group.amigaCount = group.games.filter((game) => game.system === "Amiga").length;
            group.firstYear = years.length ? Math.min(...years) : null;
            group.lastYear = years.length ? Math.max(...years) : null;
            return group;
        })
        .sort((a, b) => (
            a.name.localeCompare(b.name, "en", { sensitivity: "base" }) ||
            a.slug.localeCompare(b.slug)
        ));
}

module.exports = {
    DEVELOPER_ALIASES,
    buildDeveloperGroups,
    canonicalizeDeveloperName,
    getDeveloperNames,
    normalizeDeveloperKey,
    normalizeSystem,
    slugifyDeveloper
};
