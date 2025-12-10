/* ============================================================
   OMEGA GENRE LOADER — MISSION E7 ULTRA EDITION
   ------------------------------------------------------------
   • Loads games.json
   • Filters using the `genres` ARRAY (correct for your JSON)
   • Correct thumbnail paths
   • Stable Omega ULTRA card rendering
   • Fully clickable thumbs + View Game button
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
           /games/genres/page.html  →  ../games.json
           (Your repo structure confirms this)
           ============================================================ */
        const response = await fetch("../games.json");
        const games = await response.json();

        /* ============================================================
           FILTER BY GENRE — USING genres ARRAY
           EXACT match against games.json values
           ============================================================ */
        const filtered = games.filter(g => {
            if (!g.genres || !Array.isArray(g.genres)) return false;

            return g.genres.some(tag =>
                tag.toLowerCase() === genreName.toLowerCase()
            );
        });

        /* Render game cards */
        grid.innerHTML = filtered.map(game => generateGenreCard(game)).join("");

        /* Update count */
        if (countEl) countEl.textContent = filtered.length;

    } catch (err) {
        console.error("Error loading genre games:", err);
    }
});


/* ============================================================
   CARD GENERATOR FUNCTION — GENRE VIEW
   Omega ULTRA: cinematic thumbnails, click-safe, stable layout
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

                <a class="ccg-btn ccg-btn--primary ccg-view-btn"
                   href="../game.html?id=${game.id}">
                    View Game
                </a>
            </div>

        </div>
    `;
}
