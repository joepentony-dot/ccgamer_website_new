/* ============================================================
   CCG HOME DYNAMIC — OMEGA CINEMATIC 2.0 (UPGRADED EDITION)
   ------------------------------------------------------------
   • Featured Game auto-rotation (1B)
   • Random Game button
   • Featured Video placeholder
   • Mode label sync
   • Section reveal animations (3D)
   • NEW: Omega Hero CRT Boot-Up Sequence (2A)
   • NEW: Subtle Parallax Drift for hero (visual only)
   ============================================================ */

let CCG_HOME_ALL_GAMES = [];

/* ============================================================
   CONFIG — FEATURED VIDEO
============================================================ */

const FEATURED_VIDEO_ID = "";
const FEATURED_VIDEO_TITLE = "Featured CCG Video";
const FEATURED_VIDEO_URL = "https://www.youtube.com/@CheekyCommodoreGamer";

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    initHomeDynamic();
});

async function initHomeDynamic() {
    try {
        await loadGamesForHome();
        wireRandomGameButton();
        renderFeaturedGame();
        renderFeaturedVideo();
        syncModeLabel();
        initModeObserver();
        applyHomeAnimations();
        applyOmegaHeroEntry();       // 🔥 NEW
        initHeroParallaxDrift();     // 🔥 NEW
    } catch (err) {
        console.error("CCG Home Dynamic — init error:", err);
    }
}

/* ============================================================
   LOAD GAMES
============================================================ */

async function loadGamesForHome() {
    try {
        const response = await fetch("games/games.json");
        const games = await response.json();
        CCG_HOME_ALL_GAMES = Array.isArray(games) ? games.slice() : [];
    } catch (err) {
        console.error("Error loading games/games.json for home:", err);
        CCG_HOME_ALL_GAMES = [];
    }
}

/* ============================================================
   THUMB RESOLVER
============================================================ */

function resolveHomeThumb(rawThumb) {
    if (!rawThumb) return "resources/images/thumbnails/all/1942.jpg";

    let t = String(rawThumb).trim().replace(/^\/+/, "");

    if (t.startsWith("resources/")) return t;

    return `resources/images/thumbnails/all/${t}`;
}

/* ============================================================
   FEATURED GAME — AUTO ROTATION
============================================================ */

function pickFeaturedGame() {
    if (!CCG_HOME_ALL_GAMES.length) return null;

    let pool = CCG_HOME_ALL_GAMES.filter(g =>
        Array.isArray(g.genres) && g.genres.includes("Top Picks")
    );

    if (!pool.length) pool = CCG_HOME_ALL_GAMES.slice();

    return pool[Math.floor(Math.random() * pool.length)] || null;
}

function buildFeaturedGameDescription(game) {
    const parts = [game.system || "", game.developer || ""].filter(Boolean);
    return parts.length ? parts.join(" · ") :
        "C64 & Amiga retro highlight from the Cheeky Commodore Gamer library.";
}

function renderFeaturedGame() {
    const card = document.querySelector("[data-ccg-featured-game]");
    if (!card) return;

    const featured = pickFeaturedGame();
    if (!featured) return;

    const thumb = resolveHomeThumb(featured.thumbnail || featured.thumb || featured.cover);

    card.querySelector("[data-fg-thumb]").src = thumb;
    card.querySelector("[data-fg-thumb]").alt = `${featured.title} artwork`;
    card.querySelector("[data-fg-title]").textContent = featured.title;
    card.querySelector("[data-fg-desc]").textContent =
        buildFeaturedGameDescription(featured);
    card.querySelector("[data-fg-btn]").href =
        `games/game.html?id=${featured.id}`;
}

/* ============================================================
   RANDOM GAME BUTTON
============================================================ */

function wireRandomGameButton() {
    const btn = document.querySelector("[data-ccg-random-game]");
    if (!btn) return;

    if (!CCG_HOME_ALL_GAMES.length) {
        btn.disabled = true;
        btn.classList.add("ccg-btn--disabled");
        return;
    }

    btn.addEventListener("click", () => {
        const r = Math.floor(Math.random() * CCG_HOME_ALL_GAMES.length);
        const g = CCG_HOME_ALL_GAMES[r];
        if (g && g.id != null) window.location.href = `games/game.html?id=${g.id}`;
    });
}

/* ============================================================
   FEATURED VIDEO
============================================================ */

function renderFeaturedVideo() {
    const container = document.querySelector("[data-ccg-featured-video]");
    const titleEl = document.querySelector("[data-ccg-featured-video-title]");
    const btnEl = document.querySelector("[data-ccg-featured-video-btn]");

    if (titleEl) titleEl.textContent = FEATURED_VIDEO_TITLE;
    if (btnEl) btnEl.href = FEATURED_VIDEO_URL;

    if (!container || !FEATURED_VIDEO_ID) return;

    container.innerHTML = `
        <iframe
            src="https://www.youtube.com/embed/${FEATURED_VIDEO_ID}"
            title="${FEATURED_VIDEO_TITLE}"
            allowfullscreen
            loading="lazy">
        </iframe>
    `;
}

/* ============================================================
   MODE LABEL SYNC
============================================================ */

function syncModeLabel() {
    const labelEl = document.querySelector("[data-ccg-mode-label]");
    if (!labelEl) return;

    const mode = (document.body.getAttribute("data-ccg-mode") || "c64").toUpperCase();
    labelEl.textContent = mode;
}

function initModeObserver() {
    const body = document.body;

    new MutationObserver(m => {
        if (m.some(x => x.attributeName === "data-ccg-mode")) syncModeLabel();
    }).observe(body, { attributes: true });
}

/* ============================================================
   SECTION REVEAL ANIMATIONS
============================================================ */

function applyHomeAnimations() {
    const hero = document.querySelector(".home-hero");
    const highlights = document.querySelector(".home-section--highlights");
    const genres = document.querySelector(".home-section--genres");

    [hero, highlights, genres].forEach((el, i) => {
        if (!el) return;
        el.classList.add("ccg-anim-in");
        el.style.setProperty("--ccg-anim-delay", `${i * 0.08}s`);
    });
}

/* ============================================================
   🔥 OMEGA HERO ENTRY SEQUENCE (Option 2A)
   ----------------------------------------------------------------
   • CRT power-on sweep
   • Neon bloom pulse on title + tagline
   • Zero regressions, zero layout shift
============================================================ */

function applyOmegaHeroEntry() {
    const hero = document.querySelector(".home-hero .ccg-hero");
    if (!hero) return;

    hero.classList.add("ccg-hero-boot"); // CSS handles the sweep + bloom
}

/* ============================================================
   🔥 HERO PARALLAX DRIFT — Ultra subtle, visual only
============================================================ */

function initHeroParallaxDrift() {
    const heroImg = document.querySelector(".ccg-hero-image");
    if (!heroImg) return;

    window.addEventListener("mousemove", e => {
        const x = (e.clientX / window.innerWidth - 0.5) * 4;
        const y = (e.clientY / window.innerHeight - 0.5) * 3;

        heroImg.style.transform = `translate(${x}px, ${y}px) scale(1.03)`;
    });
}
