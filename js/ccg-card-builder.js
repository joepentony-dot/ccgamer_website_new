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
    const fallback = "../../resources/images/thumbnails/all/1942.jpg";

    if (!raw) return fallback;

    let t = String(raw).trim();
    if (!t) return fallback;

    if (/^https?:\/\//i.test(t)) return t;

    t = t.replace(/^\.?\//, "");
    t = t.replace(/^(\.\.\/)+/, "");

    if (t.startsWith("resources/")) {
        return `../../${t}`;
    }

    if (t.includes("/")) {
        return `../../${t}`;
    }

    return `../../resources/images/thumbnails/all/${t}`;
}

/* ------------------------------------------------------------
   Safe HTML text (prevent malformed markup from data)
------------------------------------------------------------ */
function ccgEscapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------
   Game URL resolver (supports pretty URLs + fallback)
------------------------------------------------------------ */
function ccgResolveGameUrl(gameId) {
    const slug = String(gameId || "").replace(/_/g, "-");
    if (slug) return `../game.html?slug=${encodeURIComponent(slug)}`;

    return `../game.html?id=${encodeURIComponent(gameId)}`;
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

    const gameUrl = ccgResolveGameUrl(game.id);

    const title = ccgEscapeHtml(game.title || "Unknown Game");
    const meta = [
        ccgEscapeHtml(game.year || ""),
        ccgEscapeHtml(game.system || ""),
        ccgEscapeHtml(game.developer || "")
    ].filter(Boolean).join(" · ");

    return `
        <div class="ccg-game-card genre-card">
            <a href="${gameUrl}" class="ccg-game-card__thumb">
                <img src="${thumb}" alt="${title}">
            </a>

            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">
                    ${title}
                </h3>

                <div class="ccg-game-card__meta">
                    ${meta}
                </div>

                <div class="ccg-game-card__actions">
                    <a href="${gameUrl}"
                       class="ccg-btn ccg-btn--primary ccg-game-card__btn">
                       View Game
                    </a>
                </div>
            </div>
        </div>
    `;
}

if (typeof window !== "undefined") {
    window.ccgBuildGameCard = ccgBuildGameCard;
    window.dispatchEvent(new Event("ccg-card-builder-ready"));
}
