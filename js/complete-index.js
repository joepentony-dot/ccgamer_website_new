/* ================================================================
   CHEEKY COMMODORE GAMER — COMPLETE INDEX LOADER (FINAL VERSION)
   ---------------------------------------------------------------
   Supports both:
   - /complete-index.html               → loads games/games.json
   - /games/complete-index.html         → loads games.json
   ================================================================ */

function getJsonPathForCompleteIndex() {
    const path = window.location.pathname;

    // If inside /games/, load JSON from the same folder
    if (path.includes("/games/")) {
        return "games.json";
    }

    // Root-level complete-index.html
    return "games/games.json";
}

async function loadCompleteIndex() {
    const container = document.getElementById("complete-results");
    if (!container) return;

    try {
        const jsonPath = getJsonPathForCompleteIndex();
        const response = await fetch(jsonPath);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} — ${jsonPath}`);
        }

        const games = await response.json();

        container.innerHTML = "";

        // Sort alphabetically
        const sorted = games.slice().sort((a, b) => {
            const A = a.sorttitle || a.title || "";
            const B = b.sorttitle || b.title || "";
            return A.localeCompare(B);
        });

        sorted.forEach(game => {
            const row = document.createElement("div");
            row.className = "complete-row";

            // Build link depending on where the page lives
            const link = document.createElement("a");
            const id = encodeURIComponent(game.gameid || game.id);

            // If inside /games/ → link locally
            if (window.location.pathname.includes("/games/")) {
                link.href = `game.html?id=${id}`;
            } else {
                link.href = `games/game.html?id=${id}`;
            }

            link.textContent = game.title || "Untitled Game";
            row.appendChild(link);

            // Year
            if (game.year) {
                const year = document.createElement("span");
                year.className = "year";
                year.textContent = game.year;
                row.appendChild(year);
            }

            // Genre
            if (Array.isArray(game.genre) && game.genre.length > 0) {
                const genreSpan = document.createElement("span");
                genreSpan.className = "genre";
                genreSpan.textContent = game.genre.join(", ");
                row.appendChild(genreSpan);
            }

            container.appendChild(row);
        });

        console.log(`Complete Index Loaded: ${sorted.length} games`);
    } catch (err) {
        console.error("Complete Index Error:", err);
        container.innerHTML = `
            <p class="error">
                Could not load the complete index.<br>
                Check <code>games/games.json</code> for:
                <strong>NaN</strong>, missing quotes, or trailing commas.
            </p>
        `;
    }
}

document.addEventListener("DOMContentLoaded", loadCompleteIndex);
