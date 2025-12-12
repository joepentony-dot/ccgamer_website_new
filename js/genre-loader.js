/* ============================================================
   CCG GENRE LOADER — OMEGA CONSOLIDATED
   ------------------------------------------------------------
   • Uses ccg-card-builder.js
   • Zero duplicated rendering logic
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreRaw = document.body.dataset.genre;
    const genreName = (genreRaw || "").toString().trim();
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) {
        console.warn("[CCG GENRE] Missing genre name or grid");
        return;
    }

    try {
        const response = await fetch("../games.json");
        const games = await response.json();

        if (!Array.isArray(games)) {
            console.error("[CCG DATA] games.json is not an array");
            return;
        }

        const key = genreName.toLowerCase();

        const filtered = games.filter(game =>
            Array.isArray(game.genres) &&
            game.genres.map(g => String(g).toLowerCase().trim()).includes(key)
        );

        if (countEl) countEl.textContent = filtered.length;

        grid.innerHTML = filtered.map(ccgBuildGameCard).join("");

        if (filtered.length === 0) {
            console.warn(`[CCG GENRE] No games found for "${genreName}"`);
        }

    } catch (err) {
        console.error("[CCG GENRE] Loader error:", err);
    }
});
