/* ============================================================
   CCG LOAD SINGLE GAME — OMEGA ADAPTIVE EDITION (INTEGRITY HARDENED)
   ----------------------------------------------------------------
   • Preserves all existing visuals and behaviour
   • Removes double-fetch by reusing loaded JSON
   • Console-only integrity diagnostics
   • UPDATED: Related games by developer / publisher
============================================================ */

let CCG_SINGLE_ALL_GAMES = [];

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const gameIdRaw = params.get("id");
    const gameId = (gameIdRaw || "").toString().trim();

    if (!gameId) {
        console.error("[CCG] No game ID in URL (?id=...)");
        return;
    }

    try {
        const response = await fetch("../games/games.json");
        const games = await response.json();

        CCG_SINGLE_ALL_GAMES = Array.isArray(games) ? games : [];

        runSingleGameIntegrityChecks(CCG_SINGLE_ALL_GAMES);

        const game = CCG_SINGLE_ALL_GAMES.find(
            g => String(g.id) === String(gameId)
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

function resolveLemonLinks(game) {
    if (Array.isArray(game.lemon)) return game.lemon;
    if (typeof game.lemon === "string") return [game.lemon];
    return [];
}

/* ============================================================
   RENDER GAME
============================================================ */
function renderGame(game) {

    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

    const heroBG = document.getElementById("gameHeroBG");
    if (heroBG) {
        heroBG.style.backgroundImage = `url('${thumb}')`;
        heroBG.style.backgroundSize = "cover";
        heroBG.style.backgroundPosition = "center";
    }

    const heroThumb = document.getElementById("gameHeroThumb");
    if (heroThumb) heroThumb.src = thumb;

    document.getElementById("gameHeroTitle").textContent = game.title || "Unknown";
    document.getElementById("gameMetaYear").textContent = game.year || "—";
    document.getElementById("gameMetaSystem").textContent = game.system || "—";
    document.getElementById("gameMetaDeveloper").textContent =
        game.developer || game.publisher || "—";

    if (Array.isArray(game.genres)) {
        const g = document.getElementById("gameGenres");
        g.textContent = game.genres.join(", ");
        g.hidden = false;
    }

    if (game.description) {
        document.getElementById("gameDescription").innerHTML = game.description;
        document.getElementById("game-description-section").hidden = false;
    }

    const vid = resolveVideoId(game);
    if (vid) {
        document.getElementById("game-video-embed").src =
            `https://www.youtube.com/embed/${vid}`;
        document.getElementById("game-video-section").hidden = false;
        const btn = document.getElementById("gameVideoBtn");
        btn.href = `https://www.youtube.com/watch?v=${vid}`;
        btn.hidden = false;
    }

    const manual = resolveManualUrl(game);
    if (manual) {
        const btn = document.getElementById("gameManualBtn");
        btn.href = manual;
        btn.hidden = false;
    }

    const disk = resolveDiskUrl(game);
    if (disk) {
        const btn = document.getElementById("gameDiskBtn");
        btn.href = disk;
        btn.hidden = false;
    }

    renderRelatedGames(game, CCG_SINGLE_ALL_GAMES);
}

/* ============================================================
   RELATED GAMES — SAME DEVELOPER / PUBLISHER
============================================================ */
function renderRelatedGames(game, allGames) {
    const section = document.querySelector(".game-section--related");
    const titleEl = section?.querySelector(".game-section__title");
    const container = document.getElementById("relatedGamesGrid");

    if (!section || !container) return;

    const currentId = String(game.id);
    const dev = (game.developer || "").trim();
    const pub = (game.publisher || "").trim();

    let related = [];

    if (dev) {
        related = allGames.filter(g =>
            String(g.id) !== currentId &&
            (g.developer || "").trim() === dev
        );
    }

    if (related.length === 0 && pub) {
        related = allGames.filter(g =>
            String(g.id) !== currentId &&
            (g.publisher || "").trim() === pub
        );
    }

    related = related.slice(0, 6);

    if (related.length === 0) {
        section.hidden = true;
        return;
    }

    if (titleEl) {
        titleEl.textContent = "Games from the same developer / publisher";
    }

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
