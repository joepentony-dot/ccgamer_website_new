/* ============================================================
   CCG COLLECTION LOADER — OMEGA ABSOLUTE PATH BUILD
   ------------------------------------------------------------
   • Purpose: Load curated collections (NOT genres)
   • Uses absolute JSON path (depth-safe)
   • Collections are matched via game.genres[] tags
   • Zero visual or layout changes
   • Console-only diagnostics
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
        /* ------------------------------------------------------------
           ABSOLUTE PATH — SAFE FROM ANY DEPTH
        ------------------------------------------------------------ */
        const response = await fetch("/games/games.json");
        const games = await response.json();

        if (!Array.isArray(games)) {
            console.error("[CCG COLLECTION] games.json is not an array");
            return;
        }

        const key = collectionName.toLowerCase();

        const filtered = games.filter(game =>
            Array.isArray(game.genres) &&
            game.genres
                .map(g => String(g).toLowerCase().trim())
                .includes(key)
        );

        if (countEl) {
            countEl.textContent = filtered.length.toString();
        }

        if (filtered.length === 0) {
            console.warn(
                `[CCG COLLECTION WARNING] No games found for collection "${collectionName}"`
            );
        }

        grid.innerHTML = filtered
            .map(game => generateGenreCard(game))
            .join("");

    } catch (err) {
        console.error("[CCG COLLECTION] Loader failed:", err);
    }
});
