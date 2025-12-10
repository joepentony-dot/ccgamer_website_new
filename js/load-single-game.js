/* ============================================================
   CCG SINGLE GAME LOADER — OMEGA ULTRA EDITION (E7-C)
   Fully stable: correct JSON path, correct thumbnail paths,
   genre chips, manual/disk/video buttons, hero background,
   related games, and YouTube detection.
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get("id");

    if (!gameId) {
        console.error("No game ID provided in URL.");
        return;
    }

    try {
        /* Correct depth from /games/game.html */
        const response = await fetch("games.json");
        const gamesData = await response.json();

        if (!Array.isArray(gamesData)) {
            console.error("games.json malformed.");
            return;
        }

        const game = gamesData.find(g => String(g.id) === String(gameId));

        if (!game) {
            console.error(`Game not found for ID: ${gameId}`);
            return;
        }

        renderGame(game);
        renderRelatedGames(game, gamesData);

    } catch (err) {
        console.error("Single Game Loader Error:", err);
    }
});

/* ============================================================
   RENDER MAIN GAME DATA
   ============================================================ */

function renderGame(game) {

    /* Correct thumbnail path */
    const thumbPath = `../resources/images/thumbnails/all/${game.thumbnail}`;

    /* ------------------------------
       HERO THUMBNAIL
    ------------------------------ */
    const heroImg = document.getElementById("game-hero-image");
    if (heroImg) {
        heroImg.src = thumbPath;
        heroImg.alt = game.title;
    }

    /* ------------------------------
       HERO BACKGROUND
    ------------------------------ */
    const heroBg = document.querySelector(".game-hero-bg");
    if (heroBg) {
        heroBg.style.backgroundImage = `url('${thumbPath}')`;
        heroBg.classList.add("game-hero-bg--active");
    }

    /* ------------------------------
       TITLE + META TEXT
    ------------------------------ */
    setText("game-title", game.title);
    setText("game-year", game.year || "Unknown");
    setText("game-system", game.system || "C64 / Amiga");
    setText("game-developer", game.developer || "Unknown Developer");

    /* ------------------------------
       DESCRIPTION
    ------------------------------ */
    const descBlock = document.getElementById("game-description-section");
    if (game.description) {
        setText("game-description", game.description);
        descBlock.hidden = false;
    }

    /* ------------------------------
       GENRE CHIPS
    ------------------------------ */
    const genreWrap = document.getElementById("game-genres");
    if (genreWrap && Array.isArray(game.genres)) {
        genreWrap.innerHTML = game.genres
            .map(g => `<span class="ccg-genre-chip">${g}</span>`)
            .join("");
    }

    /* ------------------------------
       MANUAL LINK
    ------------------------------ */
    const pdfBtn = document.getElementById("pdf-button");
    if (game.manual && pdfBtn) {
        pdfBtn.href = game.manual;
        pdfBtn.hidden = false;
    }

    /* ------------------------------
       DISK / TAPE LINK
    ------------------------------ */
    const diskBtn = document.getElementById("disk-button");
    if (game.disk && diskBtn) {
        diskBtn.href = game.disk;
        diskBtn.hidden = false;
    }

    /* ------------------------------
       YOUTUBE VIDEO
    ------------------------------ */
    const videoWrapper = document.getElementById("game-video-section");
    const videoEmbed = document.getElementById("game-video-embed");

    if (videoEmbed && game.video) {
        const videoId = extractYouTubeId(game.video);

        if (videoId) {
            videoEmbed.src = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`;
            videoWrapper.hidden = false;
        } else {
            videoWrapper.hidden = true;
        }
    } else {
        videoWrapper.hidden = true;
    }
}

/* ============================================================
   RELATED GAMES
   ============================================================ */

function renderRelatedGames(currentGame, allGames) {

    const relatedGrid = document.getElementById("related-games-grid");
    if (!relatedGrid) return;

    const related = allGames.filter(g =>
        g.id !== currentGame.id &&
        Array.isArray(g.genres) &&
        currentGame.genres &&
        g.genres.some(tag =>
            currentGame.genres.map(x => x.toLowerCase()).includes(tag.toLowerCase())
        )
    ).slice(0, 6);

    relatedGrid.innerHTML = "";

    related.forEach(g => {
        const thumbPath = `../resources/images/thumbnails/all/${g.thumbnail}`;

        const card = document.createElement("div");
        card.className = "ccg-game-card";

        card.innerHTML = `
            <a href="game.html?id=${g.id}" class="ccg-game-card__link-wrapper">

                <div class="ccg-game-card__thumb">
                    <img src="${thumbPath}" alt="${g.title}" loading="lazy">
                </div>

                <div class="ccg-game-card__body">
                    <h3 class="ccg-game-card__title">${g.title}</h3>

                    <div class="ccg-game-card__meta">
                        ${g.year || "Unknown"} • ${g.system || "C64/Amiga"}
                    </div>
                </div>

            </a>
        `;

        relatedGrid.appendChild(card);
    });
}

/* ============================================================
   HELPERS
   ============================================================ */

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function extractYouTubeId(url) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes("youtu.be")) {
            return parsed.pathname.replace("/", "");
        }
        if (parsed.searchParams.get("v")) {
            return parsed.searchParams.get("v");
        }
    } catch {
        return null;
    }
    return null;
}
