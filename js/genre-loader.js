/* ================================================================
   CHEEKY COMMODORE GAMER – UNIVERSAL GENRE / COLLECTION LOADER
   FINAL VERSION – GENRES + COLLECTIONS (RPG, MISC, CARTRIDGE, BPJS)
   ----------------------------------------------------------------
   - Works for BOTH /games/genres/*.html AND /games/collections/*.html
   - Detects the current page from the H1 or data-genre-name attribute
   - Matches against game.genre, game.genres, game.collection,
     game.collections, and game.tags in games.json
   - Handles awkward names like “Role-Playing Games” vs “Role Playing”
   ================================================================ */

function normalizeTag(str) {
    return (str || "")
        .toString()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, ""); // strip spaces, hyphens, punctuation
}

const TAG_ALIASES = {
    // RPG
    "rpg": "roleplayinggames",
    "roleplayinggame": "roleplayinggames",
    "roleplayinggames": "roleplayinggames",

    // Misc
    "misc": "miscellaneousgames",
    "miscellaneous": "miscellaneousgames",
    "miscellaneousgames": "miscellaneousgames",

    // Cartridge
    "cartridgegames": "c64cartridgegames",
    "c64cartridgegames": "c64cartridgegames"
};

function toTagKey(str) {
    const base = normalizeTag(str);
    return TAG_ALIASES[base] || base;
}

function getActivePageKey() {
    // Allow explicit override with data-genre-name
    const dataEl = document.querySelector("[data-genre-name]");
    if (dataEl && dataEl.dataset.genreName) {
        return toTagKey(dataEl.dataset.genreName);
    }

    const h1 =
        document.querySelector("main h1") ||
        document.querySelector("header h1") ||
        document.querySelector("h1");

    const text = h1 ? h1.textContent.trim() : "";
    return toTagKey(text);
}

function getJsonPathForGenrePage() {
    // We’re in something like /ccgamer_website_new/games/genres/xxx.html
    const path = window.location.pathname;

    // If we’re inside /games/genres/ or /games/collections/, we need ../../games/games.json
    if (path.includes("/games/genres/") || path.includes("/games/collections/")) {
        return "../../games/games.json";
    }

    // If we’re directly in /games/ (rare for this script, but safe)
    if (path.endsWith("/games/") || path.includes("/games/") && !path.includes("/games/genres/") && !path.includes("/games/collections/")) {
        return "games.json";
    }

    // Fallback for root-level test files
    return "games/games.json";
}

function collectTagsFromGame(game) {
    const all = [];

    if (Array.isArray(game.genre)) all.push(...game.genre);
    if (Array.isArray(game.genres)) all.push(...game.genres);
    if (Array.isArray(game.collection)) all.push(...game.collection);
    if (Array.isArray(game.collections)) all.push(...game.collections);
    if (Array.isArray(game.tags)) all.push(...game.tags);

    return all;
}

async function loadGenrePage() {
    const container = document.getElementById("genre-results");
    if (!container) return;

    const activeKey = getActivePageKey();
    const heading =
        document.querySelector("main h1") ||
        document.querySelector("header h1") ||
        document.querySelector("h1");
    const headingText = heading ? heading.textContent.trim() : "";

    try {
        const jsonPath = getJsonPathForGenrePage();
        const response = await fetch(jsonPath);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} – ${jsonPath}`);
        }

        const games = await response.json();

        const matches = games.filter(game => {
            const tags = collectTagsFromGame(game);
            return tags.some(tag => toTagKey(tag) === activeKey);
        });

        container.innerHTML = "";

        if (!matches.length) {
            container.innerHTML = `
                <p class="no-results">
                    No games found for <strong>${headingText}</strong>.<br>
                    Check that the genre / collection text in <code>games.json</code>
                    exactly matches this page title or its aliases.
                </p>
            `;
            return;
        }

        // Sort nicely
        matches.sort((a, b) => {
            const aKey = a.sorttitle || a.title || "";
            const bKey = b.sorttitle || b.title || "";
            return aKey.localeCompare(bKey);
        });

        matches.forEach(game => {
            const card = document.createElement("article");
            card.className = "game-card";

            const link = document.createElement("a");
            link.href = `../game.html?id=${encodeURIComponent(game.gameid || game.id)}`;

            const img = document.createElement("img");
            img.alt = game.title || "Game thumbnail";

            if (game.thumbnail) {
                img.src = "../" + game.thumbnail.replace(/^\/+/, "");
            } else {
                // fallback to generic misc icon in resources/images/genres/
                img.src = "../../resources/images/genres/miscellaneous.png";
            }

            const meta = document.createElement("div");
            meta.className = "game-meta";

            const title = document.createElement("h2");
            title.textContent = game.title || "Untitled Game";

            const bits = [];
            if (game.year) bits.push(game.year);
            if (game.developer) bits.push(game.developer);

            const details = document.createElement("p");
            details.textContent = bits.join(" • ");

            meta.appendChild(title);
            if (bits.length) meta.appendChild(details);

            link.appendChild(img);
            link.appendChild(meta);
            card.appendChild(link);

            container.appendChild(card);
        });

        console.log(
            `Loaded ${games.length} games from games.json – ${matches.length} match "${headingText}" (${activeKey})`
        );
    } catch (err) {
        console.error("Error loading genre / collection page:", err);
        container.innerHTML = `
            <p class="error">
                Error loading games list.<br>
                Check that <code>games/games.json</code> is valid JSON (no <code>NaN</code>, no trailing commas)
                and that the path in <code>genre-loader.js</code> matches your folder structure.
            </p>
        `;
    }
}

// Backwards-compat to any old calls
function loadGenreGames() {
    loadGenrePage();
}

document.addEventListener("DOMContentLoaded", loadGenrePage);
