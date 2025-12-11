/* ============================================================
   CCG LOAD SINGLE GAME — OMEGA SLUG-ID EDITION (FINAL)
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

        const game = games.find(g => g.id === gameId);

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

    /* ---------- THUMBNAIL PATH ---------- */

    let thumb = game.thumbnail || "";

    if (thumb.startsWith("resources/images/")) {
        thumb = thumb.replace("resources/images/thumbnails/all/", "");
        thumb = thumb.replace("resources/images/", "");
    }

    const finalThumb = `resources/images/thumbnails/all/${thumb}`;

    /* ---------- HERO ---------- */

    document.getElementById("gameHeroTitle").textContent = game.title;
    document.getElementById("gameSystemKicker").textContent = game.system || "Unknown";

    const heroImg = document.getElementById("gameHeroThumb");
    if (heroImg) heroImg.src = finalThumb;

    const bg = document.getElementById("gameHeroBG");
    if (bg) {
        bg.style.backgroundImage = `url('${finalThumb}')`;
        bg.classList.add("game-hero-bg--active");
    }

    /* ---------- META ---------- */

    setText("gameMetaYear", game.year);
    setText("gameMetaSystem", game.system);
    setText("gameMetaDeveloper", game.developer);

    /* ---------- GENRES ---------- */

    const genresList = document.getElementById("gameGenres");
    if (genresList) {
        genresList.textContent = (game.genres || []).join(", ");
    }

    /* ---------- DESCRIPTION ---------- */

    setText("gameDescription", game.description);

    /* ---------- VIDEO ---------- */

    const embedEl = document.getElementById("game-video-embed");
    if (embedEl && game.video) {
        embedEl.src = `https://www.youtube.com/embed/${game.video}`;
    }

    /* ---------- MANUAL & DISK LINKS ---------- */

    const manualBtn = document.getElementById("gameManualBtn");
    const diskBtn = document.getElementById("gameDiskBtn");

    if (manualBtn) manualBtn.style.display = game.manual ? "inline-flex" : "none";
    if (diskBtn) diskBtn.style.display = game.disk ? "inline-flex" : "none";

    if (manualBtn && game.manual) manualBtn.href = game.manual;
    if (diskBtn && game.disk) diskBtn.href = game.disk;

    /* ---------- RELATED GAMES ---------- */

    renderRelatedGames(game);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "—";
}

/* ============================================================
   RELATED GAMES (Match first genre)
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

            container.innerHTML = related.map(g => createRelatedCard(g)).join("");
        });
}

function createRelatedCard(g) {
    let t = g.thumbnail || "";
    if (t.startsWith("resources/images/")) {
        t = t.replace("resources/images/thumbnails/all/", "");
    }
    const finalT = `resources/images/thumbnails/all/${t}`;

    return `
        <a href="game.html?id=${g.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img src="${finalT}" alt="${g.title}">
            </div>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${g.title}</h3>
                <div class="ccg-game-card__meta">${g.year || ""} · ${g.system || ""}</div>
            </div>
        </a>
    `;
}
