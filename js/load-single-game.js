/* ============================================================
   CCG LOAD SINGLE GAME — STABLE + W4 POLISH + SG-E1 MANUAL MODAL
   ------------------------------------------------------------
   • Correct games.json path (LOCKED)
   • URL-safe ID decoding
   • FULL renderGame restored
   • W4: Smart related-games fallback logic
   • W4: Auto-hide empty sections
   • SG-E1.3: Cinematic Manual Modal Viewer
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
        // 🔒 LOCKED: depth-safe path
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
   THUMBNAIL RESOLVER (LOCKED)
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
   FIELD RESOLVERS (LOCKED)
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
    const descEl = document.getElementById("gameDescription");
    const descSection = document.getElementById("game-description-section");

    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

    if (heroBG) heroBG.style.backgroundImage = `url('${thumb}')`;
    if (heroThumb) heroThumb.src = thumb;
    if (titleEl) titleEl.textContent = game.title || "Unknown";
    if (yearEl) yearEl.textContent = game.year || "—";
    if (systemEl) systemEl.textContent = game.system || "—";
    if (devEl) devEl.textContent = game.developer || game.publisher || "—";

    if (game.description && descEl && descSection) {
        descEl.innerHTML = game.description;
        descSection.hidden = false;
    }

    /* VIDEO */
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

    /* MANUAL (MODAL-AWARE) */
    const manual = resolveManualUrl(game);
    if (manual) {
        const btn = document.getElementById("gameManualBtn");
        if (btn) {
            btn.href = manual;
            btn.hidden = false;

            btn.addEventListener("click", (e) => {
                const modal = document.getElementById("manualModal");
                const frame = document.getElementById("manualPdfFrame");
                const title = document.getElementById("manualModalTitle");

                if (!modal || !frame) return;

                e.preventDefault();

                frame.src = manual;
                if (title) title.textContent = `${game.title} — Manual`;

                modal.classList.add("active");
                modal.setAttribute("aria-hidden", "false");
                document.body.style.overflow = "hidden";
            });
        }
    }

    /* DISK / TAPE */
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
   MODAL CLOSE HANDLING (SAFE, LOCAL)
============================================================ */

document.addEventListener("click", (e) => {

    const modal = document.getElementById("manualModal");
    if (!modal || !modal.classList.contains("active")) return;

    if (
        e.target.classList.contains("ccg-modal-close") ||
        e.target === modal
    ) {
        closeManualModal();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeManualModal();
});

function closeManualModal() {
    const modal = document.getElementById("manualModal");
    const frame = document.getElementById("manualPdfFrame");

    if (!modal) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    if (frame) frame.src = "";
}

/* ============================================================
   RELATED GAMES — W4 SMART FALLBACK
============================================================ */

function renderRelatedGames(game, allGames) {

    const section = document.querySelector(".game-section--related");
    const container = document.getElementById("relatedGamesGrid");
    const titleEl = section?.querySelector(".game-section__title");

    if (!section || !container) return;

    let related = [];

    /* Priority 1 — Same developer */
    if (game.developer) {
        related = allGames.filter(g =>
            String(g.id) !== String(game.id) &&
            g.developer === game.developer
        );
    }

    /* Priority 2 — Same genre fallback */
    if (related.length === 0 && Array.isArray(game.genres)) {
        related = allGames.filter(g =>
            String(g.id) !== String(game.id) &&
            Array.isArray(g.genres) &&
            g.genres.some(gen => game.genres.includes(gen))
        );
    }

    related = related.slice(0, 6);

    /* Nothing useful — hide section entirely */
    if (related.length === 0) {
        section.hidden = true;
        return;
    }

    if (titleEl) {
        titleEl.textContent =
            related[0].developer === game.developer
                ? "More from the same developer"
                : "Related games you might like";
    }

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
