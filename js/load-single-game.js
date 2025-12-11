/* ============================================================
   CCG LOAD SINGLE GAME — OMEGA ADAPTIVE EDITION (FINAL 2025)
   ----------------------------------------------------------------
   • Supports all historic JSON field variations
   • Correct depth: this file lives in /js/, game.html lives in /games/
   • No thumbnail tiling — applies strict non-repeat + 16:9 logic
   • External links appear as clean UI buttons (not raw URLs)
   • Similar(ish) Titles section replaces "Related Games"
   • Fully mode-aware (C64 / Amiga neon)
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        console.error("No game ID in URL");
        return;
    }

    try {
        // Depth fix: /games/game.html → JSON is /games/games.json
        const response = await fetch("../games/games.json");
        const games = await response.json();

        const game = games.find(g => String(g.id) === String(gameId));

        if (!game) {
            console.error("Game not found:", gameId);
            return;
        }

        renderGame(game);

    } catch (err) {
        console.error("Error loading games.json:", err);
    }
});


/* ============================================================
   THUMBNAIL RESOLVER
   Ensures:
   - No tiling
   - Always returns: ../resources/images/thumbnails/all/<file>
============================================================ */
function resolveGameThumb(raw) {
    if (!raw) return "../resources/images/thumbnails/all/1942.jpg";

    let t = String(raw).trim();

    // Strip leading slashes
    t = t.replace(/^\/+/, "");

    // Normalise all resource paths to filename only
    t = t.replace("resources/images/thumbnails/all/", "");
    t = t.replace("resources/images/thumbnails/", "");
    t = t.replace("resources/images/", "");

    if (!t) t = "1942.jpg";

    return `../resources/images/thumbnails/all/${t}`;
}


/* ============================================================
   FIELD RESOLVERS — VIDEO, MANUAL, DSK/TAPE, LEMON
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
    if (game.pdf && String(game.pdf).trim()) return String(game.pdf).trim();
    if (game.manual && String(game.manual).trim()) return String(game.manual).trim();
    return "";
}

function resolveDiskUrl(game) {
    if (Array.isArray(game.disk) && game.disk.length > 0) {
        const url = String(game.disk[0] || "").trim();
        if (url) return url;
    }
    if (typeof game.disk === "string" && game.disk.trim()) {
        return game.disk.trim();
    }
    if (typeof game.tape === "string" && game.tape.trim()) {
        return game.tape.trim();
    }
    return "";
}

function resolveLemonLinks(game) {
    if (Array.isArray(game.lemon) && game.lemon.length > 0) return game.lemon;
    if (typeof game.lemon === "string" && game.lemon.trim()) return [game.lemon];
    if (Array.isArray(game.lemon64) && game.lemon64.length > 0) return game.lemon64;
    return [];
}


/* ============================================================
   RENDER GAME INTO game.html
============================================================ */
function renderGame(game) {

    /* ------------------------------------------------------------
       HERO THUMBNAIL + BG (NO MORE TILING!)
    ------------------------------------------------------------ */
    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

    const heroBG = document.getElementById("gameHeroBG");
    if (heroBG) {
        heroBG.style.backgroundImage = `url('${thumb}')`;
        heroBG.style.backgroundRepeat = "no-repeat";
        heroBG.style.backgroundSize = "cover";
        heroBG.style.backgroundPosition = "center";
    }

    const heroThumbImg = document.getElementById("gameHeroThumb");
    if (heroThumbImg) {
        heroThumbImg.src = thumb;
        heroThumbImg.alt = game.title || "Game artwork";
    }

    /* ------------------------------------------------------------
       HERO TEXT
    ------------------------------------------------------------ */
    const sys = document.getElementById("gameSystemKicker");
    if (sys) sys.textContent = game.system || "Unknown";

    const titleEl = document.getElementById("gameHeroTitle");
    if (titleEl) titleEl.textContent = game.title || "Unknown Game";

    /* ------------------------------------------------------------
       META (Year · System · Developer)
    ------------------------------------------------------------ */
    const yearEl = document.getElementById("gameMetaYear");
    const systemEl = document.getElementById("gameMetaSystem");
    const devEl = document.getElementById("gameMetaDeveloper");

    if (yearEl) yearEl.textContent = game.year || "—";
    if (systemEl) systemEl.textContent = game.system || "—";
    if (devEl) devEl.textContent = game.developer || "Unknown";

    /* ------------------------------------------------------------
       GENRES
    ------------------------------------------------------------ */
    const genresEl = document.getElementById("gameGenres");
    if (genresEl && Array.isArray(game.genres)) {
        genresEl.textContent = game.genres.join(", ");
        genresEl.hidden = false;
    }

    /* ------------------------------------------------------------
       DESCRIPTION
    ------------------------------------------------------------ */
    if (game.description) {
        const descBody = document.getElementById("gameDescription");
        const descSection = document.getElementById("game-description-section");

        if (descBody) descBody.innerHTML = game.description;
        if (descSection) descSection.hidden = false;
    }

    /* ------------------------------------------------------------
       EXTERNAL LINKS (LEMON) — AS BUTTONS
    ------------------------------------------------------------ */
    const lemon = resolveLemonLinks(game);
    if (lemon.length > 0) {
        const block = document.getElementById("lemon-links-block");
        const list = document.getElementById("lemon-links-list");

        if (block && list) {
            block.hidden = false;
            list.innerHTML = lemon.map(url => `
                <li>
                    <a class="ccg-btn ccg-btn--primary" 
                       href="${url}"
                       target="_blank"
                       rel="noopener">
                       View on Lemon
                    </a>
                </li>
            `).join("");
        }
    }

    /* ------------------------------------------------------------
       VIDEO (EMBED + BUTTON)
    ------------------------------------------------------------ */
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

        /* Update SEO tags */
        const metaTitle = document.getElementById("game-meta-title");
        const metaDesc = document.getElementById("game-meta-description");

        if (metaTitle) {
            metaTitle.textContent =
                `${game.title}${game.year ? " (" + game.year + ")" : ""} | Cheeky Commodore Gamer`;
        }

        if (metaDesc) {
            metaDesc.content =
                `Full details, screenshots, and gameplay video for ${game.title} on the ${game.system}.`;
        }
    }

    /* ------------------------------------------------------------
       MANUAL (PDF)
    ------------------------------------------------------------ */
    const manual = resolveManualUrl(game);
    if (manual) {
        const btn = document.getElementById("gameManualBtn");
        if (btn) {
            btn.href = manual;
            btn.hidden = false;
        }
    }

    /* ------------------------------------------------------------
       DISK / TAPE DOWNLOAD
    ------------------------------------------------------------ */
    const disk = resolveDiskUrl(game);
    if (disk) {
        const btn = document.getElementById("gameDiskBtn");
        if (btn) {
            btn.href = disk;
            btn.hidden = false;
        }
    }

    /* ------------------------------------------------------------
       SIMILAR(ISH) TITLES — OMEGA STRIP
    ------------------------------------------------------------ */
    renderRelatedGames(game);
}


/* ============================================================
   RELATED GAMES — "Similar(ish) titles…"
============================================================ */
function renderRelatedGames(game) {
    const container = document.getElementById("relatedGamesGrid");
    if (!container) return;

    fetch("../games/games.json")
        .then(res => res.json())
        .then(allGames => {

            const primary = Array.isArray(game.genres) ? game.genres[0] : null;
            if (!primary) {
                container.innerHTML = "";
                return;
            }

            const related = allGames
                .filter(g =>
                    g.id !== game.id &&
                    Array.isArray(g.genres) &&
                    g.genres.includes(primary)
                )
                .slice(0, 6);

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
        })
        .catch(err => console.error("Related games error:", err));
}
