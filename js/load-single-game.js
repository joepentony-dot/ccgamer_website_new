/* ============================================================
   CCG LOAD SINGLE GAME — STABLE RESTORE + URL SAFE IDS
   ------------------------------------------------------------
   • Correct games.json path (FIXED)
   • URL-safe ID decoding
   • FULL renderGame restored
============================================================ */

let CCG_SINGLE_ALL_GAMES = [];

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const params = new URLSearchParams(window.location.search);
    const gameId = decodeURIComponent(
        (params.get("id") || "").toString().trim()
    );

    if (!gameId) {
        console.error("[CCG] No game ID in URL");
        return;
    }

    try {
        // 🔧 FIX: explicit depth-safe path
        const response = await fetch("games.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`games.json ${response.status}`);

        const games = await response.json();
        CCG_SINGLE_ALL_GAMES = Array.isArray(games) ? games : [];

        const game = CCG_SINGLE_ALL_GAMES.find(
            g => String(g.id) === gameId
        );

        if (!game) {
            console.error(`[CCG] Game not found for id="${gameId}"`);
            return;
        }

        renderGame(game);

    } catch (err) {
        console.error("[CCG] Single game load failed:", err);
    }
});

/* ============================================================
   THUMBNAIL RESOLVER
============================================================ */

function resolveGameThumb(raw) {
    if (!raw) return "../resources/images/thumbnails/all/1942.jpg";

    let t = String(raw).trim().replace(/^\/+/, "");
    t = t.replace("resources/images/thumbnails/all/", "")
         .replace("resources/images/thumbnails/", "")
         .replace("resources/images/", "");

    return `../resources/images/thumbnails/all/${t}`;
}

/* ============================================================
   FIELD RESOLVERS
============================================================ */

function resolveVideoId(game) {
    return (
        game.videoid ||
        game.video ||
        game.youtube ||
        game.yt ||
        ""
    ).toString().trim();
}

function resolveManualUrl(game) {
    return game.pdf || game.manual || "";
}

function resolveDiskUrl(game) {
    if (Array.isArray(game.disk) && game.disk[0]) return game.disk[0];
    if (typeof game.disk === "string") return game.disk;
    if (typeof game.tape === "string") return game.tape;
    return "";
}

/* ============================================================
   RENDER GAME
============================================================ */

function renderGame(game) {

    const heroBG = document.getElementById("gameHeroBG");
    const heroThumb = document.getElementById("gameHeroThumb");
    const titleEl = document.getElementById("gameHeroTitle");
    const yearEl = document.getElementById("gameMetaYear");
    const systemEl = document.getElementById("gameMetaSystem");
    const devEl = document.getElementById("gameMetaDeveloper");
    const genresEl = document.getElementById("gameGenres");
    const descEl = document.getElementById("gameDescription");
    const descSection = document.getElementById("game-description-section");

    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

    if (heroBG) heroBG.style.backgroundImage = `url('${thumb}')`;
    if (heroThumb) heroThumb.src = thumb;
    if (titleEl) titleEl.textContent = game.title || "Unknown";
    if (yearEl) yearEl.textContent = game.year || "—";
    if (systemEl) systemEl.textContent = game.system || "—";
    if (devEl) devEl.textContent = game.developer || game.publisher || "—";

    if (Array.isArray(game.genres) && genresEl) {
        genresEl.textContent = game.genres.join(", ");
        genresEl.hidden = false;
    }

    if (game.description && descEl && descSection) {
        descEl.innerHTML = game.description;
        descSection.hidden = false;
    }

    const vid = resolveVideoId(game);
    if (vid) {
        const iframe = document.getElementById("game-video-embed");
        const section = document.getElementById("game-video-section");
        const btn = document.getElementById("gameVideoBtn");

        if (iframe) iframe.src = `https://www.youtube.com/embed/${vid}`;
        if (section) section.hidden = false;
        if (btn) {
            btn.href = `https://www.youtube.com/watch?v=${vid}`;
            btn.hidden = false;
        }
    }

    const manual = resolveManualUrl(game);
    if (manual) {
        const btn = document.getElementById("gameManualBtn");
        if (btn) {
            btn.href = manual;
            btn.hidden = false;
        }
    }

    const disk = resolveDiskUrl(game);
    if (disk) {
        const btn = document.getElementById("gameDiskBtn");
        if (btn) {
            btn.href = disk;
            btn.hidden = false;
        }
    }

    renderRelatedGames(game, CCG_SINGLE_ALL_GAMES);
}

/* ============================================================
   RELATED GAMES
============================================================ */

function renderRelatedGames(game, allGames) {
    const container = document.getElementById("relatedGamesGrid");
    const titleEl = document.querySelector(".game-section--related .game-section__title");

    if (!container) return;

    const related = allGames
        .filter(g =>
            String(g.id) !== String(game.id) &&
            g.developer &&
            g.developer === game.developer
        )
        .slice(0, 6);

    if (titleEl) titleEl.textContent = "Similar(ish) titles…";

    container.innerHTML = related.map(g => {
        const thumb = resolveGameThumb(g.thumbnail || g.thumb || g.cover);
        return `
            <a href="game.html?id=${encodeURIComponent(g.id)}" class="ccg-game-card">
                <div class="ccg-game-card__thumb">
                    <img src="${thumb}" alt="${g.title}">
                </div>
                <div class="ccg-game-card__body">
                    <h3 class="ccg-game-card__title">${g.title}</h3>
                    <div class="ccg-game-card__meta">
                        ${(g.year || "")} · ${(g.system || "")}
                    </div>
                </div>
            </a>
        `;
    }).join("");
}
