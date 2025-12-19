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
    renderFeaturedShowcase();
    wireRandomGameButton();
    syncModeLabel();
    initModeObserver();
    initHeroCardFX();
    initHeroGlowPulse();
    initHomeEnergy();
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
   FEATURED SHOWCASE — MATCHED GAME & VIDEO
============================================================ */

function renderFeaturedShowcase() {
    const feature = pickFeaturedGame();
    if (!feature) return;

    const meta = buildMeta(feature);
    const description = feature.description?.trim() || `${feature.title} brings ${feature.system} energy from ${feature.year}.`;

    const thumbEl = document.querySelector("[data-ccg-feature-thumb]");
    const metaEl = document.querySelector("[data-ccg-feature-meta]");
    const titleEl = document.querySelector("[data-ccg-feature-title]");
    const copyEl = document.querySelector("[data-ccg-feature-copy]");
    const playLink = document.querySelector("[data-ccg-feature-play]");
    const collectionLink = document.querySelector("[data-ccg-feature-collection]");

    if (thumbEl) thumbEl.style.backgroundImage = `url('${resolveThumb(feature.thumbnail)}')`;
    if (metaEl) metaEl.textContent = meta;
    if (titleEl) titleEl.textContent = feature.title;
    if (copyEl) copyEl.textContent = description;
    if (playLink) playLink.href = `games/game.html?id=${encodeURIComponent(feature.id)}`;
    if (collectionLink) collectionLink.href = feature.collection || 'games/collections/top-picks.html';

    const videoThumb = document.querySelector("[data-ccg-feature-video-thumb]");
    const videoMeta = document.querySelector("[data-ccg-feature-video-meta]");
    const videoTitle = document.querySelector("[data-ccg-feature-video-title]");
    const videoCopy = document.querySelector("[data-ccg-feature-video-copy]");
    const watchLink = document.querySelector("[data-ccg-feature-watch-link]");
    const playBtn = document.querySelector("[data-ccg-feature-watch]");
    const playCTA = document.querySelector("[data-ccg-feature-play2]");

    if (feature.videoid) {
        const yt = `https://www.youtube.com/watch?v=${feature.videoid}`;
        if (watchLink) watchLink.href = yt;
        if (playBtn) playBtn.onclick = () => window.open(yt, "_blank");
        if (playCTA) playCTA.href = `games/game.html?id=${encodeURIComponent(feature.id)}`;
        if (videoThumb) videoThumb.style.backgroundImage = `url('https://img.youtube.com/vi/${feature.videoid}/maxresdefault.jpg')`;
    }

    if (videoMeta) videoMeta.textContent = `${feature.system} · ${feature.year || "Longplay"}`;
    if (videoTitle) videoTitle.textContent = `${feature.title} — matching feature`;
    if (videoCopy) videoCopy.textContent = description;
}

function pickFeaturedGame() {
    const withVideo = CCG_HOME_ALL_GAMES.filter(g => g.videoid);
    if (withVideo.length) return withVideo[Math.floor(Math.random() * withVideo.length)];
    return CCG_HOME_ALL_GAMES[0];
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
    const cards = document.querySelectorAll('.home-hero-card, .home-highlight-card, .home-genre-tile, .home-curated-card');
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

/* ============================================================
   HOME ENERGY — TAGLINE + BRAND PULSE
============================================================ */

function initHomeEnergy() {
    const tagline = document.querySelector('.home-tagline');
    const brand = document.querySelector('.ccg-brand');

    if (!tagline && !brand) return;

    setInterval(() => {
        tagline?.classList.toggle('is-ignited');
        brand?.classList.toggle('is-ignited');
    }, 2800);
}
