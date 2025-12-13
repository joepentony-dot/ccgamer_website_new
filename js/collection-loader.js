/* ============================================================
   CCG COLLECTION LOADER — OMEGA STABLE (GENRE-BACKED)
   ------------------------------------------------------------
   • Collections are genre-backed (e.g. "Cartridge Games")
   • Uses ccg-card-builder.js
   • Mirrors genre-loader behaviour
   • ZERO impact on genres, index or single-game pages
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const collectionName = document.body.dataset.collection;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!collectionName || !grid) {
        console.warn("[CCG COLLECTION] Missing data-collection or grid");
        return;
    }

    const key = collectionName.toLowerCase().trim();

    try {
        // collections live in /games/collections/
        const response = await fetch("../games.json");
        const games = await response.json();

        if (!Array.isArray(games)) {
            console.error("[CCG DATA] games.json is not an array");
            return;
        }

        const filtered = games.filter(game =>
            Array.isArray(game.genres) &&
            game.genres
                .map(g => String(g).toLowerCase().trim())
                .includes(key)
        );

        if (countEl) {
            countEl.textContent = filtered.length;
        }

        grid.innerHTML = filtered.map(ccgBuildGameCard).join("");

        if (filtered.length === 0) {
            console.warn(
                `[CCG COLLECTION] No games found for collection "${collectionName}"`
            );
        }

    } catch (err) {
        console.error("[CCG COLLECTION] Loader failed:", err);
    }
});
