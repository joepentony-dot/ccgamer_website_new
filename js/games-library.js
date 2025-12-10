/* ============================================================
   OMEGA GAMES LIBRARY LOADER — MISSION E6 FINAL EDITION
   - Loads all games from games.json
   - Correct thumbnail paths
   - Thumbnails are fully clickable
   - Stable card markup
   - Zero regressions across library & search
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    try {
        /* ============================================================
           CORRECT JSON PATH
           games/index.html and games.json are in the same folder.
           ============================================================ */
        const response = await fetch("./games.json");
        const games = await response.json();

        const container = document.getElementById("gamesGrid");
        const countText = document.getElementById("gamesCount");

        if (!container) {
            console.error("Library grid container not found.");
            return;
        }

        /* ============================================================
           RENDER ALL GAME CARDS
           ============================================================ */
        container.innerHTML = games.map(game => generateCard(game)).join("");

        /* Count text */
        if (countText) {
            countText.textContent = games.length;
        }

        /* ============================================================
           LIVE SEARCH (if present)
           ============================================================ */
        const searchInput = document.getElementById("gamesSearch");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = games.filter(g =>
                    g.title.toLowerCase().includes(term) ||
                    g.developer?.toLowerCase().includes(term) ||
                    g.genre?.toLowerCase().includes(term)
                );
                container.innerHTML = filtered.map(game => generateCard(game)).join("");

                if (countText) countText.textContent = filtered.length;
            });
        }

    } catch (err) {
        console.error("Error loading games library:", err);
    }
});

/* ============================================================
   CARD GENERATOR FUNCTION
   Matches Omega cinematic card style.
   Thumbnail click = open single game page.
   ============================================================ */

function generateCard(game) {
    const thumbPath = `../resources/images/thumbnails/all/${game.thumbnail}`;

    return `
        <div class="ccg-game-card">
        
            <!-- CLICKABLE THUMBNAIL -->
            <a class="ccg-game-card__thumb" href="game.html?id=${game.id}">
                <img src="${thumbPath}" alt="${game.title}">
            </a>

            <!-- CARD BODY -->
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>

                <div class="ccg-game-card__meta">
                    <span>${game.year || "—"}</span>
                    <span class="divider">·</span>
                    <span>${game.system || "—"}</span>
                </div>

                <!-- VIEW GAME BUTTON -->
                <a class="ccg-btn ccg-btn--primary ccg-view-btn" href="game.html?id=${game.id}">
                    View Game
                </a>
            </div>
        </div>
    `;
}
