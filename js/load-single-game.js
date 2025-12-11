/* ============================================================
   CCG LOAD SINGLE GAME — OMEGA ADAPTIVE EDITION (FINAL)
   - Supports multiple historic JSON field formats
   - Respects existing HTML structure & IDs
   - Silent mode (no noisy console warnings)
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        console.error("No game ID provided in URL");
        return;
    }

    try {
        // game.html lives inside /games/, JSON is /games/games.json
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
   HELPER — THUMBNAIL RESOLVER
   ============================================================ */
function resolveGameThumb(raw) {
    if (!raw) {
        return "../resources/images/thumbnails/all/1942.jpg";
    }

    let t = String(raw).trim();

    if (t.startsWith("/")) {
        t = t.replace(/^\/+/, "");
    }

    if (t.startsWith("resources/images/")) {
        t = t.replace("resources/images/thumbnails/all/", "");
        t = t.replace("resources/images/thumbnails/", "");
        t = t.replace("resources/images/", "");
    }

    if (!t) t = "1942.jpg";

    return `../resources/images/thumbnails/all/${t}`;
}

/* ============================================================
   HELPER — VIDEO, MANUAL, DISK FIELD RESOLVERS
   ============================================================ */
function resolveVideoId(game) {
    if (game.videoid) return String(game.videoid).trim();
    if (game.video) return String(game.video).trim();
    if (game.youtube) return String(game.youtube).trim();
    if (game.yt) return String(game.yt).trim();
    return "";
}

function resolveManualUrl(game) {
    if (game.pdf && String(game.pdf).trim()) return String(game.pdf).trim();
    if (game.manual && String(game.manual).trim()) return String(game.manual).trim();
    return "";
}

function resolveDiskUrl(game) {
    if (Array.isArray(game.disk) && game.disk.length > 0) {
        const first = String(game.disk[0] || "").trim();
        if (first) return first;
    }

    if (typeof game.disk === "string" && game.disk.trim()) return game.disk.trim();
    if (typeof game.tape === "string" && game.tape.trim()) return game.tape.trim();

    return "";
}

function resolveLemonLinks(game) {
    if (Array.isArray(game.lemon) && game.lemon.length > 0) {
        return game.lemon.map(String);
    }

    if (typeof game.lemon === "string" && game.lemon.trim()) {
        return [game.lemon.trim()];
    }

    if (Array.isArray(game.lemon64) && game.lemon64.length > 0) {
        return game.lemon64.map(String);
    }

    return [];
}

/* ============================================================
   RENDER GAME
   ============================================================ */

function renderGame(game) {

    const finalThumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

    const systemKickerEl = document.getElementById("gameSystemKicker");
    if (systemKickerEl) systemKickerEl.textContent = game.system || "Unknown";

    const titleEl = document.getElementById("gameHeroTitle");
    if (titleEl) titleEl.textContent = game.title || "Unknown Game";

    const heroThumbEl = document.getElementById("gameHeroThumb");
    if (heroThumbEl) {
        heroThumbEl.src = finalThumb;
        heroThumbEl.alt = game.title || "Game artwork";
    }

    const bg = document.getElementById("gameHeroBG");
    if (bg) bg.style.backgroundImage = `url('${finalThumb}')`;

    /* -------- META -------- */

    const yearEl = document.getElementById("gameMetaYear");
    if (yearEl) yearEl.textContent = game.year || "—";

    const systemEl = document.getElementById("gameMetaSystem");
    if (systemEl) systemEl.textContent = game.system || "—";

    const devEl = document.getElementById("gameMetaDeveloper");
    if (devEl) devEl.textContent = game.developer || "Unknown";

    /* -------- GENRES -------- */
    const genresEl = document.getElementById("gameGenres");
    if (genresEl && Array.isArray(game.genres) && game.genres.length > 0) {
        genresEl.textContent = game.genres.join(", ");
        genresEl.hidden = false;
    }

    /* -------- DESCRIPTION -------- */
    if (game.description) {
        const descBody = document.getElementById("gameDescription");
        const descSection = document.getElementById("game-description-section");

        if (descBody) descBody.innerHTML = game.description;
        if (descSection) descSection.hidden = false;
    }

    /* -------- EXTERNAL LINKS -------- */
    const lemonLinks = resolveLemonLinks(game);
    if (lemonLinks.length > 0) {
        const lemonBlock = document.getElementById("lemon-links-block");
        const lemonList = document.getElementById("lemon-links-list");

        if (lemonBlock && lemonList) {
            lemonBlock.hidden = false;
            lemonList.innerHTML = lemonLinks
                .map(url => `<li><a href="${url}" target="_blank" rel="noopener">${url}</a></li>`)
                .join("");
        }
    }

    /* -------- VIDEO -------- */
    const vidId = resolveVideoId(game);
    if (vidId) {
        const iframe = document.getElementById("game-video-embed");
        const vidSection = document.getElementById("game-video-section");
        const videoBtn = document.getElementById("gameVideoBtn");

        if (iframe) iframe.src = `https://www.youtube.com/embed/${vidId}`;
        if (vidSection) vidSection.hidden = false;
        if (videoBtn) {
            videoBtn.href = `https://www.youtube.com/watch?v=${vidId}`;
            videoBtn.hidden = false;
        }

        const metaTitle = document.getElementById("game-meta-title");
        const metaDesc = document.getElementById("game-meta-description");

        if (metaTitle) {
            metaTitle.textContent =
                `${game.title || "Game"}${game.year ? " (" + game.year + ")" : ""} | Cheeky Commodore Gamer`;
        }

        if (metaDesc) {
            metaDesc.content =
                `Full details, screenshots and gameplay video for ${game.title} on the ${game.system}.`;
        }
    }

    /* -------- MANUAL -------- */
    const manualUrl = resolveManualUrl(game);
    if (manualUrl) {
        const btn = document.getElementById("gameManualBtn");
        if (btn) {
            btn.href = manualUrl;
            btn.hidden = false;
        }
    }

    /* -------- DISK / TAPE -------- */
    const diskUrl = resolveDiskUrl(game);
    if (diskUrl) {
        const btn = document.getElementById("gameDiskBtn");
        if (btn) {
            btn.href = diskUrl;
            btn.hidden = false;
        }
    }

    /* -------- RELATED GAMES -------- */
    renderRelatedGames(game);
}

/* ============================================================
   RELATED GAMES  — UPDATED WITH DEVELOPER META
   ============================================================ */

function renderRelatedGames(game) {
    const container = document.getElementById("relatedGamesGrid");
    if (!container) return;

    fetch("../games/games.json")
        .then(res => res.json())
        .then(allGames => {

            const primary = Array.isArray(game.genres) && game.genres.length > 0
                ? game.genres[0]
                : null;

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
                const thumbPath = resolveGameThumb(g.thumbnail || g.thumb || g.cover);

                const meta = [
                    g.year || "",
                    g.system || "",
                    g.developer || ""
                ].filter(Boolean).join(" · ");

                return `
                    <a href="game.html?id=${g.id}" class="ccg-game-card">
                        <div class="ccg-game-card__thumb">
                            <img src="${thumbPath}" alt="${g.title}">
                        </div>
                        <div class="ccg-game-card__body">
                            <h3 class="ccg-game-card__title">${g.title}</h3>
                            <div class="ccg-game-card__meta">${meta}</div>
                        </div>
                    </a>
                `;
            }).join("");
        })
        .catch(err => {
            console.error("Error loading related games:", err);
        });
}
