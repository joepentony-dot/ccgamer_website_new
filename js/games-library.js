/* ============================================================
   CCG GAMES LIBRARY LOADER — OMEGA ULTRA STABLE EDITION
   Loads all games from games.json and populates the main grid.
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const grid = document.getElementById("ccgGamesGrid");
    const countEl = document.getElementById("ccgGamesCount");

    if (!grid) {
        console.warn("CCG Library Loader: Missing #ccgGamesGrid");
        return;
    }

    try {
        const response = await fetch("../games.json");
        const gamesData = await response.json();

        if (!Array.isArray(gamesData)) {
            console.error("CCG Library Loader: games.json is malformed.");
            return;
        }

        // Count games
        if (countEl) countEl.textContent = gamesData.length;

        // Inject each card
        gamesData.forEach(game => {
            const card = createGameCard(game);
            grid.appendChild(card);
        });

    } catch (err) {
        console.error("CCG Library Loader Error:", err);
    }
});

/* ============================================================
   CREATE GAME CARD
   ============================================================ */

function createGameCard(game) {

    // ------------------------------------------------------------
    //  FIXED: Thumbnail path uses JSON as source of truth.
    //  games.json contains: "resources/images/thumbnails/all/foo.jpg"
    //  From /games/index.html → root requires "../"
    // ------------------------------------------------------------
    const thumbPath = `../${game.thumbnail}`;

    const card = document.createElement("div");
    card.className = "ccg-game-card";

    card.innerHTML = `
        <a href="game.html?id=${game.id}" class="ccg-game-card__link-wrapper">

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
