/* ============================================================
   load-single-game.js — Omega Single Game Loader (E4 Edition)
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    const main = document.querySelector(".ccg-main");
    if (!main) return;

    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get("id");
    if (!gameId) return;

    try {
        const response = await fetch("games.json");
        const games = await response.json();

        const game = games.find(g => String(g.id) === String(gameId));
        if (!game) {
            console.warn("Game not found:", gameId);
            return;
        }

        renderGame(game, games);

    } catch (err) {
        console.error("Error loading single game:", err);
    }
});

/* ============================================================
   RENDER THE PAGE
   ============================================================ */

function renderGame(game, games) {

    /* ----------------------------------------------
       System class (C64 / Amiga glow)
    ---------------------------------------------- */
    const body = document.querySelector("body");
    body.classList.remove("single-game--c64", "single-game--amiga");

    if (game.system && game.system.toLowerCase().includes("amiga")) {
        body.classList.add("single-game--amiga");
    } else {
        body.classList.add("single-game--c64");
    }

    /* ----------------------------------------------
       HERO BACKGROUND (blurred backdrop)
    ---------------------------------------------- */
    const heroBg = document.querySelector(".game-hero-bg");
    if (heroBg && game.thumbnail) {
        heroBg.style.backgroundImage = `url('${game.thumbnail}')`;
        heroBg.classList.add("game-hero-bg--active");
    }

    /* ----------------------------------------------
       HERO: THUMBNAIL + CLICK → PLAY VIDEO
    ---------------------------------------------- */
    const thumb = document.querySelector(".game-hero-thumb");
    const thumbWrap = document.querySelector(".game-hero-thumb-wrap");

    if (thumb && game.thumbnail) {
        thumb.src = game.thumbnail;
        thumb.alt = game.title || "";

        /* CLICK THUMBNAIL → PLAY VIDEO */
        if (game.video) {
            thumbWrap.style.cursor = "pointer";
            thumbWrap.addEventListener("click", () => {
                activateVideoPlayback(game.video);
            });
        }
    }

    /* ----------------------------------------------
       TITLE + SYSTEM BOX
    ---------------------------------------------- */
    const titleEl = document.getElementById("game-title");
    if (titleEl) titleEl.textContent = game.title || "Untitled";

    const systemKicker = document.getElementById("game-system");
    if (systemKicker) systemKicker.textContent = game.system || "Unknown";

    /* ----------------------------------------------
       META FIELDS: YEAR / SYSTEM / DEVELOPER
    ---------------------------------------------- */
    setText("meta-year", game.year);
    setText("meta-system", game.system);
    setText("meta-developer", game.developer);

    /* ----------------------------------------------
       GENRES (string)
    ---------------------------------------------- */
    if (Array.isArray(game.genres)) {
        const genreEl = document.getElementById("game-genres");
        if (genreEl) genreEl.textContent = game.genres.join(", ");
    }

    /* ----------------------------------------------
       DESCRIPTION
    ---------------------------------------------- */
    const descEl = document.getElementById("game-description");
    if (descEl) descEl.textContent = game.description || "";

    /* ----------------------------------------------
       LEMON LINKS (Optional)
    ---------------------------------------------- */
    const lemonList = document.getElementById("game-lemon-links");
    if (lemonList && Array.isArray(game.lemonLinks)) {
        lemonList.innerHTML = "";
        game.lemonLinks.forEach(link => {
            const li = document.createElement("li");
            li.innerHTML = `<a href="${link.url}" target="_blank" rel="noopener">${link.label}</a>`;
            lemonList.appendChild(li);
        });
    }

    /* ----------------------------------------------
       VIDEO HANDLING
    ---------------------------------------------- */
    if (game.video) {
        injectVideo(game.video);
    }

    /* ----------------------------------------------
       DOWNLOAD BUTTONS
    ---------------------------------------------- */
    updateDownloadButton("manual-download", game.manual);
    updateDownloadButton("disk-download", game.disk);
    updateDownloadButton("video-button", game.video);

    /* ----------------------------------------------
       RELATED GAMES = FIRST BY SAME DEVELOPER,
       FALLBACK TO SHARED GENRE
    ---------------------------------------------- */
    renderRelatedGames(game, games);
}

/* ============================================================
   HELPERS
   ============================================================ */

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "—";
}

function updateDownloadButton(id, url) {
    const btn = document.getElementById(id);
    if (!btn) return;

    if (url) {
        btn.href = url;
        btn.style.display = "inline-flex";
    } else {
        btn.style.display = "none";
    }
}

/* ============================================================
   VIDEO INJECTION + FRAME FLASH (E4)
   ============================================================ */

function injectVideo(videoUrl) {
    const frame = document.getElementById("game-video-embed");
    if (!frame) return;

    frame.src = videoUrl;

    /* Add neon flash on load */
    const outer = document.querySelector(".game-video-frame-outer");
    if (outer) {
        outer.classList.remove("video-frame--active");
        void outer.offsetWidth;
        outer.classList.add("video-frame--active");
    }
}

/* When clicking the thumbnail, start video playback */
function activateVideoPlayback(videoUrl) {
    injectVideo(videoUrl);

    /* Scroll smoothly to video section */
    const target = document.querySelector(".game-video-section");
    if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

/* ============================================================
   RELATED GAMES LOGIC
   ============================================================ */

function renderRelatedGames(game, games) {
    const grid = document.getElementById("related-games-grid");
    const title = document.getElementById("related-games-title");
    const subtitle = document.getElementById("related-games-subtitle");

    if (!grid) return;

    grid.innerHTML = "";

    let related = [];

    /* ----------------------------------------------
       TRY 1: Same Developer
    ---------------------------------------------- */
    if (game.developer) {
        related = games.filter(
            g =>
                g.id !== game.id &&
                g.developer &&
                g.developer.toLowerCase() === game.developer.toLowerCase()
        );
    }

    if (related.length > 0) {
        if (title) title.textContent = "More From This Developer";
        if (subtitle) subtitle.textContent = game.developer;
    } else {
        /* ----------------------------------------------
           TRY 2: Fallback to same genre
        ---------------------------------------------- */
        related = games.filter(
            g =>
                g.id !== game.id &&
                Array.isArray(g.genres) &&
                Array.isArray(game.genres) &&
                g.genres.some(genre => game.genres.includes(genre))
        );

        if (title) title.textContent = "Related Games";
        if (subtitle) subtitle.textContent = "";
    }

    /* ----------------------------------------------
       Build Card Elements
    ---------------------------------------------- */
    related.slice(0, 6).forEach(g => {
        const card = document.createElement("a");
        card.href = `game.html?id=${g.id}`;
        card.className = "ccg-game-card";

        card.innerHTML = `
            <div class="ccg-game-card__thumb">
                <img src="${g.thumbnail}" alt="${g.title}">
            </div>
            <div class="ccg-game-card__body">
                <div class="ccg-game-card__title">${g.title}</div>
                <div class="ccg-game-card__meta">
                    ${g.year || ""} • ${g.system || ""}
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}
