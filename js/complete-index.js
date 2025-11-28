// =====================================================
// CCG Complete Index Loader (Correct Version for Your Tree)
// Folder Structure Supported:
//   - root: /complete-index.html
//   - game pages: /games/game.html?id=...
// =====================================================

async function loadCompleteIndex() {
    const container = document.getElementById("complete-results");

    try {
        // Root page uses games/games.json
        const response = await fetch("games/games.json");
        const games = await response.json();

        // Alpha-sort
        games.sort((a, b) => a.title.localeCompare(b.title));

        container.innerHTML = "";

        games.forEach(game => {
            const row = document.createElement("div");
            row.className = "entry";

            const link = document.createElement("a");
            const id = encodeURIComponent(game.gameid || game.id);

            // Always point into /games/
            link.href = `games/game.html?id=${id}`;
            link.textContent = game.title;

            row.appendChild(link);

            if (game.year) {
                const yr = document.createElement("span");
                yr.style.opacity = "0.7";
                yr.textContent = ` — ${game.year}`;
                row.appendChild(yr);
            }

            container.appendChild(row);
        });

        console.log("Complete Index loaded:", games.length);

    } catch (err) {
        console.error("Index load error:", err);
        container.textContent = "Error loading game index.";
    }
}

document.addEventListener("DOMContentLoaded", loadCompleteIndex);
