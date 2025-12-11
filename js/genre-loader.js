/* ============================================================
   OMEGA GENRE LOADER — ULTRA-STABLE FINAL EDITION
   Thumbnail-safe, JSON-safe, GitHub-safe, Fasthosts-safe
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) return;

    try {
        const response = await fetch("../games.json");
        const games = await response.json();

        const filtered = games.filter(g =>
            g.genres &&
            Array.isArray(g.genres) &&
            g.genres.map(x => x.toLowerCase()).includes(genreName.toLowerCase())
        );

        grid.innerHTML = filtered.map(g => renderGenreCard(g)).join("");

        if (countEl) countEl.textContent = filtered.length;

    } catch (err) {
        console.error("GENRE LOADER ERROR:", err);
    }
});

/* ============================================================
   UNIVERSAL THUMBNAIL SANITISER
   (Fixes ALL broken paths without touching games.json)
   ============================================================ */
function resolveThumbnail(path) {
    if (!path) return "";

    // Strip the long prefix if JSON has full paths:
    // resources/images/thumbnails/all/foo.jpg
    return path.replace(/^resources\/images\/thumbnails\/all\//i, "");
}

/* ============================================================
   CARD RENDERER
   Corrects thumbnail path for genre HTML pages:
   /games/genres/*.html → thumbnails in ../../resources/
   ============================================================ */
function renderGenreCard(game) {

    const clean = resolveThumbnail(game.thumbnail || "");

    const finalThumb = `../../resources/images/thumbnails/all/${clean}`;

    return `
        <div class="ccg-game-card genre-card">

            <a href="../game.html?id=${game.id}" class="ccg-game-card__thumb">
                <img src="${finalThumb}" alt="${game.title}" loading="lazy">
            </a>

            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>
                <div class="ccg-game-card__meta">${game.year || ""} · ${game.system || ""}</div>

                <a href="../game.html?id=${game.id}" class="ccg-btn ccg-btn--primary">
                    View Game
                </a>
            </div>

        </div>
    `;
}
