/* ============================================================
   CCG LOAD SINGLE GAME — OMEGA MATCHED EDITION (FINAL A4)
   Absolute path-safe, thumbnail-safe, video-safe.
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        console.error("No game ID provided in URL");
        return;
    }

    try {
        // CORRECT PATH (game.html lives inside /games/)
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
   RENDER GAME
   ============================================================ */

function renderGame(game) {

    /* -------- THUMBNAIL FIX -------- */
    let thumb = game.thumbnail || "";

    // Strip redundant prefixes from JSON if present
    if (thumb.startsWith("resources/images/")) {
        thumb = thumb.replace("resources/images/thumbnails/all/", "");
        thumb = thumb.replace("resources/images/thumbnails/", "");
        thumb = thumb.replace("resources/images/", "");
    }

    const finalThumb = `../resources/images/thumbnails/all/${thumb}`;


    /* ------------------------------------------------------------
       HERO — IMAGE & BASIC META
    ------------------------------------------------------------ */

    document.getElementById("gameSystemKicker").textContent = game.system || "Unknown";
    document.getElementById("gameHeroTitle").textContent = game.title;
    document.getElementById("gameHeroThumb").src = finalThumb;

    const bg = document.getElementById("gameHeroBG");
    if (bg) {
        bg.style.backgroundImage = `url('${finalThumb}')`;
    }

    document.getElementById("gameMetaYear").textContent = game.year || "—";
    document.getElementById("gameMetaSystem").textContent = game.system || "—";
    document.getElementById("gameMetaDeveloper").textContent = game.developer || "Unknown";


    /* ------------------------------------------------------------
       GENRES
    ------------------------------------------------------------ */

    const genresEl = document.getElementById("gameGenres");
    if (genresEl && game.genres?.length) {
        genresEl.textContent = game.genres.join(", ");
        genresEl.hidden = false;
    }


    /* ------------------------------------------------------------
       DESCRIPTION
    ------------------------------------------------------------ */

    if (game.description) {
        document.getElementById("gameDescription").innerHTML = game.description;
        document.getElementById("game-description-section").hidden = false;
    }


    /* ------------------------------------------------------------
       EXTERNAL LINKS (e.g., Lemon64 / LemonAmiga)
    ------------------------------------------------------------ */

    const lemonBlock = document.getElementById("lemon-links-block");
    const lemonList = document.getElementById("lemon-links-list");

    if (Array.isArray(game.lemon) && game.lemon.length > 0) {
        lemonBlock.hidden = false;
        lemonList.innerHTML = game.lemon.map(url => `
            <li><a href="${url}" target="_blank" rel="noopener">${url}</a></li>
        `).join("");
    }


    /* ------------------------------------------------------------
       VIDEO — EMBED + META + WATCH BUTTON
    ------------------------------------------------------------ */

    if (game.videoid) {

        // Show iframe section
        document.getElementById("game-video-embed").src =
            `https://www.youtube.com/embed/${game.videoid}`;
        document.getElementById("game-video-section").hidden = false;

        // Activate "Watch on YouTube" button
        const videoBtn = document.getElementById("gameVideoBtn");
        if (videoBtn) {
            videoBtn.href = `https://www.youtube.com/watch?v=${game.videoid}`;
            videoBtn.hidden = false;
        }

        // Update meta tags for SEO
        const metaTitle = document.getElementById("game-meta-title");
        const metaDesc = document.getElementById("game-meta-description");

        if (metaTitle) {
            metaTitle.textContent = `${game.title} (${game.year || "C64/Amiga"}) | Cheeky Commodore Gamer`;
        }

        if (metaDesc) {
            metaDesc.content =
                `Full details, screenshots and gameplay video for ${game.title} on the ${game.system}.`;
        }
    }


    /* ------------------------------------------------------------
       MANUAL (PDF)
    ------------------------------------------------------------ */
    if (game.pdf) {
        const btn = document.getElementById("gameManualBtn");
        btn.href = game.pdf;
        btn.hidden = false;
    }


    /* ------------------------------------------------------------
       DISK / TAPE
    ------------------------------------------------------------ */
    if (Array.isArray(game.disk) && game.disk.length > 0) {
        const btn = document.getElementById("gameDiskBtn");
        btn.href = game.disk[0];
        btn.hidden = false;
    }


    /* ------------------------------------------------------------
       RELATED GAMES
    ------------------------------------------------------------ */

    renderRelatedGames(game);
}


/* ============================================================
   RELATED GAMES
   ============================================================ */

function renderRelatedGames(game) {
    const container = document.getElementById("relatedGamesGrid");
    if (!container) return;

    fetch("../games/games.json")
        .then(res => res.json())
        .then(allGames => {

            const primary = game.genres?.[0] || null;

            const related = allGames.filter(g =>
                g.id !== game.id &&
                g.genres &&
                g.genres.includes(primary)
            ).slice(0, 6);

            container.innerHTML = related.map(g => {

                let t = g.thumbnail || "";
                if (t.startsWith("resources/images/")) {
                    t = t.replace("resources/images/thumbnails/all/", "");
                }

                const final = `../resources/images/thumbnails/all/${t}`;

                return `
                    <a href="game.html?id=${g.id}" class="ccg-game-card">
                        <div class="ccg-game-card__thumb">
                            <img src="${final}" alt="${g.title}">
                        </div>
                        <div class="ccg-game-card__body">
                            <h3 class="ccg-game-card__title">${g.title}</h3>
                            <div class="ccg-game-card__meta">${g.year || ""} · ${g.system || ""}</div>
                        </div>
                    </a>
                `;
            }).join("");
        });
}
