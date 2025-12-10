/* ============================================================
   OMEGA GENRE LOADER — ULTRA FINAL
   - Loads games.json
   - Supports MULTI-GENRE ARRAY structure
   - Correct thumbnail paths
   - Stable grid rendering
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
        /* games.json is ONE LEVEL UP from /games/genres/ */
        const response = await fetch("../games.json");
        const games = await response.json();

        /* ============================================================
           MULTI-GENRE FILTER (matches array values EXACTLY)
           ============================================================ */
        const filtered = games.filter(g => {
            if (!g.genres || !Array.isArray(g.genres)) return false;
            return g.genres.some(genre => genre.toLowerCase() === genreName.toLowerCase());
        });

        /* Render cards */
        grid.innerHTML = filtered.map(game => generateGenreCard(game)).join("");

        /* Update count */
        if (countEl) countEl.textContent = filtered.length;

    } catch (err) {
        console.error("Error loading genre games:", err);
    }
});

/* ============================================================
   CARD GENERATOR FUNCTION — GENRE VIEW
   ============================================================ */
function generateGenreCard(game) {

    const thumbPath = `../../${game.thumbnail}`;

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
