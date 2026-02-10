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
function ccgResolveGameUrl(game) {
    let slug = String(game?.slug || "").trim();
    if (slug === "smash-t-5" || slug === "smash-t-v") slug = "smash-tv";
    if (slug) return `../${slug}/`;

    const id = String(game?.id || "").trim();
    if (id) {
        const fallbackSlug = id.toLowerCase().replace(/_+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
        if (fallbackSlug) return `../${fallbackSlug}/`;
    }

    return "#";
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

    const gameUrl = ccgResolveGameUrl(game);
    const ratingMarkup = typeof window !== "undefined" && typeof window.ccgBuildRatingMarkup === "function"
        ? window.ccgBuildRatingMarkup(game, {
            label: "CCG Rating",
            className: "ccg-rating--card"
        })
        : "";

    const title = ccgEscapeHtml(game.title || "Unknown Game");
    const meta = [
        ccgEscapeHtml(game.year || ""),
        ccgEscapeHtml(game.system || ""),
        ccgEscapeHtml(game.developer || "")
    ].filter(Boolean).join(" · ");

    return `
        <div class="ccg-game-card genre-card">
            <a href="${gameUrl}" class="ccg-game-card__thumb">
                <img src="${thumb}" srcset="${thumb} 320w" sizes="(max-width: 720px) 48vw, 320px" alt="${title}" loading="lazy" decoding="async" width="320" height="180">
                ${ratingMarkup}
            </a>

            <div class="ccg-game-card__body">
                <div class="game-title-wrapper">
                    <h3 class="ccg-game-card__title">
                        ${title}
                    </h3>

                    <div class="ccg-game-card__meta">
                        ${meta}
                    </div>
                </div>

                <div class="ccg-game-card__actions">
                    <a href="${gameUrl}"
                       class="ccg-btn ccg-btn--primary ccg-game-card__btn"
                       aria-label="View ${title}">
                       View ${title}
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
