/* ============================================================
   OMEGA GENRE LOADER — ULTRA STABLE EDITION (FINAL-CLEAN)
   Fully corrected path logic + Omega card output.
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
           FETCH MASTER DB
           Correct depth for: /games/genres/*.html → ../games.json
        ============================================================ */
        const response = await fetch("../games.json");
        const games = await response.json();

        /* ============================================================
           FILTER BY GENRE (SAFE)
        ============================================================ */
        const filtered = games.filter(g => {
            if (!g.genres || !Array.isArray(g.genres)) return false;
            return g.genres.map(x => x.toLowerCase()).includes(genreName.toLowerCase());
        });

        /* Render cards */
        grid.innerHTML = filtered.map(game => generateGenreCard(game)).join("");

        /* Count text */
        if (countEl) countEl.textContent = filtered.length;

    } catch (err) {
        console.error("CCG Genre Loader: ERROR loading games.json", err);
    }
});

/* ============================================================
   CARD RENDERER — ULTRA SAFE VERSION
   ============================================================ */
function generateGenreCard(game) {

    /* ============================================================
       CRITICAL FIX:
       game.thumbnail ALREADY contains:
       "resources/images/thumbnails/all/xxx.jpg"
       So from /games/genres/ → go ONE level up:
       "../" + game.thumbnail
    ============================================================ */

    const thumbPath = `../${game.thumbnail}`;

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

                <a class="ccg-btn ccg-btn--primary ccg-view-btn"
                   href="../game.html?id=${game.id}">
                    View Game
                </a>
            </div>
        </div>
    `;
}
