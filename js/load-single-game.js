/* ============================================================
   CCG SINGLE GAME LOADER — OMEGA ULTRA EDITION (E7-B)
   Loads one game's data, renders hero, meta, description,
   video, and related games.
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get("id");

    if (!gameId) {
        console.error("No game ID provided in URL.");
        return;
    }

    try {
        const response = await fetch("../games.json");
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

    // Where game.html lives:
    // /games/game.html
    // → one level up to reach project root: "../"
    const thumbPath = `../${game.thumbnail}`;

    // ------------------------------
    // HERO THUMBNAIL
    // ------------------------------
    const heroImg = document.getElementById("game-hero-image");
    if (heroImg) {
        heroImg.src = thumbPath;
        heroImg.alt = game.title;
    }

    // ------------------------------
    // HERO BACKGROUND BLUR
    // ------------------------------
    const heroBg = document.querySelector(".game-hero-bg");
    if (heroBg) heroBg.style.backgroundImage = `url('${thumbPath}')`;

    // ------------------------------
    // TEXT FIELDS
    // ------------------------------
    setText("game-title", game.title);
    setText("game-year", game.year || "Unknown");
    setText("game-system", game.system || "C64 / Amiga");
    setText("game-developer", game.developer || "Unknown Developer");
    setText("game-description", game.description || "No description available.");

    // ------------------------------
    // GAMEPLAY VIDEO EMBED
    // ------------------------------
    const videoWrapper = document.getElementById("game-video-section");
    const videoEmbed = document.getElementById("game-video-embed");

    if (videoEmbed) {

        if (game.video && game.video.trim() !== "") {
            const videoId = extractYouTubeId(game.video);

            if (videoId) {
                videoEmbed.src = `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&modestbranding=1&controls=1`;
            }
        } else {
            if (videoWrapper) videoWrapper.style.display = "none";
        }
    }
}

/* ============================================================
   RENDER RELATED GAMES
   ============================================================ */

function renderRelatedGames(currentGame, allGames) {

    const relatedGrid = document.getElementById("related-games-grid");
    if (!relatedGrid) return;

    // Games that share at least one genre
    const related = allGames.filter(g =>
        g.id !== currentGame.id &&
        Array.isArray(g.genres) &&
        currentGame.genres &&
        g.genres.some(tag => currentGame.genres.includes(tag))
    ).slice(0, 6);

    relatedGrid.innerHTML = "";

    related.forEach(g => {

        const thumbPath = `../${g.thumbnail}`;  // Fixed path

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
