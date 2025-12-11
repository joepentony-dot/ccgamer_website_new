/* ============================================================
   CCG LOAD SINGLE GAME — OMEGA ULTRA-STABLE FINAL EDITION
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        console.error("No game ID provided in URL");
        return;
    }

    try {
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
   UNIVERSAL THUMBNAIL SANITISER
   ============================================================ */
function resolveThumb(path) {
    if (!path) return "";

    return path.replace(/^resources\/images\/thumbnails\/all\//i, "");
}

/* ============================================================
   RENDER GAME
   ============================================================ */

function renderGame(game) {

    /* ---------- FIX THUMBNAIL ---------- */
    const clean = resolveThumb(game.thumbnail || "");
    const finalThumb = `../resources/images/thumbnails/all/${clean}`;

    /* ---------- HERO ---------- */

    document.getElementById("gameHeroTitle").textContent = game.title;
    document.getElementById("gameSystemKicker").textContent = game.system || "Unknown";
    document.getElementById("gameHeroThumb").src = finalThumb;

    const bg = document.getElementById("gameHeroBG");
    if (bg) {
        bg.style.backgroundImage = `url('${finalThumb}')`;
        bg.classList.add("game-hero-bg--active");
    }

    /* ---------- META ---------- */

    document.getElementById("gameMetaYear").textContent = game.year || "—";
    document.getElementById("gameMetaSystem").textContent = game.system || "—";
    document.getElementById("gameMetaDeveloper").textContent = game.developer || "Unknown";

    /* ---------- GENRES ---------- */

    const genresEl = document.getElementById("gameGenres");
    if (genresEl) {
        genresEl.textContent = (game.genres || []).join(", ");
    }

    /* ---------- DESCRIPTION ---------- */

    document.getElementById("gameDescription").textContent =
        game.description || "No description available.";

    /* ---------- VIDEO ---------- */

    const embedEl = document.getElementById("game-video-embed");
    if (embedEl && game.video) {
        embedEl.src = `https://www.youtube.com/embed/${game.video}`;
    }

    /* ---------- MANUALS / DISKS ---------- */

    const manualBtn = document.getElementById("gameManualBtn");
    const diskBtn = document.getElementById("gameDiskBtn");

    if (manualBtn) {
        if (game.manual) manualBtn.href = game.manual;
        else manualBtn.style.display = "none";
    }

    if (diskBtn) {
        if (game.disk) diskBtn.href = game.disk;
        else diskBtn.style.display = "none";
    }

    /* ---------- RELATED ---------- */
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

            const mainGenre = (game.genres && game.genres[0]) || null;

            const related = allGames.filter(g =>
                g.id !== game.id &&
                g.genres &&
                g.genres.includes(mainGenre)
            ).slice(0, 6);

            container.innerHTML = related.map(g => {

                const thumbClean = resolveThumb(g.thumbnail || "");
                const finalT = `../resources/images/thumbnails/all/${thumbClean}`;

                return `
                    <a href="game.html?id=${g.id}" class="ccg-game-card">
                        <div class="ccg-game-card__thumb">
                            <img src="${finalT}" alt="${g.title}" loading="lazy">
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
