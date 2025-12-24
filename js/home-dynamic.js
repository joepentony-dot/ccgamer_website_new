/* ============================================================
   CCG HOME DYNAMIC — OMEGA (GENRE THUMBS FIXED)
   ------------------------------------------------------------
   • Featured Highlights (unchanged)
   • Small Home genre thumbnails (from first game in genre)
   • NO new assets
   • NO 404s
============================================================ */

let CCG_HOME_ALL_GAMES = [];

const MOBILE_MEDIA = window.matchMedia?.("(max-width: 1024px)");
const PREFERS_REDUCED_MOTION = window.matchMedia?.("(prefers-reduced-motion: reduce)");
const COARSE_POINTER = window.matchMedia?.("(pointer: coarse)");
const FALLBACK_MOBILE_MEDIA = window.matchMedia?.("(max-width: 768px)");

const isMobileViewport = () => {
    if (typeof window.isMobileViewport === "function") {
        return window.isMobileViewport();
    }
    if (FALLBACK_MOBILE_MEDIA) return FALLBACK_MOBILE_MEDIA.matches;
    return window.innerWidth <= 768;
};

document.addEventListener("DOMContentLoaded", () => initHomeDynamic());

async function initHomeDynamic() {
    if (shouldUseMobileLite()) {
        applyMobileLiteMode();
    }

    const skipAnimations = shouldSkipHomeAnimations();

    await loadGamesForHome();
    renderFeaturedHighlights();
    renderFeaturedSpotlight();
    renderFeaturedVideos();
    wireRandomGameButton();
    syncModeLabel();
    initModeObserver();

    if (skipAnimations) {
        calmHeroCards();
    } else {
        initHeroCardFX();

        if (!isMobileViewport()) {
            runWhenIdle(() => {
                initHeroGlowPulse();
                initHomeEnergy();
            });
        }
    }
}

/* ------------------------------------------------------------
   MOBILE/LOW-POWER DETECTION (ROBUST)
   - Some devices report odd CSS pixel widths; use visualViewport/innerWidth as a fallback.
------------------------------------------------------------ */

function getViewportWidth() {
    const vv = window.visualViewport?.width;
    return typeof vv === "number" && vv > 0 ? vv : window.innerWidth;
}

function shouldSkipHomeAnimations() {
    return Boolean(
        isMobileViewport() ||
        MOBILE_MEDIA?.matches ||
        COARSE_POINTER?.matches ||
        PREFERS_REDUCED_MOTION?.matches
    );
}


function shouldUseMobileLite() {
    const vw = getViewportWidth();
    const smallViewport = typeof vw === "number" && vw <= 1100;
    return Boolean(isMobileViewport() || MOBILE_MEDIA?.matches || COARSE_POINTER?.matches || smallViewport);
}

function applyMobileLiteMode() {
    document.body.classList.add("ccg-mobile-lite");
    document.documentElement.classList.add("ccg-mobile-lite");

    const randomButtons = document.querySelectorAll("[data-ccg-random-game]");
    randomButtons.forEach(btn => {
        const mobileLabel = btn.dataset.mobileLabel || "Open quick library";
        btn.textContent = mobileLabel;
        btn.classList.add("is-disabled");
        btn.setAttribute("disabled", "true");
        btn.onclick = () => {
            window.location.href = "games/index.html";
        };
    });
}

function runWhenIdle(task) {
    if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => task(), { timeout: 1200 });
    } else {
        window.setTimeout(task, 200);
    }
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

function renderFeaturedHighlights() {
    const grid = document.querySelector(".home-highlights-grid");
    if (!grid) return;

    grid.innerHTML = "";

    sampleGames(3).forEach(game => {
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

function renderFeaturedSpotlight() {
    const card = document.querySelector('[data-ccg-spotlight]');
    if (!card) return;

    const game = pickSpotlightGame();
    if (!game) {
        card.style.display = "none";
        return;
    }

    const thumb = resolveThumb(game.thumbnail);
    const meta = buildMeta(game) || "Featured pick";
    const videoUrl = game.videoid ? `https://www.youtube.com/watch?v=${game.videoid}` : "";
    const gameUrl = `games/game.html?id=${encodeURIComponent(game.id)}`;

    const artEl = card.querySelector('[data-ccg-spotlight-art]');
    const metaEl = card.querySelector('[data-ccg-spotlight-meta]');
    const titleEl = card.querySelector('[data-ccg-spotlight-title]');
    const copyEl = card.querySelector('[data-ccg-spotlight-copy]');
    const tagsEl = card.querySelector('[data-ccg-spotlight-tags]');
    const gameLink = card.querySelector('[data-ccg-spotlight-game]');
    const ytLink = card.querySelector('[data-ccg-spotlight-youtube]');
    const videoShell = card.querySelector('[data-ccg-spotlight-video]');
    const videoLabel = card.querySelector('.home-spotlight__video-label');
    const iframeWrap = card.querySelector('[data-ccg-spotlight-iframe-wrap]');

    if (artEl) artEl.style.backgroundImage = `url('${thumb}')`;
    if (videoShell && game.videoid) {
        videoShell.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.85)), url('https://img.youtube.com/vi/${game.videoid}/hqdefault.jpg')`;
        videoShell.style.backgroundSize = "cover";
        videoShell.style.backgroundPosition = "center";
    } else if (videoShell) {
        videoShell.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.85)), url('${thumb}')`;
        videoShell.classList.add("is-static");
        if (videoLabel) videoLabel.textContent = "Video preview unavailable";
    }

    if (metaEl) metaEl.textContent = meta;
    if (titleEl) titleEl.textContent = game.title;
    if (copyEl) copyEl.textContent = game.description?.trim() || "Neon-fuelled action and pixel-perfect charm.";

    if (tagsEl) {
        tagsEl.innerHTML = "";
        [game.system, game.year, ...(game.genres?.slice(0, 2) || [])]
            .filter(Boolean)
            .forEach(tag => {
                const pill = document.createElement("span");
                pill.className = "home-spotlight__tag";
                pill.textContent = tag;
                tagsEl.appendChild(pill);
            });
    }

    if (gameLink) gameLink.href = gameUrl;
    if (ytLink) {
        ytLink.href = videoUrl || "#";
        ytLink.target = "_blank";
        ytLink.rel = "noopener";
        if (!videoUrl) {
            ytLink.setAttribute("aria-disabled", "true");
            ytLink.onclick = (ev) => ev.preventDefault();
        }
    }

    hydrateSpotlightVideo(game.videoid, iframeWrap);
}

function pickSpotlightGame() {
    if (!CCG_HOME_ALL_GAMES.length) return null;

    const flagged = CCG_HOME_ALL_GAMES.find(g => g.featured === true || g.isFeatured === true || g.homeFeatured === true);
    if (flagged?.videoid) return flagged;

    const sortedWithVideo = CCG_HOME_ALL_GAMES
        .filter(g => g.videoid)
        .sort((a, b) => (a.sorttitle || a.title).localeCompare(b.sorttitle || b.title, undefined, { sensitivity: "base" }));

    if (!sortedWithVideo.length) return flagged || CCG_HOME_ALL_GAMES[0];

    const fallbackId = "turrican_ii_the_final_fight";
    return sortedWithVideo.find(g => g.id === fallbackId) || sortedWithVideo[0];
}

function hydrateSpotlightVideo(videoId, iframeWrap) {
    const watchButtons = document.querySelectorAll('[data-ccg-spotlight-watch]');
    const iframe = document.querySelector('[data-ccg-spotlight-iframe]');

    if (!videoId || !iframeWrap || !iframe) {
        watchButtons.forEach(btn => {
            btn.setAttribute("disabled", "true");
            btn.disabled = true;
        });
        return;
    }

    const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;

    const loadEmbed = () => {
        if (iframe.dataset.loaded === "true") return;
        iframe.src = embedSrc;
        iframe.dataset.loaded = "true";
        iframeWrap.classList.add("is-playing");
    };

    watchButtons.forEach(btn => {
        btn.onclick = (ev) => {
            ev.preventDefault();
            loadEmbed();
        };
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

function sampleGames(count, predicate = () => true) {
    const pool = CCG_HOME_ALL_GAMES.filter(predicate);
    return pool
        .slice()
        .sort(() => 0.5 - Math.random())
        .slice(0, count);
}

function pickVideoGame(system) {
    const systemMatch = sampleGames(1, g => Boolean(g.videoid) && g.system?.toLowerCase() === system?.toLowerCase());
    if (systemMatch.length) return systemMatch[0];

    const anyVideo = sampleGames(1, g => Boolean(g.videoid));
    return anyVideo[0] || null;
}

function renderFeaturedVideos() {
    const grid = document.querySelector("[data-ccg-video-grid]");
    if (!grid) return;

    const lanes = [
        { system: "C64", label: "Commodore 64" },
        { system: "Amiga", label: "Commodore Amiga" }
    ];

    grid.innerHTML = "";

    lanes.forEach(lane => {
        const game = pickVideoGame(lane.system);
        const card = buildVideoCard(game, lane.label);
        grid.appendChild(card);
    });
}

function buildVideoCard(game, systemLabel) {
    const card = document.createElement("article");
    card.className = "ccg-card home-video-card";

    const hasVideo = Boolean(game?.videoid);
    const videoId = game?.videoid || "";
    const thumb = hasVideo
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : resolveThumb(game?.thumbnail);
    const meta = game ? (buildMeta(game) || systemLabel) : `${systemLabel} feature`;
    const title = game?.title || `${systemLabel} pick`;
    const gameUrl = game?.id ? `games/game.html?id=${encodeURIComponent(game.id)}` : "#";
    const ytUrl = hasVideo ? `https://www.youtube.com/watch?v=${videoId}` : "#";

    card.innerHTML = `
        <div class="home-video-card__media">
            <span class="home-video-card__badge">${systemLabel}</span>
            <div class="home-video-card__thumb" style="background-image: url('${thumb}')">
                <button class="home-video-card__play" type="button" data-ccg-video-play ${hasVideo ? "" : "disabled"}>Play video</button>
            </div>
            <div class="home-video-card__iframe" data-ccg-video-iframe-wrap hidden>
                <iframe
                    data-ccg-video-iframe
                    title="${title} gameplay video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen></iframe>
            </div>
        </div>
        <div class="ccg-card__body">
            <p class="home-video-card__label">Randomised pick</p>
            <h3 class="ccg-card__title">${title}</h3>
            <p class="ccg-card__text">${meta}</p>
            <div class="home-video-card__links">
                <a href="${gameUrl}" class="ccg-link" ${game ? "" : "aria-disabled=\"true\""}>View game</a>
                <a href="${ytUrl}" class="ccg-link" target="_blank" rel="noopener" ${hasVideo ? "" : "aria-disabled=\"true\""}>Open on YouTube</a>
            </div>
        </div>
    `;

    const playButton = card.querySelector('[data-ccg-video-play]');
    const iframeWrap = card.querySelector('[data-ccg-video-iframe-wrap]');
    const iframe = card.querySelector('[data-ccg-video-iframe]');

    if (hasVideo && playButton && iframeWrap && iframe) {
        playButton.onclick = () => {
            if (!iframe.dataset.loaded) {
                iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
                iframe.dataset.loaded = "true";
            }
            card.classList.add("is-playing");
            iframeWrap.hidden = false;
        };
    }

    return card;
}

/* ============================================================
   RANDOM GAME + MODE
============================================================ */

function wireRandomGameButton() {
    const buttons = Array.from(document.querySelectorAll("[data-ccg-random-game]"))
        .filter(btn => !btn.classList.contains("is-disabled"));
    if (!buttons.length) return;

    const launchRandom = () => {
        if (!CCG_HOME_ALL_GAMES.length) return;
        const g = CCG_HOME_ALL_GAMES[Math.floor(Math.random() * CCG_HOME_ALL_GAMES.length)];
        if (g?.id) window.location.href = `games/game.html?id=${g.id}`;
    };

    buttons.forEach(btn => {
        btn.onclick = launchRandom;
    });
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
    const cards = document.querySelectorAll('.home-hero-card, .home-highlight-card, .home-spotlight-card, .home-link-tile, .home-video-card');
    const hasFinePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches;
    if (!cards.length || !hasFinePointer) return;

    cards.forEach(card => {
        card.style.setProperty('--glow-x', '50%');
        card.style.setProperty('--glow-y', '50%');
        card.style.setProperty('--glow-alpha', '0.28');

        let frameId = null;
        let pendingPoint = null;

        const updateGlow = () => {
            if (!pendingPoint) return;
            const rect = card.getBoundingClientRect();
            const x = ((pendingPoint.x - rect.left) / rect.width) * 100;
            const y = ((pendingPoint.y - rect.top) / rect.height) * 100;
            card.style.setProperty('--glow-x', `${x.toFixed(2)}%`);
            card.style.setProperty('--glow-y', `${y.toFixed(2)}%`);
            card.style.setProperty('--glow-alpha', '0.55');
            frameId = null;
        };

        card.addEventListener('pointermove', (e) => {
            pendingPoint = { x: e.clientX, y: e.clientY };
            if (!frameId) {
                frameId = requestAnimationFrame(updateGlow);
            }
        }, { passive: true });

        card.addEventListener('pointerleave', () => {
            pendingPoint = null;
            if (frameId) cancelAnimationFrame(frameId);
            frameId = null;
            card.style.setProperty('--glow-x', '50%');
            card.style.setProperty('--glow-y', '50%');
            card.style.setProperty('--glow-alpha', '0.30');
        });
    });
}

function initHeroGlowPulse() {
    const cards = document.querySelectorAll('.home-hero-card');
    if (!cards.length || PREFERS_REDUCED_MOTION?.matches) return;

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
    if (PREFERS_REDUCED_MOTION?.matches) return;

    setInterval(() => {
        tagline?.classList.toggle('is-ignited');
        brand?.classList.toggle('is-ignited');
    }, 2800);
}

function calmHeroCards() {
    const cards = document.querySelectorAll('.home-hero-card, .home-highlight-card, .home-spotlight-card, .home-link-tile, .home-video-card');
    if (!cards.length) return;

    cards.forEach(card => {
        card.style.setProperty('--glow-x', '50%');
        card.style.setProperty('--glow-y', '50%');
        card.style.setProperty('--glow-alpha', '0.30');
    });
}
