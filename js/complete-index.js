// =====================================================
// CCG Complete Index Loader (Clean Version)
// Loads ALL games from games.json and lists them
// =====================================================

async function loadCompleteIndex() {
    const container = document.getElementById("complete-results");

    try {
        const response = await fetch("games/games.json");
        const games = await response.json();

        // Sort alphabetically by title
        games.sort((a, b) => a.title.localeCompare(b.title));

        container.innerHTML = "";

        games.forEach(game => {
            const item = document.createElement("div");

            // Build game page link
            const link = document.createElement("a");
            link.href = `games/game.html?id=${encodeURIComponent(game.id)}`;
            link.textContent = game.title;

            item.appendChild(link);

            // Optional: Add year if available
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
