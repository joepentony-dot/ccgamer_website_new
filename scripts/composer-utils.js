/* ============================================================
   CCG COMPOSER UTILITIES
   ------------------------------------------------------------
   Shared normalization and grouping for generated composer
   archives. Source of truth remains: /games/games.json
============================================================ */

"use strict";

const AUDIO_EXT_RE = /\.(?:mp3|ogg|wav|flac|sid|mod|xm|s3m)$/i;

const COMPOSER_ALIASES = new Map([
    ["chris hulsbeck", "Chris Hülsbeck"],
    ["chris huelsbeck", "Chris Hülsbeck"],
    ["chris hülsbeck", "Chris Hülsbeck"],
    ["oisten eide", "Oisten Eide"]
]);

function transliterateComposerText(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/ø/g, "o")
        .replace(/ł/g, "l")
        .replace(/[đð]/g, "d")
        .replace(/þ/g, "th")
        .replace(/æ/g, "ae")
        .replace(/œ/g, "oe")
        .replace(/ß/g, "ss");
}

function normalizeComposerKey(value) {
    return transliterateComposerText(value)
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[’‘]/g, "'")
        .replace(/&/g, " and ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function canonicalizeComposerName(value) {
    const raw = String(value ?? "").trim().replace(/\s+/g, " ");
    if (!raw || AUDIO_EXT_RE.test(raw)) return "";
    const key = normalizeComposerKey(raw);
    if (!key) return "";
    return COMPOSER_ALIASES.get(key) || raw;
}

function slugifyComposer(value) {
    const canonical = canonicalizeComposerName(value);
    if (!canonical) return "";
    return normalizeComposerKey(canonical).replace(/\s+/g, "-");
}

function toList(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
}

function getComposerNames(game) {
    const credits = game && typeof game.credits === "object" && game.credits
        ? game.credits
        : {};
    const source = [
        ...toList(credits.musician),
        ...toList(game?.musicBy),
        ...toList(game?.composers),
        ...toList(game?.composer)
    ];

    if (Array.isArray(game?.music)) {
        game.music.forEach((item) => {
            const text = String(item ?? "").trim();
            if (/[A-Za-z]/.test(text) && !AUDIO_EXT_RE.test(text)) source.push(text);
        });
    }

    const seen = new Set();
    return source
        .map(canonicalizeComposerName)
        .filter(Boolean)
        .filter((name) => {
            const key = normalizeComposerKey(name);
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
        publisher: String(game?.publisher || "").trim(),
        thumbnail: String(game?.thumbnail || "").trim()
    };
}

function buildComposerGroups(games) {
    const byKey = new Map();

    (Array.isArray(games) ? games : []).forEach((game) => {
        const gameRecord = getGameRecord(game);
        if (!gameRecord) return;

        getComposerNames(game).forEach((composerName) => {
            const key = normalizeComposerKey(composerName);
            if (!key) return;
            if (!byKey.has(key)) {
                byKey.set(key, {
                    name: composerName,
                    slug: slugifyComposer(composerName),
                    variants: new Set(),
                    games: []
                });
            }

            const group = byKey.get(key);
            group.variants.add(composerName);
            if (!group.games.some((entry) => entry.slug === gameRecord.slug)) {
                group.games.push(gameRecord);
            }
        });
    });

    return Array.from(byKey.values())
        .map((group) => {
            group.games.sort((a, b) => (
                a.sortTitle.localeCompare(b.sortTitle, "en", { sensitivity: "base" }) ||
                (a.year || 0) - (b.year || 0)
            ));
            const years = group.games.map((game) => game.year).filter(Number.isFinite);
            group.variants = Array.from(group.variants).sort((a, b) => a.localeCompare(b));
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
    AUDIO_EXT_RE,
    COMPOSER_ALIASES,
    buildComposerGroups,
    canonicalizeComposerName,
    getComposerNames,
    normalizeComposerKey,
    normalizeSystem,
    slugifyComposer,
    transliterateComposerText
};
