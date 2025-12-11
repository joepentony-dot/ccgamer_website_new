/* ============================================================
   OMEGA GENRE LOADER — FINAL STABLE EDITION (SANITISED)
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) {
        console.warn("GENRE LOADER — Missing genreName or grid container");
        return;
    }

    try {
        // Correct depth: /games/genres/ → ../games.json
        const response = await fetch("../games.json");
        const games = await response.json();

        const filtered = games.filter(g =>
            Array.isArray(g.genres) &&
            g.genres.map(x => x.toLowerCase()).includes(genreName.toLowerCase())
        );

        if (filtered.length === 0) {
            console.warn(`GENRE LOADER — No games found for genre: ${genreName}`);
        }

        grid.innerHTML = filtered.map(game => generateGenreCard(game)).join("");

        if (countEl) countEl.textContent = filtered.length;

    } catch (err) {
        console.error("GENRE LOADER ERROR:", err);
    }
});

/* ------------------------------------------------------------
   Build game card — proper thumbnail sanitation + depth fix
------------------------------------------------------------ */
function generateGenreCard(game) {

    let t = game.thumbnail || "";

    // Remove any accidental prefixes
    t = t.replace("resources/images/thumbnails/all/", "");
    t = t.replace("resources/images/thumbnails/", "");
    t = t.replace("resources/images/", "");

    // Correct final path for /games/genres/ depth
    const finalThumb = `../../resources/images/thumbnails/all/${t}`;

    return `
        <div class="ccg-game-card genre-card">
            <a href="../game.html?id=${game.id}" class="ccg-game-card__thumb">
                <img src="${finalThumb}" alt="${game.title}">
            </a>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>
                <div class="ccg-game-card__meta">${game.year || ""} · ${game.system || ""}</div>
                <a href="../game.html?id=${game.id}" class="ccg-btn ccg-btn--primary">View Game</a>
            </div>
        </div>
    `;
}
