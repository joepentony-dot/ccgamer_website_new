/* ============================================================
   CCG COLLECTION LOADER — OMEGA SAFE BUILD (FIXED)
   ------------------------------------------------------------
   • Purpose: Load curated collections (NOT genres)
   • Uses data-genre attribute as collection key
   • Fetch path is RELATIVE (GitHub Pages safe)
   • Requires: /js/ccg-card-builder.js loaded BEFORE this file
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const collectionRaw = document.body.dataset.genre;
    const collectionName = (collectionRaw || "").toString().trim();

    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!collectionName || !grid) {
        console.warn("[CCG COLLECTION] Missing collection name or grid container.");
        return;
    }

    try {
        // IMPORTANT:
        // Collection pages are: /games/collections/*.html
        // JSON is:            /games/games.json
        // So relative path is: ../games.json  (NO leading slash)
        const url = "../games.json";

        const response = await fetch(url, { cache: "no-store" });

        if (!response.ok) {
            console.error(`[CCG COLLECTION] Failed to fetch games.json (${response.status}) from: ${response.url || url}`);
            return;
        }

        const games = await response.json();

        if (!Array.isArray(games)) {
            console.error("[CCG COLLECTION] games.json is not an array.");
            return;
        }

        const key = collectionName.toLowerCase();

        const filtered = games.filter(game =>
            Array.isArray(game.genres) &&
            game.genres.map(g => String(g).toLowerCase().trim()).includes(key)
        );

        if (countEl) countEl.textContent = String(filtered.length);

        // Shared card builder must exist
        if (typeof window.generateGenreCard !== "function") {
            console.error("[CCG COLLECTION] generateGenreCard() missing. Ensure ccg-card-builder.js is loaded before collection-loader.js.");
            return;
        }

        grid.innerHTML = filtered.map(game => window.generateGenreCard(game)).join("");

        if (filtered.length === 0) {
            console.warn(`[CCG COLLECTION] 0 games found for collection "${collectionName}". (This may be data tagging, not code.)`);
        }

    } catch (err) {
        console.error("[CCG COLLECTION] Loader error:", err);
    }
});
