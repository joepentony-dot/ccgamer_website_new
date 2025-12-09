/* ============================================================
   OMEGA GENRE LOADER — LONG-FORM GENRE EDITION
   Matches EXACT values used in games.json
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
        const allGames = await response.json();

        // ---- MATCH EXACT LONG-FORM GENRE VALUES ----
        const filtered = allGames.filter(game =>
            Array.isArray(game.genres) &&
            game.genres.some(g => g.trim().toLowerCase() === genreName.trim().toLowerCase())
        );

        // Update count
        countEl.textContent = filtered.length;

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
            const thumb = game.thumbnail || "../../resources/images/thumbnails/default.png";
            const safeTitle = game.title || "Untitled Game";

            return `
                <a href="../game.html?id=${game.id}" class="ccg-game-card" data-ccg-game-id="${game.id}">
                    <div class="ccg-game-card__thumb-wrap">
                        <img src="${thumb}" alt="${safeTitle}" class="ccg-game-card__thumb" loading="lazy">
                    </div>

                    <div class="ccg-game-card__info">
                        <h3 class="ccg-game-card__title">${safeTitle}</h3>
                        <p class="ccg-game-card__meta">
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
