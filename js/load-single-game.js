/* ============================================================
   CCG LOAD SINGLE GAME — OMEGA ULTRA-STABLE EDITION (FINAL)
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        console.error("No game ID provided in URL");
        return;
    }

    try {
        // CORRECT PATH — game.html lives inside /games/
        const response = await fetch("games.json");
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

    /* -------- THUMBNAIL (DO NOT MODIFY JSON PATHS) -------- */
    const finalThumb = `../${game.thumbnail}`;

    /* -------- HERO -------- */

    document.getElementById("gameSystemKicker").textContent = game.system || "Unknown";
    document.getElementById("gameHeroTitle").textContent = game.title;
    document.getElementById("gameHeroThumb").src = finalThumb;

    const bg = document.getElementById("gameHeroBG");
    if (bg) {
        bg.style.backgroundImage = `url('${finalThumb}')`;
    }

    /* -------- META -------- */

    document.getElementById("gameMetaYear").textContent = game.year || "—";
    document.getElementById("gameMetaSystem").textContent = game.system || "—";
    document.getElementById("gameMetaDeveloper").textContent = game.developer || "Unknown";

    /* -------- GENRES -------- */

    const genresEl = document.getElementById("gameGenres");
    if (genresEl && game.genres?.length) {
        genresEl.textContent = game.genres.join(", ");
        genresEl.hidden = false;
    }

    /* -------- DESCRIPTION -------- */

    if (game.description) {
        document.getElementById("gameDescription").innerHTML = game.description;
        document.getElementById("game-description-section").hidden = false;
    }

    /* -------- VIDEO (FIXED KEY) -------- */

    if (game.videoid) {
        document.getElementById("game-video-embed").src =
            `https://www.youtube.com/embed/${game.videoid}`;

        document.getElementById("game-video-section").hidden = false;
    }

    /* -------- MANUAL -------- */

    if (game.manual) {
        const btn = document.getElementById("gameManualBtn");
        btn.href = game.manual;
        btn.hidden = false;
    }

    /* -------- DISK -------- */

    if (game.disk) {
        const btn = document.getElementById("gameDiskBtn");
        btn.href = game.disk;
        btn.hidden = false;
    }

    /* -------- RELATED -------- */

    renderRelatedGames(game);
}

/* ============================================================
   RELATED GAMES
   ============================================================ */

function renderRelatedGames(game) {
    const container = document.getElementById("relatedGamesGrid");
    if (!container) return;

    fetch("games.json")
        .then(res => res.json())
        .then(allGames => {

            const primary = game.genres?.[0] || null;

            const related = allGames.filter(g =>
                g.id !== game.id &&
                g.genres &&
                g.genres.includes(primary)
            ).slice(0, 6);

            container.innerHTML = related.map(g => {

                const final = `../${g.thumbnail}`;

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
