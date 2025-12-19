/* ============================================================
   CCG HOME DYNAMIC — OMEGA CINEMATIC 2.0 (FINAL)
   ------------------------------------------------------------
   • Loads games/games.json
   • Picks a random Featured Game (prefers "Top Picks")
   • Renders Featured Highlights
   • Renders FULL Genre Grid (all genres)
   • Random Game button
   • Mode label sync (C64 / Amiga)
   • Hero CRT boot + parallax
   ============================================================ */

let CCG_HOME_ALL_GAMES = [];
let CCG_HOME_FEATURED_GAME = null;

/* ------------------------------------------------------------
   INIT
------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", () => {
    initHomeDynamic();
});

async function initHomeDynamic() {
    try {
        await loadGamesForHome();
        chooseAndRenderFeaturedGame();
        renderFeaturedHighlights();
        renderHomeGenres();
        wireRandomGameButton();
        syncModeLabel();
        initModeObserver();
        applyHomeAnimations();
        applyOmegaHeroEntry();
        initHeroParallaxDrift();
    } catch (err) {
        console.error("CCG Home Dynamic — init error:", err);
    }
}

/* ============================================================
   LOAD GAMES
============================================================ */

async function loadGamesForHome() {
    try {
        const response = await fetch("games/games.json", { cache: "no-store" });
        const games = await response.json();
        CCG_HOME_ALL_GAMES = Array.isArray(games) ? games.slice() : [];
    } catch (err) {
        console.error("Error loading games/games.json for home:", err);
        CCG_HOME_ALL_GAMES = [];
    }
}

/* ============================================================
   FEATURED GAME SELECTION
============================================================ */

function pickFeaturedGame() {
    if (!CCG_HOME_ALL_GAMES.length) return null;

    let pool = CCG_HOME_ALL_GAMES.filter(g =>
        Array.isArray(g.genres) &&
        g.genres.some(x => String(x).toLowerCase() === "top picks")
    );

    if (!pool.length) pool = CCG_HOME_ALL_GAMES.slice();

    return pool[Math.floor(Math.random() * pool.length)] || null;
}

function chooseAndRenderFeaturedGame() {
    const game = pickFeaturedGame();
    if (!game) return;

    CCG_HOME_FEATURED_GAME = game;
    renderFeaturedGame(game);
    renderFeaturedVideo(game);
}

/* ============================================================
   THUMBNAIL RESOLVER
============================================================ */

function resolveHomeThumb(rawThumb) {
    if (!rawThumb) return "resources/images/thumbnails/all/1942.jpg";
    const t = String(rawThumb).trim().replace(/^\/+/, "");
    if (t.startsWith("resources/")) return t;
    return `resources/images/thumbnails/all/${t}`;
}

/* ============================================================
   FEATURED HIGHLIGHTS (3 RANDOM GAMES)
============================================================ */

function renderFeaturedHighlights() {
    const grid = document.querySelector(".home-highlights-grid");
    if (!grid || !CCG_HOME_ALL_GAMES.length) return;

    grid.innerHTML = "";

    const picks = [...CCG_HOME_ALL_GAMES]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

    picks.forEach(game => {
        const card = document.createElement("a");
        card.className = "ccg-card home-feature-card";
        card.href = `games/game.html?id=${encodeURIComponent(game.id)}`;

        card.innerHTML = `
            <img src="${resolveHomeThumb(game.thumbnail)}" alt="${game.title} thumbnail">
            <div class="ccg-card__body">
                <h3 class="ccg-card__title">${game.title}</h3>
                <p class="ccg-card__text">${buildFeaturedGameMeta(game)}</p>
            </div>
        `;

        grid.appendChild(card);
    });
}

/* ============================================================
   HOME GENRES — FULL GRID
============================================================ */

function renderHomeGenres() {
    const section = document.querySelector(".home-section--genres");
    if (!section || !CCG_HOME_ALL_GAMES.length) return;

    const genreMap = new Map();

    CCG_HOME_ALL_GAMES.forEach(game => {
        if (!Array.isArray(game.genres)) return;
        game.genres.forEach(g => {
            const name = String(g).trim();
            if (!name) return;
            genreMap.set(name, (genreMap.get(name) || 0) + 1);
        });
    });

    if (!genreMap.size) return;

    const grid = document.createElement("div");
    grid.className = "ccg-tiles-grid";

    [...genreMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([genre, count]) => {
            const tile = document.createElement("a");
            tile.className = "ccg-genre-tile";
            tile.href = `games/genres/${encodeURIComponent(
                genre.toLowerCase().replace(/\s+/g, "-")
            )}.html`;

            tile.innerHTML = `
                <div class="ccg-card__body">
                    <h3 class="ccg-card__title">${genre}</h3>
                    <p class="ccg-card__meta">${count} games</p>
                </div>
            `;

            grid.appendChild(tile);
        });

    section.appendChild(grid);
}

/* ============================================================
   FEATURED GAME CARD
============================================================ */

function buildFeaturedGameMeta(game) {
    const bits = [];
    if (game.system) bits.push(game.system);
    if (game.year) bits.push(game.year);
    if (game.developer) bits.push(game.developer);
    return bits.join(" · ") || "C64 & Amiga highlight";
}

function renderFeaturedGame(game) {
    const card = document.querySelector("[data-ccg-featured-game]");
    if (!card) return;

    card.querySelector("[data-fg-thumb]").src = resolveHomeThumb(game.thumbnail);
    card.querySelector("[data-fg-title]").textContent = `Featured Game — ${game.title}`;
    card.querySelector("[data-fg-desc]").textContent = buildFeaturedGameMeta(game);
    card.querySelector("[data-fg-btn]").href =
        `games/game.html?id=${encodeURIComponent(game.id)}`;
}

/* ============================================================
   FEATURED VIDEO
============================================================ */

function renderFeaturedVideo(game) {
    const img = document.querySelector("[data-ccg-featured-video-thumb]");
    const btn = document.querySelector("[data-ccg-featured-video-btn]");
    if (!img || !btn || !game.videoid) return;

    img.src = `https://img.youtube.com/vi/${game.videoid}/hqdefault.jpg`;
    btn.href = `https://www.youtube.com/watch?v=${game.videoid}`;
}

/* ============================================================
   RANDOM GAME
============================================================ */

function wireRandomGameButton() {
    const btn = document.querySelector("[data-ccg-random-game]");
    if (!btn || !CCG_HOME_ALL_GAMES.length) return;

    btn.onclick = () => {
        const game = CCG_HOME_ALL_GAMES[Math.floor(Math.random() * CCG_HOME_ALL_GAMES.length)];
        if (game?.id != null) {
            window.location.href = `games/game.html?id=${encodeURIComponent(game.id)}`;
        }
    };
}

/* ============================================================
   MODE LABEL
============================================================ */

function syncModeLabel() {
    const label = document.querySelector("[data-ccg-mode-label]");
    if (!label) return;
    label.textContent = (document.body.dataset.ccgMode || "c64").toUpperCase();
}

function initModeObserver() {
    new MutationObserver(syncModeLabel)
        .observe(document.body, { attributes: true, attributeFilter: ["data-ccg-mode"] });
}

/* ============================================================
   HERO FX
============================================================ */

function applyHomeAnimations() {
    document.querySelectorAll(".home-hero, .home-section")
        .forEach(el => el.classList.add("ccg-anim-in"));
}

function applyOmegaHeroEntry() {
    document.querySelector(".ccg-hero--home")?.classList.add("ccg-hero-boot");
}

function initHeroParallaxDrift() {
    const img = document.querySelector(".ccg-hero--home .ccg-hero-image");
    if (!img) return;

    window.addEventListener("mousemove", e => {
        const x = (e.clientX / innerWidth - 0.5) * 4;
        const y = (e.clientY / innerHeight - 0.5) * 3;
        img.style.transform = `translate(${x}px, ${y}px) scale(1.03)`;
    });
}
