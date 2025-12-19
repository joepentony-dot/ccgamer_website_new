/* ============================================================
   CCG HOME DYNAMIC — OMEGA CINEMATIC 2.1 (HOME GENRES FINAL)
   ------------------------------------------------------------
   • Featured Game
   • Featured Highlights
   • FULL Genre Grid with background thumbnails (Home-only)
   • Random Game
   • Mode sync
   ============================================================ */

let CCG_HOME_ALL_GAMES = [];
let CCG_HOME_FEATURED_GAME = null;

document.addEventListener("DOMContentLoaded", () => initHomeDynamic());

async function initHomeDynamic() {
    await loadGamesForHome();
    chooseAndRenderFeaturedGame();
    renderFeaturedHighlights();
    renderHomeGenres();
    wireRandomGameButton();
    syncModeLabel();
    initModeObserver();
}

/* ============================================================
   LOAD DATA
============================================================ */

async function loadGamesForHome() {
    try {
        const res = await fetch("games/games.json", { cache: "no-store" });
        CCG_HOME_ALL_GAMES = await res.json();
    } catch {
        CCG_HOME_ALL_GAMES = [];
    }
}

/* ============================================================
   FEATURED GAME
============================================================ */

function pickFeaturedGame() {
    const picks = CCG_HOME_ALL_GAMES.filter(g =>
        Array.isArray(g.genres) && g.genres.includes("Top Picks")
    );
    const pool = picks.length ? picks : CCG_HOME_ALL_GAMES;
    return pool[Math.floor(Math.random() * pool.length)] || null;
}

function chooseAndRenderFeaturedGame() {
    const game = pickFeaturedGame();
    if (!game) return;
    CCG_HOME_FEATURED_GAME = game;
    renderFeaturedGame(game);
}

function renderFeaturedGame(game) {
    const card = document.querySelector("[data-ccg-featured-game]");
    if (!card) return;

    card.querySelector("[data-fg-thumb]").src = resolveThumb(game.thumbnail);
    card.querySelector("[data-fg-title]").textContent = `Featured Game — ${game.title}`;
    card.querySelector("[data-fg-desc]").textContent = buildMeta(game);
    card.querySelector("[data-fg-btn]").href =
        `games/game.html?id=${encodeURIComponent(game.id)}`;
}

/* ============================================================
   FEATURED HIGHLIGHTS
============================================================ */

function renderFeaturedHighlights() {
    const grid = document.querySelector(".home-highlights-grid");
    if (!grid) return;

    grid.innerHTML = "";

    CCG_HOME_ALL_GAMES
        .slice()
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .forEach(game => {
            const card = document.createElement("a");
            card.className = "ccg-card home-feature-card";
            card.href = `games/game.html?id=${encodeURIComponent(game.id)}`;

            card.innerHTML = `
                <img src="${resolveThumb(game.thumbnail)}" alt="${game.title}">
                <div class="ccg-card__body">
                    <h3 class="ccg-card__title">${game.title}</h3>
                    <p class="ccg-card__text">${buildMeta(game)}</p>
                </div>
            `;
            grid.appendChild(card);
        });
}

/* ============================================================
   HOME GENRES — FULL BG THUMBNAILS (NEW CARD TYPE)
============================================================ */

function renderHomeGenres() {
    const section = document.querySelector(".home-section--genres");
    if (!section) return;

    const genreMap = new Map();

    CCG_HOME_ALL_GAMES.forEach(g => {
        if (!Array.isArray(g.genres)) return;
        g.genres.forEach(name => {
            const n = name.trim();
            genreMap.set(n, (genreMap.get(n) || 0) + 1);
        });
    });

    const grid = document.createElement("div");
    grid.className = "ccg-home-genres-grid";

    [...genreMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([genre, count]) => {
            const slug = genre.toLowerCase().replace(/\s+/g, "-");

            const card = document.createElement("a");
            card.className = "ccg-home-genre-card";
            card.href = `games/genres/${slug}.html`;

            card.style.setProperty(
                "--genre-bg",
                `url("resources/images/genres/${slug}.png")`
            );

            card.innerHTML = `
                <div class="ccg-home-genre-card__overlay"></div>
                <div class="ccg-home-genre-card__body">
                    <h3>${genre}</h3>
                    <span>${count} games</span>
                </div>
            `;
            grid.appendChild(card);
        });

    section.appendChild(grid);
}

/* ============================================================
   UTIL
============================================================ */

function resolveThumb(t) {
    if (!t) return "resources/images/thumbnails/all/1942.jpg";
    return t.startsWith("resources/")
        ? t
        : `resources/images/thumbnails/all/${t}`;
}

function buildMeta(game) {
    return [game.system, game.year, game.developer].filter(Boolean).join(" · ");
}

/* ============================================================
   RANDOM GAME + MODE
============================================================ */

function wireRandomGameButton() {
    const btn = document.querySelector("[data-ccg-random-game]");
    if (!btn) return;

    btn.onclick = () => {
        const g = CCG_HOME_ALL_GAMES[Math.floor(Math.random() * CCG_HOME_ALL_GAMES.length)];
        if (g?.id) window.location.href = `games/game.html?id=${g.id}`;
    };
}

function syncModeLabel() {
    const el = document.querySelector("[data-ccg-mode-label]");
    if (el) el.textContent = document.body.dataset.ccgMode?.toUpperCase() || "C64";
}

function initModeObserver() {
    new MutationObserver(syncModeLabel)
        .observe(document.body, { attributes: true, attributeFilter: ["data-ccg-mode"] });
}
