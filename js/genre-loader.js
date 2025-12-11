/* ============================================================
   OMEGA GENRE LOADER — FINAL FIXED EDITION
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) return;

    try {
        // CORRECT PATH — genre pages are inside /games/genres/
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

function generateGenreCard(game) {

    let t = game.thumbnail || "";

    if (t.startsWith("resources/images/")) {
        t = t.replace("resources/images/thumbnails/all/", "");
    }

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
