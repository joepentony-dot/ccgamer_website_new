/* ============================================================
   CCG HOME DYNAMIC — OMEGA (GENRE THUMBS FIXED)
   ------------------------------------------------------------
   • Featured Highlights (unchanged)
   • Small Home genre thumbnails (from first game in genre)
   • NO new assets
   • NO 404s
============================================================ */

let CCG_HOME_ALL_GAMES = [];

document.addEventListener("DOMContentLoaded", () => initHomeDynamic());

async function initHomeDynamic() {
    await loadGamesForHome();
    renderFeaturedHighlights();
    wireRandomGameButton();
    syncModeLabel();
    initModeObserver();
    initHeroCardFX();
    initHeroGlowPulse();
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
   FEATURED HIGHLIGHTS — DO NOT TOUCH
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

/* ============================================================
   HERO CARD GLOW — POINTER REACTIVE
============================================================ */

function initHeroCardFX() {
    const cards = document.querySelectorAll('.home-hero-card, .home-highlight-card, .home-feature-card, .home-feature-video, .home-link-tile');
    if (!cards.length) return;

    cards.forEach(card => {
        card.style.setProperty('--glow-x', '50%');
        card.style.setProperty('--glow-y', '50%');
        card.style.setProperty('--glow-alpha', '0.28');

        card.addEventListener('pointermove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--glow-x', `${x.toFixed(2)}%`);
            card.style.setProperty('--glow-y', `${y.toFixed(2)}%`);
            card.style.setProperty('--glow-alpha', '0.55');
        });

        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--glow-x', '50%');
            card.style.setProperty('--glow-y', '50%');
            card.style.setProperty('--glow-alpha', '0.30');
        });
    });
}

function initHeroGlowPulse() {
    const cards = document.querySelectorAll('.home-hero-card');
    if (!cards.length) return;

    let tick = 0;
    function loop() {
        tick += 0.02;
        const pulse = 0.30 + Math.sin(tick) * 0.05;
        cards.forEach(card => card.style.setProperty('--glow-alpha', pulse.toFixed(3)));
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}
