/* ============================================================
   CCG GENRE LOADER — OMEGA ULTRA STABLE EDITION
   Reads games.json, filters by genre, injects ULTRA cards.
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
        const response = await fetch("../../games.json");
        const allGames = await response.json();

        if (!Array.isArray(allGames)) {
            console.error("CCG Genre Loader: games.json malformed.");
            return;
        }

        // Match genres exactly as stored in games.json
        const filtered = allGames.filter(game =>
            Array.isArray(game.genres) &&
            game.genres.includes(genreName)
        );

        // Count visible games
        if (countEl) countEl.textContent = filtered.length;

        // Inject each card
        filtered.forEach(game => {
            const card = createGenreGameCard(game);
            grid.appendChild(card);
        });

    } catch (err) {
        console.error("CCG Genre Loader Error:", err);
    }
});

/* ============================================================
   CREATE GENRE GAME CARD — Omega ULTRA Version
   ============================================================ */

function createGenreGameCard(game) {

    // ------------------------------------------------------------
    //  FIXED: genre pages sit at /games/genres/
    //  → must go UP TWO levels to reach project root: "../../"
    //
    //  games.json already contains full path:
    //     resources/images/thumbnails/all/foo.jpg
    //
    //  Correct final path:
    //     ../../resources/images/thumbnails/all/foo.jpg
    // ------------------------------------------------------------
    const thumbPath = `../../${game.thumbnail}`;

    const card = document.createElement("div");
    card.className = "ccg-game-card";

    card.innerHTML = `
        <a href="../game.html?id=${game.id}" class="ccg-game-card__link-wrapper">

            <div class="ccg-game-card__thumb">
                <img src="${thumbPath}" alt="${game.title}" loading="lazy">
            </div>

            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>

                <div class="ccg-game-card__meta">
                    ${game.year || "Unknown"} • ${game.system || "C64/Amiga"}
                </div>

                <div class="ccg-game-card__tags">
                    ${(game.genres || [])
                        .map(tag => `<span class="ccg-game-card__tag">${tag}</span>`)
                        .join("")}
                </div>

                <div class="ccg-game-card__link">
                    View Game →
                </div>
            </div>

        </a>
    `;

    return card;
}
