/* ============================================================
   CCG LOAD SINGLE GAME — OMEGA ADAPTIVE EDITION (STABLE)
   ----------------------------------------------------------------
   • Preserves all existing visuals and behaviour
   • Deterministic JSON load (correct path)
============================================================ */

let CCG_SINGLE_ALL_GAMES = [];

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = (params.get("id") || "").toString().trim();

    if (!gameId) {
        console.error("[CCG] No game ID in URL (?id=...)");
        return;
    }

    try {
        /* 🔧 FIXED PATH */
        const response = await fetch("games.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`games.json ${response.status}`);

        const games = await response.json();
        CCG_SINGLE_ALL_GAMES = Array.isArray(games) ? games : [];

        runSingleGameIntegrityChecks(CCG_SINGLE_ALL_GAMES);

        const game = CCG_SINGLE_ALL_GAMES.find(
            g => String(g.id) === gameId
        );

        if (!game) {
            console.error(`[CCG] Game not found for id="${gameId}"`);
            return;
        }

        renderGame(game);

    } catch (err) {
        console.error("[CCG] Error loading games.json:", err);
    }
});

/* ============================================================
   INTEGRITY CHECKS (CONSOLE ONLY)
============================================================ */

function runSingleGameIntegrityChecks(games) {
    const seen = new Set();

    games.forEach((g, idx) => {
        const id = g?.id != null ? String(g.id) : "";

        if (!id) {
            console.warn(`[CCG DATA WARNING] Game missing ID at index ${idx}`, g);
            return;
        }

        if (seen.has(id)) {
            console.warn(`[CCG DATA WARNING] Duplicate game ID: ${id}`, g);
        }
        seen.add(id);
    });
}

/* ============================================================
   THUMBNAIL RESOLVER
============================================================ */

function resolveGameThumb(raw) {
    if (!raw) return "../resources/images/thumbnails/all/1942.jpg";

    let t = String(raw).trim().replace(/^\/+/, "");
    t = t.replace("resources/images/thumbnails/all/", "")
         .replace("resources/images/thumbnails/", "")
         .replace("resources/images/", "");

    return `../resources/images/thumbnails/all/${t || "1942.jpg"}`;
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

    if (heroBG) {
        heroBG.style.backgroundImage = `url('${thumb}')`;
    }

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
   RELATED GAMES (UNCHANGED)
============================================================ */

function renderRelatedGames(game, allGames) {
    const section = document.querySelector(".game-section--related");
    const titleEl = section?.querySelector(".game-section__title");
    const container = document.getElementById("relatedGamesGrid");

    if (!section || !container) return;

    const currentId = String(game.id);
    const dev = (game.developer || "").trim();

    const related = allGames.filter(g =>
        String(g.id) !== currentId &&
        dev &&
        (g.developer || "").trim() === dev
    ).slice(0, 6);

    if (titleEl) titleEl.textContent = "Similar(ish) titles…";

    container.innerHTML = related.map(g => {
        const thumb = resolveGameThumb(g.thumbnail || g.thumb || g.cover);
        return `
            <a href="game.html?id=${g.id}" class="ccg-game-card">
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
