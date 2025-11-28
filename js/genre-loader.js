/* ================================================================
   CHEEKY COMMODORE GAMER - UNIVERSAL GENRE PAGE LOADER (FINAL)
   ---------------------------------------------------------------
   - Auto-detects base URL (GitHub Pages / Fasthosts / any domain)
   - Loads games.json
   - Filters by genre (each HTML page provides the genre in <h1>)
   - Renders thumbnails that actually work
   - Links correctly to game.html with ID
   ================================================================ */

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

        // Filter matching games
        const matches = games.filter(game =>
            Array.isArray(game.genres) &&
            game.genres.some(g => g.toLowerCase() === genreName.toLowerCase())
        );

        console.log(`Loaded ${games.length} games. Matches for ${genreName}: ${matches.length}`);

        if (matches.length === 0) {
            container.innerHTML = "<p class='error'>No games found in this genre.</p>";
            return;
        }

        // Render games
        container.innerHTML = "";
        matches.forEach(game => {
            const card = document.createElement("div");
            card.className = "game-card";

            // Build game link
            const link = document.createElement("a");
            link.href = BASE + "games/game.html?id=" + encodeURIComponent(game.id);

            // Thumbnail
            const img = document.createElement("img");
            img.src = BASE + game.thumbnail;
            img.alt = game.title;

            // Game title
            const title = document.createElement("div");
            title.className = "game-title";
            title.textContent = game.title;

            // "Game Info" link
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
