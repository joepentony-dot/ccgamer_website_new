/* ================================================================
   CHEEKY COMMODORE GAMER - UNIVERSAL GENRE PAGE LOADER (FINAL FIX)
   ---------------------------------------------------------------
   - Supports your JSON structure exactly:
        * "genre" (array)
        * "thumblink"
        * "pdflink"
        * "disklink"
        * "lemonlink"
   - Auto-detects base URL on any domain
   - Renders thumbnails and titles correctly
   ================================================================= */

console.log("Genre Loader active...");

// Auto domain detect
const BASE = window.location.origin + "/ccgamer_website_new/";

// Path to JSON
const JSON_URL = BASE + "games/games.json";

/* ================================================================
   HELPERS
================================================================ */

function extractGenreFromHeading() {
    const heading = document.querySelector("h1");
    if (!heading) return null;
    return heading.textContent.trim();
}

/* ================================================================
   MAIN LOADER
================================================================ */

async function loadGenrePage() {
    const container = document.getElementById("genre-results");

    if (!container) {
        console.error("Missing #genre-results container");
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

        // Support your JSON format -> "genre"
        const matches = games.filter(game => {
            if (!Array.isArray(game.genre)) return false;
            return game.genre.some(g => g.toLowerCase() === genreName.toLowerCase());
        });

        console.log(`Loaded ${games.length} games. Matches for ${genreName}: ${matches.length}`);

        if (matches.length === 0) {
            container.innerHTML = "<p class='error'>No games found in this genre.</p>";
            return;
        }

        // Render
        container.innerHTML = "";
        matches.forEach(game => {

            const card = document.createElement("div");
            card.className = "game-card";

            // Link to game page
            const link = document.createElement("a");
            link.href = BASE + "games/game.html?id=" + encodeURIComponent(game.id);

            // Thumbnail (use your "thumblink")
            const img = document.createElement("img");
            img.src = game.thumblink;
            img.alt = game.title;

            // Title
            const title = document.createElement("div");
            title.className = "game-title";
            title.textContent = game.title;

            // Subtitle
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
        console.error("Error loading genre:", err);
        container.innerHTML = "<p class='error'>Could not load genre data.</p>";
    }
}

/* ================================================================
   INIT
================================================================ */
document.addEventListener("DOMContentLoaded", loadGenrePage);
