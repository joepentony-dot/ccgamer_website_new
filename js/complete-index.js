// =====================================================
// CCG Complete Index Loader (Correct Version for your JSON)
// Loads ALL games from games.json and lists them
// =====================================================

async function loadCompleteIndex() {
    const container = document.getElementById("complete-results");

    try {
        // IMPORTANT: complete-index.html is in ROOT, so JSON path is:
        const response = await fetch("games.json");
        const games = await response.json();

        // Sort alphabetically by title
        games.sort((a, b) => a.title.localeCompare(b.title));

        // Clear "Loading…" message
        container.innerHTML = "";

        // Build index entries
        games.forEach(game => {
            const item = document.createElement("div");

            // LINK FIX — use game.gameid, not game.id
            const link = document.createElement("a");
            link.href = `games/game.html?id=${encodeURIComponent(game.gameid)}`;
            link.textContent = game.title;

            item.appendChild(link);

            // Optional: display year if your JSON ever includes it
            if (game.year) {
                const yearSpan = document.createElement("span");
                yearSpan.textContent = ` (${game.year})`;
                item.appendChild(yearSpan);
            }

            container.appendChild(item);
        });

    } catch (error) {
        console.error("Error loading complete index:", error);
        container.innerHTML = "<p>Error loading the complete game list.</p>";
    }
}

document.addEventListener("DOMContentLoaded", loadCompleteIndex);
