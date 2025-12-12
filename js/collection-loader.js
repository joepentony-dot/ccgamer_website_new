/* ============================================================
   CCG COLLECTION LOADER — OMEGA SAFE BUILD
   ------------------------------------------------------------
   • Purpose: Load curated collections (NOT genres)
   • Safe clone of genre-loader.js
   • Does NOT affect genre pages
   • Uses data-genre attribute as collection key
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const collectionName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!collectionName || !grid) {
        console.warn("collection-loader.js: Missing collection name or grid.");
        return;
    }

    try {
        // Path is identical to genre-loader for safety
        const response = await fetch("../games.json");
        const games = await response.json();

        // COLLECTION FILTER
        // Collections are stored as tags inside game.genres[]
        const filtered = games.filter(game =>
            Array.isArray(game.genres) &&
            game.genres.map(g => g.toLowerCase()).includes(collectionName.toLowerCase())
        );

        // Render cards (reuses existing card generator)
        grid.innerHTML = filtered.map(game => generateGenreCard(game)).join("");

        if (countEl) {
            countEl.textContent = filtered.length;
        }

    } catch (err) {
        console.error("collection-loader.js failed:", err);
        grid.innerHTML = "<p class='ccg-error'>Failed to load collection.</p>";
    }
});
