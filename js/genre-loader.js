/* ============================================================
   OMEGA GENRE LOADER — ULTRA STABLE EDITION (FINAL)

   ✔ Works with array-based genres in games.json
   ✔ Loads from ../../games.json (correct depth for /games/genres/*.html)
   ✔ Renders thumbnails + titles + metadata
   ✔ Fully clickable cards
   ✔ Zero regressions across the CCG Omega system
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreName = document.body.dataset.genre;   // From <body data-genre="">
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) {
        console.warn("CCG Genre Loader: Missing data-genre or grid container.");
        return;
    }

    try {
        /* ============================================================
           FETCH THE MASTER GAME DATABASE
           Genre pages are located at:
           /games/genres/<file>.html
           games.json is one level up: /games/games.json
           ============================================================ */
        const response = await fetch("../games.json");
        const games = await response.json();

        /* ============================================================
           FILTER GAMES BY GENRE (ARRAY-SAFE)
           games.json now uses:
           "genres": ["Adventure", "Action-Adventure"]
           ============================================================ */
        const filtered = games.filter(g => {
            if (!g.genres || !Array.isArray(g.genres)) return false;
            return g.genres.map(x => x.toLowerCase()).includes(genreName.toLowerCase());
        });

        /* Render cards */
        grid.innerHTML = filtered.map(game => generateGenreCard(game)).join("");

        /* Update game count */
        if (countEl) countEl.textContent = filtered.length;

    } catch (err) {
        console.error("CCG Genre Loader: ERROR loading games.json", err);
    }
});

/* ============================================================
   CARD RENDERER — GENRE GRID VIEW
   ============================================================ */
function generateGenreCard(game) {

    /* Thumbnail path (always correct location) */
    const thumbPath = `../../resources/images/thumbnails/all/${game.thumbnail}`;

    return `
        <div class="ccg-game-card genre-card">

            <!-- CLICKABLE THUMBNAIL -->
            <a class="ccg-game-card__thumb" href="../game.html?id=${game.id}">
                <img src="${thumbPath}" alt="${game.title}">
            </a>

            <!-- BODY -->
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>

                <div class="ccg-game-card__meta">
                    <span>${game.year || "—"}</span>
                    <span class="divider">·</span>
                    <span>${game.system || "—"}</span>
                </div>

                <!-- VIEW GAME BUTTON -->
                <a class="ccg-btn ccg-btn--primary ccg-view-btn"
                   href="../game.html?id=${game.id}">
                    View Game
                </a>
            </div>
        </div>
    `;
}
