/* ============================================================
   OMEGA GENRE LOADER — MISSION E7 STABLE EDITION
   - Loads games.json
   - Filters by genre in data-genre=""
   - Supports BOTH `genre` (string) and `genres` (array) fields
   - Correct thumbnail paths
   - Stable grid rendering
   - Thumbnails fully clickable
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreName = (document.body.dataset.genre || "").trim();
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) {
        console.warn("Genre Loader: Missing data-genre or grid container.");
        return;
    }

    try {
        /* ============================================================
           CORRECT JSON PATH
           Genre pages are 1 LEVEL DEEP under /games/:
           /games/genres/<genre>.html
           games.json is at: /games/games.json
           So the correct path from genres is: ../games.json
           ============================================================ */
        const response = await fetch("../games.json");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching games.json`);
        }

        const games = await response.json();

        /* ============================================================
           FILTER GAMES BY GENRE NAME
           - Many entries use `genres: [ ... ]` (array)
           - Some may use `genre: "..."` (string)
           - We treat either as valid and match EXACT text,
             ignoring case and surrounding whitespace.
           ============================================================ */
        const target = genreName.toLowerCase();

        const filtered = (Array.isArray(games) ? games : []).filter(g => {
            // 1) direct single-genre field
            if (typeof g.genre === "string") {
                const direct = g.genre.trim().toLowerCase();
                if (direct === target) return true;
            }

            // 2) multi-genre array field
            if (Array.isArray(g.genres)) {
                const match = g.genres.some(gen =>
                    typeof gen === "string" &&
                    gen.trim().toLowerCase() === target
                );
                if (match) return true;
            }

            return false;
        });

        /* Render game cards */
        grid.innerHTML = filtered.map(game => generateGenreCard(game)).join("");

        /* Count text */
        if (countEl) countEl.textContent = filtered.length;

    } catch (err) {
        console.error("Error loading genre games:", err);
        if (grid) {
            grid.innerHTML = `
                <div class="ccg-genre-error">
                    <p>Sorry, there was a problem loading games for this genre.</p>
                </div>
            `;
        }
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
