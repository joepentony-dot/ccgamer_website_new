/* ============================================================
   CCG HOME DYNAMIC — OMEGA CINEMATIC 2.0
   ------------------------------------------------------------
   • Loads games.json
   • Picks a random featured game
   • Injects Featured Game + Featured CCG Video
   • Syncs Random Game button
   • Triggers Hero Boot Animation
   ============================================================ */

let CCG_HOME_ALL_GAMES = [];

/* ============================================================
   DOM HOOKS
============================================================ */

const featuredGameCard = document.querySelector("[data-featured-game]");
const featuredVideoCard = document.querySelector("[data-featured-video]");

const fgThumbEl = document.querySelector("[data-fg-thumb]");
const fgTitleEl = document.querySelector("[data-fg-title]");
const fgMetaEl = document.querySelector("[data-fg-meta]");
const fgBtnEl = document.querySelector("[data-fg-button]");

const fvThumbEl = document.querySelector("[data-fv-thumb]");
const fvTitleEl = document.querySelector("[data-fv-title]");
const fvBtnEl = document.querySelector("[data-fv-button]");

/* Random game button */
const randomBtn = document.querySelector("[data-random-game]");

/* Hero boot animation */
window.addEventListener("DOMContentLoaded", () => {
    const hero = document.querySelector(".ccg-hero--home");
    if (hero) {
        hero.classList.add("ccg-hero-boot");
    }
});

/* ============================================================
   LOAD GAMES.JSON
============================================================ */

async function loadGames() {
    try {
        const res = await fetch("games/games.json");
        CCG_HOME_ALL_GAMES = await res.json();

        if (CCG_HOME_ALL_GAMES.length > 0) {
            randomBtn.classList.remove("ccg-btn--disabled");
            chooseFeaturedGame();
        }

    } catch (err) {
        console.error("Failed to load games.json", err);
    }
}

/* ============================================================
   PICK RANDOM GAME
============================================================ */

function chooseFeaturedGame() {
    const game = CCG_HOME_ALL_GAMES[Math.floor(Math.random() * CCG_HOME_ALL_GAMES.length)];

    if (!game) return;

    injectFeaturedGame(game);
    injectFeaturedVideo(game);
}

/* ============================================================
   INJECT FEATURED GAME
============================================================ */

function injectFeaturedGame(game) {

    /* Thumbnail */
    fgThumbEl.src = game.thumbnail;
    fgThumbEl.alt = game.title + " thumbnail";

    /* Title */
    fgTitleEl.textContent = `FEATURED GAME – ${game.title}`;

    /* Meta */
    fgMetaEl.textContent = `${game.system} · ${game.developer}`;

    /* Button */
    fgBtnEl.href = `games/game.html?id=${game.id}`;
}

/* ============================================================
   INJECT FEATURED CCG VIDEO
============================================================ */

function injectFeaturedVideo(game) {

    const vid = game.videoid;

    if (!vid) {
        /* fallback image */
        fvThumbEl.src = "resources/images/hero/ccg-hero-c64.png";
        fvTitleEl.textContent = "FEATURED CCG VIDEO";
        fvBtnEl.href = "https://www.youtube.com/@CheekyCommodoreGamer";
        return;
    }

    /* Natural YouTube thumbnail */
    fvThumbEl.src = `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`;
    fvThumbEl.alt = `${game.title} YouTube Thumbnail`;

    fvTitleEl.textContent = `FEATURED CCG VIDEO – ${game.title}`;

    /* Click thumbnail = open video */
    fvThumbEl.style.cursor = "pointer";
    fvThumbEl.onclick = () => {
        window.open(`https://www.youtube.com/watch?v=${vid}`, "_blank");
    };

    /* Watch on YouTube button */
    fvBtnEl.href = `https://www.youtube.com/watch?v=${vid}`;
}

/* ============================================================
   RANDOM GAME BUTTON
============================================================ */

randomBtn?.addEventListener("click", () => {
    if (CCG_HOME_ALL_GAMES.length === 0) return;

    const game = CCG_HOME_ALL_GAMES[Math.floor(Math.random() * CCG_HOME_ALL_GAMES.length)];
    window.location.href = `games/game.html?id=${game.id}`;
});

/* ============================================================
   INIT
============================================================ */

loadGames();
