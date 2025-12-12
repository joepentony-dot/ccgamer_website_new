/* ============================================================
   CCG CARD BUILDER — OMEGA CANONICAL EDITION
   ------------------------------------------------------------
   • Single source of truth for game cards
   • Used by:
       - genre-loader.js
       - collection-loader.js
       - future systems
   • Zero fetch logic
   • Zero page assumptions
============================================================ */

/* ------------------------------------------------------------
   Thumbnail resolver (safe, depth-agnostic)
------------------------------------------------------------ */
function ccgResolveThumb(raw) {
    if (!raw) return "../../resources/images/thumbnails/all/1942.jpg";

    let t = String(raw).trim();

    t = t.replace(/^\/+/, "");
    t = t.replace("resources/images/thumbnails/all/", "");
    t = t.replace("resources/images/thumbnails/", "");
    t = t.replace("resources/images/", "");

    if (!t) t = "1942.jpg";

    return `../../resources/images/thumbnails/all/${t}`;
}

/* ------------------------------------------------------------
   Build Omega game card (grid-safe)
------------------------------------------------------------ */
function ccgBuildGameCard(game) {

    if (!game || game.id === undefined) {
        console.warn("[CCG CARD] Invalid game object:", game);
        return "";
    }

    const thumb = ccgResolveThumb(
        game.thumbnail || game.thumb || game.cover
    );

    const meta = [
        game.year || "",
        game.system || "",
        game.developer || ""
    ].filter(Boolean).join(" · ");

    return `
        <div class="ccg-game-card genre-card">
            <a href="../game.html?id=${game.id}" class="ccg-game-card__thumb">
                <img src="${thumb}" alt="${game.title || "Game artwork"}">
            </a>

            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">
                    ${game.title || "Unknown Game"}
                </h3>

                <div class="ccg-game-card__meta">
                    ${meta}
                </div>

                <a href="../game.html?id=${game.id}"
                   class="ccg-btn ccg-btn--primary">
                   View Game
                </a>
            </div>
        </div>
    `;
}
