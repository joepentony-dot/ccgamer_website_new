/* ============================================================
   OMEGA GENRE LOADER — FINAL STABLE EDITION
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) return;

    try {
        // CORRECT PATH — genre pages exist in /games/genres/
        const response = await fetch("../games.json");
        const games = await response.json();

        const filtered = games.filter(g =>
            g.genres &&
            Array.isArray(g.genres) &&
            g.genres.map(x => x.toLowerCase()).includes(genreName.toLowerCase())
        );

        grid.innerHTML = filtered.map(game => generateGenreCard(game)).join("");

        if (countEl) countEl.textContent = filtered.length;

    } catch (err) {
        console.error("GENRE LOADER ERROR:", err);
    }
});

/* ------------------------------------------------------------
   RENDER CARD — JSON paths remain authoritative.
   Simply adjust depth for /games/genres/ pages.
------------------------------------------------------------ */
function generateGenreCard(game) {

    let thumb = game.thumbnail || "";

    // JSON thumbnails are root-relative: "resources/images/thumbnails/all/*.jpg"
    const finalThumb = `../../${thumb}`;

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
