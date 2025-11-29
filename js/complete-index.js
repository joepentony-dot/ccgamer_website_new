/* ================================================================
   CHEEKY COMMODORE GAMER — COMPLETE INDEX LOADER (FINAL VERSION)
   ---------------------------------------------------------------
   Supports both:
   - /complete-index.html               → loads games/games.json
   - /games/complete-index.html         → loads games.json
   ================================================================ */

function getJsonPathForCompleteIndex() {
    const path = window.location.pathname;

    // When inside /games/, load JSON from the same folder
    if (path.includes("/games/")) {
        return "games.json";
    }

    // When at root-level, load from games/games.json
    return "games/games.json";
}

async function loadCompleteIndex() {
    const container = document.getElementById("complete-results");
    if (!container) return;

    try {
        const jsonPath = getJsonPathForCompleteIndex();
        const response = await fetch(jsonPath);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${jsonPath}`);
        }

        const games = await response.json();

        container.innerHTML = "";

        // Sort alphabetically (use sorttitle if available)
        const sorted = games.slice().sort((a, b) => {
            const A = (a.sorttitle || a.title || "").toLowerCase();
            const B = (b.sorttitle || b.title || "").toLowerCase();
            return A.localeCompare(B);
        });

        sorted.forEach(game => {
            const row = document.createElement("div");
            row.className = "complete-row";

            // Build correct link depending on location
            const id = encodeURIComponent(game.gameid || game.id);
            const isInsideGamesFolder = window.location.pathname.includes("/games/");

            const link = document.createElement("a");
            link.href = isInsideGamesFolder
                ? `game.html?id=${id}`             // /games/complete-index.html
                : `games/game.html?id=${id}`;      // /complete-index.html

            link.textContent = game.title || "Untitled Game";
            row.appendChild(link);

            // Year
            if (game.year) {
                const yearSpan = document.createElement("span");
                yearSpan.className = "year";
                yearSpan.textContent = game.year;
                row.appendChild(yearSpan);
            }

            // Genre list
            if (Array.isArray(game.genre) && game.genre.length > 0) {
                const genreSpan = document.createElement("span");
                genreSpan.className = "genre";
                genreSpan.textContent = game.genre.join(", ");
                row.appendChild(genreSpan);
            }

            container.appendChild(row);
        });

        console.log(`Complete Index Loaded Successfully: ${sorted.length} games`);
    } catch (err) {
        console.error("Error loading complete index:", err);
        container.innerHTML = `
            <p class="error">
                Could not load the complete index.<br>
                Please ensure <code>/games/games.json</code> is valid JSON
                (no NaN, no trailing commas).
            </p>
        `;
    }
}

document.addEventListener("DOMContentLoaded", loadCompleteIndex);
