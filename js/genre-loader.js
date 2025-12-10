/* ============================================================
   OMEGA GENRE LOADER — LONG-FORM GENRE EDITION (Stability)
   Matches EXACT values used in games.json
   Target: /games/genres/*.html
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const genreName = document.body.dataset.genre;
    const grid = document.getElementById("genreGamesGrid");
    const countEl = document.getElementById("genreGamesCount");

    if (!genreName || !grid) {
        console.warn("CCG Genre Loader: Missing data-genre or grid container.");
        return;
    }

    try {
        const response = await fetch("../../games/games.json");
        if (!response.ok) {
            throw new Error("Failed to fetch games.json");
        }

        const allGames = await response.json();

        // ---- MATCH EXACT LONG-FORM GENRE VALUES ----
        const filtered = allGames.filter(game =>
            Array.isArray(game.genres) &&
            game.genres.some(g => g.trim().toLowerCase() === genreName.trim().toLowerCase())
        );

        // Update count
        if (countEl) {
            countEl.textContent = filtered.length;
        }

        // If no games found, show nice Omega-friendly message
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="ccg-no-results">
                    <p>No games were found for: <strong>${genreName}</strong></p>
                    <p>This usually means the JSON does not contain this genre yet.</p>
                </div>
            `;
            return;
        }

        // ---- GENERATE GAME CARDS ----
        const cardsHTML = filtered.map(game => {
            const thumb = normaliseGenreThumb(game.thumbnail);
            const safeTitle = game.title || "Untitled Game";

            return `
                <a href="../game.html?id=${encodeURIComponent(game.id)}"
                   class="ccg-game-card"
                   data-ccg-game-id="${game.id}">
                    <img src="${thumb}"
                         alt="${safeTitle}"
                         loading="lazy">
                    <div class="ccg-game-card-content">
                        <h3 class="ccg-game-card-title">${safeTitle}</h3>
                        <p class="ccg-game-card-platform">
                            ${game.year ? game.year : "—"} 
                            • ${Array.isArray(game.genres) ? game.genres[0] : ""}
                        </p>
                    </div>
                </a>
            `;
        }).join("");

        grid.innerHTML = cardsHTML;

    } catch (err) {
        console.error("CCG Genre Loader — ERROR:", err);

        grid.innerHTML = `
            <div class="ccg-error">
                <p>Failed to load genre games.</p>
                <p>Please try again later.</p>
            </div>
        `;
    }
});

/* ============================================================
   THUMBNAIL PATH NORMALISER (GENRE PAGES)
   From: games.json (root-relative style)
   To:   ../../resources/images/thumbnails/all/<file>
   ============================================================ */

function normaliseGenreThumb(raw) {
    const FALLBACK = "../../resources/images/thumbnails/all/1942.jpg";

    if (!raw) return FALLBACK;

    let p = String(raw).trim();

    // Strip any ../ at the start
    p = p.replace(/^(\.\.\/)+/, "");

    // Strip repo prefix if present
    p = p.replace(/^\/?ccgamer_website_new\//, "");

    // Remove leading slash
    p = p.replace(/^\//, "");

    if (p.startsWith("resources/images/thumbnails/")) {
        if (!p.startsWith("resources/images/thumbnails/all/")) {
            p = p.replace(
                "resources/images/thumbnails/",
                "resources/images/thumbnails/all/"
            );
        }
    } else {
        // Treat as bare filename
        p = "resources/images/thumbnails/all/" + p;
    }

    // Genre pages live at /games/genres/*.html → need "../../"
    return "../../" + p;
}
