/* ============================================================
   CCG GAMES LIBRARY — OMEGA ULTRA-STABLE EDITION (FINAL FIX)
   Thumbnail logic corrected:
   - JSON paths remain untouched (source of truth)
   - Proper depth adjustment for /games/ directory
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    try {
        // CORRECT PATH — index.html lives inside /games/
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

/* ------------------------------------------------------------
   RENDERER — No prefix stripping. JSON thumbnail stays intact.
   Simply add "../" for correct depth from /games/ pages.
------------------------------------------------------------ */
function renderGameCard(game) {

    let thumb = game.thumbnail || "";

    // JSON thumbnails are root-relative ("resources/images/thumbnails/all/*.jpg")
    const finalThumb = `../${thumb}`;

    const meta = [
        game.year || "",
        game.system || "",
        game.developer || ""
    ].filter(Boolean).join(" · ");

    return `
        <a href="game.html?id=${game.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img src="${finalThumb}" alt="${game.title}">
            </div>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>
                <div class="ccg-game-card__meta">${meta}</div>
            </div>
        </a>
    `;
}
