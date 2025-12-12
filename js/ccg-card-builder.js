/* ============================================================
   CCG CARD BUILDER — SHARED (GENRES + COLLECTIONS)
   ------------------------------------------------------------
   • Single source of truth for:
     - resolveGenreThumb()
     - generateGenreCard()
   • Works for pages at:
     /games/genres/*.html
     /games/collections/*.html
   • No layout changes — just helper functions
============================================================ */

/* ------------------------------------------------------------
   Thumbnail sanitiser — returns VALID thumbnail path
   Note: Genre/Collection pages live at /games/genres/ and /games/collections/
   so thumbnails must be ../../resources/images/thumbnails/all/<file>
------------------------------------------------------------ */
function resolveGenreThumb(raw) {
    if (!raw) return "../../resources/images/thumbnails/all/1942.jpg";

    let t = String(raw).trim();

    // Strip any leading slashes
    t = t.replace(/^\/+/, "");

    // Reduce any stored path down to filename
    t = t.replace("resources/images/thumbnails/all/", "");
    t = t.replace("resources/images/thumbnails/", "");
    t = t.replace("resources/images/", "");

    if (!t) t = "1942.jpg";

    return `../../resources/images/thumbnails/all/${t}`;
}

/* ------------------------------------------------------------
   Build game card (Omega 16:9 card system)
   (Name kept as generateGenreCard for compatibility)
------------------------------------------------------------ */
function generateGenreCard(game) {

    if (!game || game.id === undefined) {
        console.warn("[CCG DATA WARNING] Game missing ID:", game);
    }

    const finalThumb = resolveGenreThumb(
        game.thumbnail || game.thumb || game.cover
    );

    const meta = [
        game.year || "",
        game.system || "",
        game.developer || ""
    ].filter(Boolean).join(" · ");

    const gameId = (game && game.id !== undefined && game.id !== null) ? String(game.id) : "";

    return `
        <div class="ccg-game-card genre-card">
            <a href="../game.html?id=${gameId}" class="ccg-game-card__thumb">
                <img src="${finalThumb}" alt="${game.title || "Game artwork"}">
            </a>

            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title || "Unknown Game"}</h3>
                <div class="ccg-game-card__meta">${meta}</div>

                <a href="../game.html?id=${gameId}"
                   class="ccg-btn ccg-btn--primary">View Game</a>
            </div>
        </div>
    `;
}

/* Expose globally (so loaders can call them safely) */
window.resolveGenreThumb = resolveGenreThumb;
window.generateGenreCard = generateGenreCard;
