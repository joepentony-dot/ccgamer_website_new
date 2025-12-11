/* ============================================================
   CCG GAMES LIBRARY — OMEGA ULTRA-STABLE EDITION (FIXED THUMBNAILS)
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    try {
        const response = await fetch("games.json");
        const games = await response.json();

        const grid = document.getElementById("gamesGrid");
        const countEl = document.getElementById("gamesCount");

        if (!grid) return;

        grid.innerHTML = games.map(g => renderGameCard(g)).join("");

        if (countEl) countEl.textContent = games.length;

    } catch (err) {
        console.error("Error loading games.json:", err);
    }
});

/* ============================================================
   UNIVERSAL THUMBNAIL NORMALISER
   Accepts ANY JSON format and outputs CLEAN filename.
   FIXES:
   - double paths
   - missing directories
   - legacy thumbnail issues
   ============================================================ */
function resolveThumbnail(thumb) {
    if (!thumb) return "";

    // Strip full prefix if JSON contains: resources/images/thumbnails/all/foo.jpg
    return thumb.replace(/^resources\/images\/thumbnails\/all\//i, "");
}

/* ============================================================
   RENDER GAME CARD
   ============================================================ */
function renderGameCard(game) {

    const cleanThumb = resolveThumbnail(game.thumbnail || "");

    // games/index.html → thumbnails live 1 level up in ../resources/
    const finalThumb = `../resources/images/thumbnails/all/${cleanThumb}`;

    return `
        <a href="game.html?id=${game.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img src="${finalThumb}" alt="${game.title}" loading="lazy">
            </div>

            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>
                <div class="ccg-game-card__meta">
                    ${game.year || ""} · ${game.system || ""}
                </div>
            </div>
        </a>
    `;
}
