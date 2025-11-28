/* ================================================================
   CHEEKY COMMODORE GAMER - UNIVERSAL GENRE PAGE LOADER (FINAL FIX)
   ---------------------------------------------------------------
   - Accepts BOTH "genre" and "genres" fields from games.json
   - Auto-detects JSON structure
   - Auto-detects domain
   ================================================================= */

console.log("Genre Loader active...");

// Auto-detect base path
const BASE = window.location.origin + "/ccgamer_website_new/";

// Path to games.json
const JSON_URL = BASE + "games/games.json";

/* ================================================================
   HELPERS
================================================================ */

function normalize(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-");
}

function extractGenreFromHeading() {
    const heading = document.querySelector("header h1, .page-title, h1");
    if (!heading) return null;
    return heading.textContent.trim();
}

/* ================================================================
   MAIN LOADER
================================================================ */

async function loadGenrePage() {
    const container = document.getElementById("genre-results");

    if (!container) {
        console.error("No #genre-results container on this page.");
        return;
    }

    const genreName = extractGenreFromHeading();
    if (!genreName) {
        container.innerHTML = "<p class='error'>Could not detect genre.</p>";
        return;
    }

    console.log("Detected genre:", genreName);

    try {
        const response = await fetch(JSON_URL);
        const games = await response.json();

        // Filter matching games — NEW FIX supports "genre" AND "genres"
        const matches = games.filter(game => {
            const g = game.genres || game.genre || []; // accept both
            return Array.isArray(g) &&
                g.some(item => item.toLowerCase() === genreName.toLowerCase());
        });

        console.log(`Loaded ${games.length} games. Matches for ${genreName}: ${matches.length}`);

        if (matches.length === 0) {
            container.innerHTML = "<p class='error'>No games found in this genre.</p>";
            return;
        }

        // Render matches
        container.innerHTML = "";
        matches.forEach(game => {
            const card = document.createElement("div");
            card.className = "game-card";

            const link = document.createElement("a");
            link.href = BASE + "games/game.html?id=" + encodeURIComponent(game.id);

            const img = document.createElement("img");
            img.src = BASE + game.thumbnail;
            img.alt = game.title;

            const title = document.createElement("div");
            title.className = "game-title";
            title.textContent = game.title;

            const info = document.createElement("div");
            info.className = "game-info-link";
            info.textContent = "Game Info";

            link.appendChild(img);
            link.appendChild(title);

            card.appendChild(link);
            card.appendChild(info);

            container.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading genre data:", err);
        container.innerHTML = `<p class='error'>Could not load genre data.</p>`;
    }
}

/* ================================================================
   INIT
================================================================ */
document.addEventListener("DOMContentLoaded", loadGenrePage);
