/* ============================================================
   CCG COLLECTION LOADER — OMEGA CONSOLIDATED
   ------------------------------------------------------------
   • Uses ccg-card-builder.js
   • No rendering duplication
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const collectionName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!collectionName || !grid) {
        console.warn("[CCG COLLECTION] Missing collection name or grid");
        return;
    }

    try {
        const response = await fetch("../games.json");
        const games = await response.json();

        if (!Array.isArray(games)) {
            console.error("[CCG DATA] games.json is not an array");
            return;
        }

        const key = collectionName.toLowerCase().trim();

        const filtered = games.filter(game =>
            Array.isArray(game.genres) &&
            game.genres.map(g => String(g).toLowerCase().trim()).includes(key)
        );

        if (countEl) countEl.textContent = filtered.length;

        grid.innerHTML = filtered.map(ccgBuildGameCard).join("");

        if (filtered.length === 0) {
            console.warn(
                `[CCG COLLECTION] No games found for "${collectionName}"`
            );
        }

    } catch (err) {
        console.error("[CCG COLLECTION] Loader failed:", err);
    }
});
