/* ============================================================
   CCG COLLECTION LOADER — OMEGA STABLE RESTORE
   ------------------------------------------------------------
   • Uses ccg-card-builder.js
   • Reads data-collection
   • Supports multiple collection schemas safely
   • ZERO impact on genres or games index
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

        const filtered = games.filter(game => {

            /* Single string */
            if (typeof game.collection === "string") {
                if (game.collection.toLowerCase().trim() === key) return true;
            }

            /* Array of collections */
            if (Array.isArray(game.collections)) {
                if (
                    game.collections
                        .map(c => String(c).toLowerCase().trim())
                        .includes(key)
                ) return true;
            }

            /* Tags fallback */
            if (Array.isArray(game.tags)) {
                if (
                    game.tags
                        .map(t => String(t).toLowerCase().trim())
                        .includes(key)
                ) return true;
            }

            return false;
        });

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
