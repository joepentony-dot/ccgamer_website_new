// =====================================================
// CCG Complete Index Loader (Final Version)
// Works from BOTH:
//   /ccgamer_website_new/complete-index.html
//   /ccgamer_website_new/games/complete-index.html
// =====================================================

async function loadCompleteIndex() {
    const container = document.getElementById("complete-results");

    if (!container) {
        console.error("complete-results container not found.");
        return;
    }

    try {
        const path = window.location.pathname || "";
        const inGamesFolder = path.includes("/games/");

        // If we're in /games/, JSON is at ./games.json
        // If we're at root, JSON is at games/games.json
        const jsonPath = inGamesFolder ? "games.json" : "games/games.json";

        const response = await fetch(jsonPath);
        const games = await response.json();

        // Sort alphabetically by title
        games.sort((a, b) => a.title.localeCompare(b.title));

        container.innerHTML = "";

        games.forEach(game => {
            const row = document.createElement("div");
            row.className = "entry";

            // Build correct link depending on where we are
            // /complete-index.html   → games/game.html?id=...
            // /games/complete-index.html → game.html?id=...
            const link = document.createElement("a");
            const gameId = encodeURIComponent(game.gameid || game.id);

            if (inGamesFolder) {
                link.href = `game.html?id=${gameId}`;
            } else {
                link.href = `games/game.html?id=${gameId}`;
            }

            link.textContent = game.title;
            row.appendChild(link);

            // Optional year display
            if (game.year) {
                const year = document.createElement("span");
                year.style.opacity = "0.7";
                year.textContent = ` — ${game.year}`;
                row.appendChild(year);
            }

            container.appendChild(row);
        });

        console.log(`Complete Index loaded: ${games.length} games`);

    } catch (err) {
        console.error("Index load error:", err);
        if (container) {
            container.textContent = "Error loading game index.";
        }
    }
}

document.addEventListener("DOMContentLoaded", loadCompleteIndex);
