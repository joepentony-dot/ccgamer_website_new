/* ============================================================
   OMEGA GENRE LOADER — MISSION E6 FINAL EDITION
   - Loads games.json
   - Filters by genre in data-genre=""
   - Correct thumbnail paths
   - Stable grid rendering
   - Thumbnails fully clickable
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) {
        console.warn("Genre Loader: Missing data-genre or grid container.");
        return;
    }

    try {
        /* ============================================================
           CORRECT JSON PATH
           genre pages are 2 LEVELS DEEP:
           /games/genres/<genre>.html
           games.json is at: /games/games.json
           So the correct path is: ../../games.json
           ============================================================ */
        const response = await fetch("../games.json");
        const games = await response.json();

        /* ============================================================
           FILTER GAMES BY GENRE NAME
           Matches EXACT values in games.json
           ============================================================ */
        const filtered = games.filter(g => {
            if (!g.genre) return false;
            return g.genre.toLowerCase() === genreName.toLowerCase();
        });

        /* Render game cards */
        grid.innerHTML = filtered.map(game => generateGenreCard(game)).join("");

        /* Count text */
        if (countEl) countEl.textContent = filtered.length;

    } catch (err) {
        console.error("Error loading genre games:", err);
    }
});

/* ============================================================
   CARD GENERATOR FUNCTION — GENRE VIEW
   ============================================================ */
function generateGenreCard(game) {

    const thumbPath = `../../resources/images/thumbnails/all/${game.thumbnail}`;

    return `
        <div class="ccg-game-card genre-card">
        
            <!-- CLICKABLE THUMB -->
            <a class="ccg-game-card__thumb" href="../game.html?id=${game.id}">
                <img src="${thumbPath}" alt="${game.title}">
            </a>

            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>

                <div class="ccg-game-card__meta">
                    <span>${game.year || "—"}</span>
                    <span class="divider">·</span>
                    <span>${game.system || "—"}</span>
                </div>

                <a class="ccg-btn ccg-btn--primary ccg-view-btn" href="../game.html?id=${game.id}">
                    View Game
                </a>
            </div>

        </div>
    `;
}
