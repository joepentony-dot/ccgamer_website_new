/* ================================================================
   CCG — UNIVERSAL GENRE / COLLECTION LOADER (V4 — FINAL)
   - Works for ALL genre pages in /games/genres/
   - Uses <h1> text to detect which genre to load
   - Normalises names to canonical keys (action-adventure, bpjs, etc.)
   - Filters games from games.json by canonical key
   - Renders consistent game cards with thumbnail + metadata
   - Future-proof for GitHub Pages + Fasthosts
================================================================ */

function normalizeGenre(raw) {
    if (!raw) return null;
    let str = raw.toString().toLowerCase().trim();

    // Strip leading "c64 "
    str = str.replace(/^c64\s+/, "");

    // Common tidying
    str = str.replace(/\s+/g, " ");

    // Canonical map
    const MAP = {
        "action adventure games": "action-adventure",
        "action adventure": "action-adventure",
        "action-adventure": "action-adventure",

        "adventure games": "adventure",
        "adventure": "adventure",

        "arcade games": "arcade",
        "arcade": "arcade",

        "bpjs indexed games": "bpjs",
        "bpjs games": "bpjs",
        "bpjs": "bpjs",

        "casino games": "casino",
        "casino": "casino",

        "c64 cartridge games": "cartridge",
        "cartridge games": "cartridge",
        "cartridge": "cartridge",

        "fighting games": "fighting",
        "fighting": "fighting",

        "horror games": "horror",
        "horror": "horror",

        "licensed games": "licensed",
        "licensed": "licensed",

        "miscellaneous games": "miscellaneous",
        "miscellaneous": "miscellaneous",

        "platform games": "platform",
        "platform": "platform",

        "puzzle games": "puzzle",
        "puzzle": "puzzle",

        "quiz games": "quiz",
        "quiz": "quiz",

        "racing games": "racing",
        "racing": "racing",

        "role-playing games": "role-playing",
        "role playing games": "role-playing",
        "role-playing": "role-playing",

        "shooting games": "shooting",
        "shooting": "shooting",
        "shoot em up": "shooting",
        "shoot-em-up": "shooting",

        "sports games": "sports",
        "sports": "sports",

        "strategy games": "strategy",
        "strategy": "strategy",

        "top picks": "top-picks",
        "top-picks": "top-picks"
    };

    if (MAP[str]) return MAP[str];

    // Fallback: strip " games" suffix if present and try again
    const stripped = str.replace(/ games$/, "");
    if (MAP[stripped]) return MAP[stripped];

    return null;
}

function getJsonPathForGenrePage() {
    const path = window.location.pathname;

    // If we're inside /games/genres/ -> games.json is one level up
    if (path.includes("/games/genres/")) {
        return "../games.json";
    }

    // If we're inside /games/ root -> games.json is in same folder
    if (path.includes("/games/")) {
        return "games.json";
    }

    // Fallback for root or odd cases
    return "games/games.json";
}

function extractGameGenres(game) {
    let raw = game.genres || game.genre || [];

    if (!raw) return [];
    if (!Array.isArray(raw)) raw = [raw];

    return raw
        .map(normalizeGenre)
        .filter(Boolean);
}

async function loadGenrePage() {
    const container = document.getElementById("genre-results");
    if (!container) {
        console.warn("No #genre-results container found on this page.");
        return;
    }

    const h1 = document.querySelector("h1");
    if (!h1) {
        container.innerHTML = "<p>Genre title missing (no &lt;h1&gt; found).</p>";
        return;
    }

    const pageTitle = h1.textContent.trim();
    const pageKey = normalizeGenre(pageTitle);

    if (!pageKey) {
        container.innerHTML = `<p>Unknown genre: ${pageTitle}</p>`;
        return;
    }

    try {
        const jsonPath = getJsonPathForGenrePage();
        const response = await fetch(jsonPath);
        const games = await response.json();

        const matches = games.filter(game => {
            const genreKeys = extractGameGenres(game);
            return genreKeys.includes(pageKey);
        });

        // Sort by title
        matches.sort((a, b) => a.title.localeCompare(b.title));

        container.innerHTML = "";

        if (!matches.length) {
            container.innerHTML = `<p>No games found yet for <strong>${pageTitle}</strong>.</p>`;
            return;
        }

        const cards = matches.map(game => {
            const id = encodeURIComponent(game.id || game.gameid || "");
            const linkHref = `../game.html?id=${id}`;

            const thumb = game.thumbnail
                ? `../${game.thumbnail}`
                : "../resources/images/genres/miscellaneous.png";

            const year = game.year ? ` (${game.year})` : "";
            const dev = game.developer || "";

            return `
                <div class="game-card">
                    <a href="${linkHref}">
                        <img src="${thumb}" alt="${game.title}" loading="lazy">
                    </a>
                    <div class="game-info">
                        <a class="game-title" href="${linkHref}">${game.title}${year}</a>
                        ${dev ? `<div class="game-dev">${dev}</div>` : ""}
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
            <p>Showing ${matches.length} game(s) in <strong>${pageTitle}</strong>:</p>
            <div class="game-grid">
                ${cards.join("")}
            </div>
        `;

    } catch (err) {
        console.error("Error loading genre page:", err);
        container.innerHTML = "<p>Error loading games for this genre.</p>";
    }
}

document.addEventListener("DOMContentLoaded", loadGenrePage);
