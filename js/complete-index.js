/* ==============================================================
   CHEEKY COMMODORE GAMER — COMPLETE INDEX LOADER (FINAL)
   Loads all games from games.json and lists them alphabetically.
   Search bar filters results instantly.
   ============================================================== */

async function loadCompleteIndex() {
    const container = document.getElementById("complete-results");
    const searchBar = document.getElementById("search-bar");

    try {
        const response = await fetch("games/games.json");
        const games = await response.json();

        // Sort alphabetically
        games.sort((a, b) => a.title.localeCompare(b.title));

        // Render list
        function renderList(filter = "") {
            container.innerHTML = "";

            const filtered = games.filter(game =>
                game.title.toLowerCase().includes(filter.toLowerCase())
            );

            filtered.forEach(game => {
                const item = document.createElement("div");
                item.className = "index-item";

                const link = document.createElement("a");
                link.href = `games/game.html?id=${encodeURIComponent(game.id)}`;
                link.textContent = game.title;

                item.appendChild(link);

                // Year display
                if (game.year) {
                    const yearEl = document.createElement("span");
                    yearEl.style.color = "#999";
                    yearEl.textContent = ` (${game.year})`;
                    item.appendChild(yearEl);
                }

                container.appendChild(item);
            });
        }

        renderList();

        // Search
        searchBar.addEventListener("input", () => {
            renderList(searchBar.value);
        });

    } catch (err) {
        console.error("Error loading complete index:", err);
        container.textContent = "Error loading game list.";
    }
}

document.addEventListener("DOMContentLoaded", loadCompleteIndex);
