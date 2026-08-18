/* ============================================================
   CCG PUBLISHER UTILITIES
   ------------------------------------------------------------
   Shared normalization/grouping for generated publisher archives.
   Primary game data remains sourced from /games/games.json.
   Source-backed secondary publisher associations are additive only
   and live in /data/publisher-secondary-credits.json.
============================================================ */

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
    ? path.resolve(process.env.CCG_REPO_ROOT)
    : path.resolve(__dirname, "..");
const secondaryCreditsPath = path.join(repoRoot, "data", "publisher-secondary-credits.json");

const PUBLISHER_ALIASES = new Map([
    ["ocean", "Ocean Software"],
    ["ocean software", "Ocean Software"],
    ["ocean software ltd", "Ocean Software"],
    ["ocean software limited", "Ocean Software"],

    ["mastertronic", "Mastertronic"],
    ["mastertronic ltd", "Mastertronic"],
    ["mastertronic limited", "Mastertronic"],

    ["firebird", "Firebird"],
    ["firebird software", "Firebird"],
    ["firebird software ltd", "Firebird"],
    ["firebird software limited", "Firebird"],
    ["firebird silver", "Firebird"],
    ["firebird gold", "Firebird"],

    ["codemasters", "Codemasters"],
    ["code masters", "Codemasters"],
    ["code masters ltd", "Codemasters"],

    ["us gold", "US Gold"],
    ["u s gold", "US Gold"],
    ["u.s. gold", "US Gold"],
    ["u.s gold", "US Gold"],
    ["us gold ltd", "US Gold"],
    ["us gold limited", "US Gold"],

    ["system 3", "System 3"],
    ["system three", "System 3"],
    ["system 3 software", "System 3"],
    ["system 3 software ltd", "System 3"],

    ["electronic arts", "Electronic Arts"],
    ["electronic arts inc", "Electronic Arts"],
    ["ea", "Electronic Arts"],

    ["activision", "Activision"],
    ["activision inc", "Activision"],

    ["psygnosis", "Psygnosis"],
    ["psygnosis ltd", "Psygnosis"],

    ["elite", "Elite"],
    ["elite systems", "Elite"],
    ["elite systems ltd", "Elite"],

    ["accolade", "Accolade"],
    ["accolade inc", "Accolade"],

    ["microprose", "MicroProse"],
    ["micro prose", "MicroProse"],

    ["hewson", "Hewson"],
    ["hewson consultants", "Hewson"],

    ["thalamus", "Thalamus"],
    ["thalamus ltd", "Thalamus"],

    ["rainbird", "Rainbird"],
    ["rainbird software", "Rainbird"],

    ["mirrorsoft", "Mirrorsoft"],
    ["mirror soft", "Mirrorsoft"],

    ["infogrames", "Infogrames"],

    ["virgin", "Virgin Games"],
    ["virgin games", "Virgin Games"],
    ["virgin interactive", "Virgin Games"],

    ["gremlin", "Gremlin Graphics"],
    ["gremlin graphics", "Gremlin Graphics"],
    ["gremlin graphics software", "Gremlin Graphics"],

    ["domark", "Domark"],
    ["domark ltd", "Domark"],

    ["palace", "Palace Software"],
    ["palace software", "Palace Software"],

    ["image works", "Image Works"],
    ["imageworks", "Image Works"],

    ["melbourne house", "Melbourne House"],

    ["software projects", "Software Projects"],

    ["quicksilva", "Quicksilva"],
    ["quick silva", "Quicksilva"],

    ["audiogenic", "Audiogenic"],

    ["millennium", "Millennium Interactive"],
    ["millennium interactive", "Millennium Interactive"],

    ["team 17", "Team17"],
    ["team17", "Team17"],

    ["renegade", "Renegade"],

    ["sensible software", "Sensible Software"],

    ["digital integration", "Digital Integration"],

    ["alternative", "Alternative Software"],
    ["alternative software", "Alternative Software"],
    ["alternative software ltd", "Alternative Software"],
    ["alternative software limited", "Alternative Software"],

    ["americana", "Americana"],
    ["americana software", "Americana"],
    ["americana software ltd", "Americana"],
    ["americana software limited", "Americana"]
]);

const FEATURED_PUBLISHERS = [
    "Ocean Software",
    "Mastertronic",
    "Firebird",
    "US Gold",
    "Codemasters",
    "System 3",
    "Activision",
    "Electronic Arts",
    "Psygnosis",
    "Elite",
    "Gremlin Graphics",
    "MicroProse",
    "MicroProse Software"
];

function normalizePublisherKey(value) {
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

function smartTitleCase(value) {
    const smallWords = new Set(["and", "of", "the", "for", "to"]);
    const acronymWords = new Map([
        ["us", "US"],
        ["usa", "USA"],
        ["uk", "UK"],
        ["ea", "EA"],
        ["bbc", "BBC"],
        ["c64", "C64"],
        ["amiga", "Amiga"],
        ["3d", "3D"],
        ["2d", "2D"]
    ]);

    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .map((word, index) => {
            const bare = word.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
            if (acronymWords.has(bare)) {
                const replacement = acronymWords.get(bare);
                return word.replace(new RegExp(bare, "i"), replacement);
            }
            if (index > 0 && smallWords.has(bare)) return bare;
            if (!word) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
}

function canonicalizePublisherName(value) {
    const raw = String(value ?? "").trim().replace(/\s+/g, " ");
    if (!raw) return "";

    const key = normalizePublisherKey(raw);
    if (!key) return "";

    if (PUBLISHER_ALIASES.has(key)) {
        return PUBLISHER_ALIASES.get(key);
    }

    // Preserve already deliberate mixed/upper-case branding where possible.
    const hasIntentionalCase = /[A-Z]{2,}/.test(raw) || /[a-z][A-Z]/.test(raw);
    return hasIntentionalCase ? raw : smartTitleCase(raw);
}

function slugifyPublisher(value) {
    const canonical = canonicalizePublisherName(value);
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

function normalizeSecondaryTitle(value) {
    let normalized = String(value ?? "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’‘]/g, "'")
        .toLowerCase();

    normalized = normalized
        .replace(/\([^)]*(?:version|edition)[^)]*\)/gi, " ")
        .replace(/\biii\b/g, "3")
        .replace(/\bii\b/g, "2")
        .replace(/\bi\b/g, "1")
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (normalized.startsWith("the ")) normalized = normalized.slice(4).trim();
    if (normalized.endsWith(" the")) normalized = normalized.slice(0, -4).trim();
    return normalized;
}

function loadSecondaryPublisherRules() {
    if (!fs.existsSync(secondaryCreditsPath)) return [];

    try {
        const payload = JSON.parse(fs.readFileSync(secondaryCreditsPath, "utf8"));
        const rules = Array.isArray(payload?.rules) ? payload.rules : [];

        return rules
            .map((rule) => {
                const publisher = canonicalizePublisherName(rule?.publisher);
                const system = String(rule?.system || "").trim();
                const titleKeys = new Set();

                (Array.isArray(rule?.titles) ? rule.titles : []).forEach((entry) => {
                    const values = typeof entry === "string"
                        ? [entry]
                        : [entry?.title, ...(Array.isArray(entry?.aliases) ? entry.aliases : [])];
                    values.forEach((value) => {
                        const key = normalizeSecondaryTitle(value);
                        if (key) titleKeys.add(key);
                    });
                });

                return { publisher, system, titleKeys };
            })
            .filter((rule) => rule.publisher && rule.titleKeys.size > 0);
    } catch (error) {
        throw new Error(`Could not parse data/publisher-secondary-credits.json: ${error.message}`);
    }
}

const SECONDARY_PUBLISHER_RULES = loadSecondaryPublisherRules();

function getSecondaryPublisherNames(game) {
    const system = normalizeSystem(game);
    const gameTitleKeys = new Set([
        normalizeSecondaryTitle(game?.title),
        normalizeSecondaryTitle(game?.sorttitle)
    ].filter(Boolean));

    return SECONDARY_PUBLISHER_RULES
        .filter((rule) => {
            if (rule.system && rule.system !== system) return false;
            return Array.from(gameTitleKeys).some((key) => rule.titleKeys.has(key));
        })
        .map((rule) => rule.publisher);
}

function getPublisherNames(game) {
    const creditValue = game?.credits?.publisher;
    const source = toList(creditValue).length ? toList(creditValue) : toList(game?.publisher);
    const reReleaseLabels = toList(game?.credits?.re_releaser || game?.credits?.reReleaser);
    const supplemental = getSecondaryPublisherNames(game);
    const seen = new Set();

    // Publisher archives are discovery pages, so a game belongs under both its
    // original publisher(s) and any explicitly recorded re-release label(s).
    return [...source, ...reReleaseLabels, ...supplemental]
        .map(canonicalizePublisherName)
        .filter(Boolean)
        .filter((name) => {
            const key = normalizePublisherKey(name);
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

function buildPublisherGroups(games) {
    const bySlug = new Map();

    (Array.isArray(games) ? games : []).forEach((game) => {
        const gameRecord = getGameRecord(game);
        if (!gameRecord) return;

        getPublisherNames(game).forEach((publisherName) => {
            const slug = slugifyPublisher(publisherName);
            if (!slug) return;

            if (!bySlug.has(slug)) {
                bySlug.set(slug, {
                    name: publisherName,
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
            group.featured = FEATURED_PUBLISHERS.includes(group.name);

            return group;
        })
        .sort((a, b) => (
            a.name.localeCompare(b.name, "en", { sensitivity: "base" }) ||
            a.slug.localeCompare(b.slug)
        ));
}

module.exports = {
    FEATURED_PUBLISHERS,
    PUBLISHER_ALIASES,
    buildPublisherGroups,
    canonicalizePublisherName,
    getPublisherNames,
    getSecondaryPublisherNames,
    normalizePublisherKey,
    normalizeSecondaryTitle,
    normalizeSystem,
    slugifyPublisher
};
