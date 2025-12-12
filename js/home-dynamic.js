/* ============================================================
   CCG HOME DYNAMIC — OMEGA CINEMATIC 2.0 (FINAL)
   ------------------------------------------------------------
   • Loads games/games.json
   • Picks a random Featured Game (prefers "Top Picks" if present)
   • Syncs Featured Game card (thumb, title, meta, button)
   • Syncs Featured CCG Video (YouTube thumb + title + links)
   • Random Game button
   • Mode label sync (C64 / Amiga)
   • Section reveal animations
   • Hero CRT boot sequence
   • Subtle hero parallax drift
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
        const response = await fetch("games/games.json");
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

    // Prefer games tagged "Top Picks" if present
    let pool = CCG_HOME_ALL_GAMES.filter(g =>
        Array.isArray(g.genres) &&
        g.genres.some(x => typeof x === "string" && x.toLowerCase() === "top picks")
    );

    if (!pool.length) {
        pool = CCG_HOME_ALL_GAMES.slice();
    }

    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx] || null;
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
    if (!rawThumb) {
        return "resources/images/thumbnails/all/1942.jpg";
    }

    let t = String(rawThumb).trim().replace(/^\/+/, "");

    // If already has resources/ prefix, trust it
    if (t.startsWith("resources/")) {
        return t;
    }

    // Otherwise assume it's a bare filename in thumbnails/all
    return `resources/images/thumbnails/all/${t}`;
}

/* ============================================================
   FEATURED GAME RENDER
============================================================ */

function buildFeaturedGameMeta(game) {
    const bits = [];

    if (game.system) bits.push(game.system);
    if (game.year) bits.push(game.year);
    if (game.developer) bits.push(game.developer);

    if (bits.length) {
        return bits.join(" · ");
    }

    return "C64 & Amiga retro highlight from the Cheeky Commodore Gamer library.";
}

function renderFeaturedGame(game) {
    const card = document.querySelector("[data-ccg-featured-game]");
    if (!card || !game) return;

    const imgEl = card.querySelector("[data-fg-thumb]");
    const titleEl = card.querySelector("[data-fg-title]");
    const descEl = card.querySelector("[data-fg-desc]");
    const btnEl = card.querySelector("[data-fg-btn]");

    const thumbPath = resolveHomeThumb(game.thumbnail || game.thumb || game.cover);

    if (imgEl) {
        imgEl.src = thumbPath;
        imgEl.alt = `${game.title} artwork`;
    }

    if (titleEl) {
        titleEl.textContent = `Featured Game — ${game.title}`;
    }

    if (descEl) {
        descEl.textContent = buildFeaturedGameMeta(game);
    }

    if (btnEl && game.id != null) {
        btnEl.href = `games/game.html?id=${encodeURIComponent(game.id)}`;
    }
}

/* ============================================================
   FEATURED VIDEO RENDER (SYNCED TO FEATURED GAME)
============================================================ */

function renderFeaturedVideo(game) {
    const titleEl = document.querySelector("[data-ccg-featured-video-title]");
    const imgEl = document.querySelector("[data-ccg-featured-video-thumb]");
    const descEl = document.querySelector("[data-ccg-featured-video-desc]");
    const btnEl = document.querySelector("[data-ccg-featured-video-btn]");
    const frameEl = document.querySelector(".home-feature-video__frame");

    if (!game) {
        // Fallback to generic state
        if (titleEl) {
            titleEl.textContent = "Featured CCG Video";
        }
        if (descEl) {
            descEl.textContent = "A hand-picked longplay or review from the channel — perfectly paired with the featured game.";
        }
        if (btnEl) {
            btnEl.href = "https://www.youtube.com/@CheekyCommodoreGamer";
        }
        return;
    }

    const videoId = game.videoid;

    // Generic description line (can be extended later)
    const descText = `A CCG video pick to go with ${game.title}.`;

    if (!videoId) {
        // No video ID for this game — fall back gracefully to channel + box art
        if (titleEl) {
            titleEl.textContent = `Featured CCG Video — ${game.title}`;
        }
        if (descEl) {
            descEl.textContent = descText;
        }

        const thumbPath = resolveHomeThumb(game.thumbnail || game.thumb || game.cover);

        if (imgEl) {
            imgEl.src = thumbPath;
            imgEl.alt = `${game.title} box art`;
        }

        if (btnEl) {
            btnEl.href = "https://www.youtube.com/@CheekyCommodoreGamer";
        }

        if (frameEl) {
            frameEl.style.cursor = "default";
            frameEl.onclick = null;
        }

        return;
    }

    // We have a real video ID
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const primaryThumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const fallbackThumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    if (titleEl) {
        titleEl.textContent = `Featured CCG Video — ${game.title}`;
    }

    if (descEl) {
        descEl.textContent = descText;
    }

    if (imgEl) {
        imgEl.src = primaryThumb;
        imgEl.alt = `${game.title} YouTube thumbnail`;

        // Fallback to hqdefault if maxres doesn't exist
        imgEl.onerror = () => {
            imgEl.onerror = null;
            imgEl.src = fallbackThumb;
        };
    }

    if (btnEl) {
        btnEl.href = youtubeUrl;
    }

    if (frameEl) {
        frameEl.style.cursor = "pointer";
        frameEl.onclick = () => {
            window.open(youtubeUrl, "_blank", "noopener");
        };
    }
}

/* ============================================================
   RANDOM GAME BUTTON
============================================================ */

function wireRandomGameButton() {
    const btn = document.querySelector("[data-ccg-random-game]");
    if (!btn) return;

    function updateState() {
        if (!CCG_HOME_ALL_GAMES.length) {
            btn.disabled = true;
            btn.classList.add("ccg-btn--disabled");
        } else {
            btn.disabled = false;
            btn.classList.remove("ccg-btn--disabled");
        }
    }

    updateState();

    btn.addEventListener("click", () => {
        if (!CCG_HOME_ALL_GAMES.length) return;

        const idx = Math.floor(Math.random() * CCG_HOME_ALL_GAMES.length);
        const game = CCG_HOME_ALL_GAMES[idx];
        if (!game || game.id == null) return;

        window.location.href = `games/game.html?id=${encodeURIComponent(game.id)}`;
    });

    // If games load after this, ensure enabled
    if (CCG_HOME_ALL_GAMES.length) {
        btn.disabled = false;
        btn.classList.remove("ccg-btn--disabled");
    }
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
    if (!body) return;

    const observer = new MutationObserver(mutations => {
        if (mutations.some(m => m.attributeName === "data-ccg-mode")) {
            syncModeLabel();
        }
    });

    observer.observe(body, { attributes: true });
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
   OMEGA HERO ENTRY — CRT SWEEP
============================================================ */

function applyOmegaHeroEntry() {
    const hero = document.querySelector(".ccg-hero--home");
    if (!hero) return;

    hero.classList.add("ccg-hero-boot");
}

/* ============================================================
   HERO PARALLAX DRIFT — ultra subtle
============================================================ */

function initHeroParallaxDrift() {
    const heroImg = document.querySelector(".ccg-hero--home .ccg-hero-image");
    if (!heroImg) return;

    let ticking = false;

    window.addEventListener("mousemove", e => {
        if (ticking) return;
        ticking = true;

        window.requestAnimationFrame(() => {
            const xNorm = e.clientX / window.innerWidth - 0.5;
            const yNorm = e.clientY / window.innerHeight - 0.5;

            const x = xNorm * 4;   // very subtle
            const y = yNorm * 3;

            heroImg.style.transform = `translate(${x}px, ${y}px) scale(1.03)`;
            ticking = false;
        });
    });
}
