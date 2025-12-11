/* ============================================================
   CCG HOME DYNAMIC — OMEGA CINEMATIC 2.0
   ------------------------------------------------------------
   • Auto-rotating Featured Game (prefers "Top Picks" genre)
   • Random Game button
   • Featured Video placeholder (config at top)
   • Mode label sync (C64 / Amiga)
   • Non-breaking animation hooks for hero + sections
   ============================================================ */

let CCG_HOME_ALL_GAMES = [];

/* ============================================================
   CONFIG — FEATURED VIDEO (SAFE PLACEHOLDER)
   ------------------------------------------------------------
   - Set FEATURED_VIDEO_ID to a real YouTube video ID when ready.
   - Example: const FEATURED_VIDEO_ID = "dQw4w9WgXcQ";
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
    } catch (err) {
        console.error("CCG Home Dynamic — init error:", err);
    }
}

/* ============================================================
   LOAD GAMES (home.html → games/games.json)
   ============================================================ */

async function loadGamesForHome() {
    try {
        const response = await fetch("games/games.json");
        const games = await response.json();
        if (Array.isArray(games)) {
            CCG_HOME_ALL_GAMES = games.slice();
        } else {
            CCG_HOME_ALL_GAMES = [];
        }
    } catch (err) {
        console.error("Error loading games/games.json for home:", err);
        CCG_HOME_ALL_GAMES = [];
    }
}

/* ============================================================
   THUMBNAIL RESOLVER — HOME
   home.html is at root → thumbnails live at:
   resources/images/thumbnails/all/<file>
   ============================================================ */

function resolveHomeThumb(rawThumb) {
    if (!rawThumb) {
        return "resources/images/thumbnails/all/1942.jpg";
    }

    let t = String(rawThumb).trim();

    // strip leading slashes
    t = t.replace(/^\/+/, "");

    // if JSON already holds "resources/..." just use it directly
    if (t.startsWith("resources/")) {
        return t;
    }

    // if it looks like a bare filename, normalise into main thumbs folder
    return `resources/images/thumbnails/all/${t}`;
}

/* ============================================================
   FEATURED GAME — AUTO ROTATION (Option 1B)
   - Prefer games with "Top Picks" in genres
   - Fallback: any game in library
   ============================================================ */

function pickFeaturedGame() {
    if (!Array.isArray(CCG_HOME_ALL_GAMES) || CCG_HOME_ALL_GAMES.length === 0) {
        return null;
    }

    // Prefer "Top Picks" genre where available
    let pool = CCG_HOME_ALL_GAMES.filter(g =>
        Array.isArray(g.genres) && g.genres.includes("Top Picks")
    );

    if (!pool.length) {
        pool = CCG_HOME_ALL_GAMES.slice();
    }

    if (!pool.length) {
        return null;
    }

    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
}

function buildFeaturedGameDescription(game) {
    const parts = [
        game.system || "",
        game.developer || ""
    ].filter(Boolean);

    if (parts.length === 0) {
        return "C64 & Amiga retro highlight from the Cheeky Commodore Gamer library.";
    }

    return parts.join(" · ");
}

function renderFeaturedGame() {
    const card = document.querySelector("[data-ccg-featured-game]");
    if (!card) return;

    const thumbEl = card.querySelector("[data-fg-thumb]");
    const titleEl = card.querySelector("[data-fg-title]");
    const descEl = card.querySelector("[data-fg-desc]");
    const btnEl = card.querySelector("[data-fg-btn]");

    const featured = pickFeaturedGame();
    if (!featured) {
        // Keep fallback text/links already in HTML
        return;
    }

    const thumb = resolveHomeThumb(featured.thumbnail || featured.thumb || featured.cover);
    const title = featured.title || "Featured Game";
    const desc = buildFeaturedGameDescription(featured);
    const id = featured.id;

    if (thumbEl) {
        thumbEl.src = thumb;
        thumbEl.alt = `${title} artwork`;
    }

    if (titleEl) {
        titleEl.textContent = title;
    }

    if (descEl) {
        descEl.textContent = desc;
    }

    if (btnEl && id !== undefined && id !== null) {
        btnEl.href = `games/game.html?id=${id}`;
    }
}

/* ============================================================
   RANDOM GAME BUTTON
   Button: [data-ccg-random-game]
   ============================================================ */

function wireRandomGameButton() {
    const btn = document.querySelector("[data-ccg-random-game]");
    if (!btn) return;

    const haveGames = Array.isArray(CCG_HOME_ALL_GAMES) && CCG_HOME_ALL_GAMES.length > 0;
    if (!haveGames) {
        btn.disabled = true;
        btn.classList.add("ccg-btn--disabled");
        return;
    }

    btn.addEventListener("click", () => {
        if (!CCG_HOME_ALL_GAMES.length) return;

        const idx = Math.floor(Math.random() * CCG_HOME_ALL_GAMES.length);
        const game = CCG_HOME_ALL_GAMES[idx];
        if (!game || game.id === undefined || game.id === null) return;

        window.location.href = `games/game.html?id=${game.id}`;
    });
}

/* ============================================================
   FEATURED VIDEO BLOCK
   - Only inject iframe if FEATURED_VIDEO_ID is set
   ============================================================ */

function renderFeaturedVideo() {
    const container = document.querySelector("[data-ccg-featured-video]");
    const titleEl = document.querySelector("[data-ccg-featured-video-title]");
    const btnEl = document.querySelector("[data-ccg-featured-video-btn]");

    if (titleEl) {
        titleEl.textContent = FEATURED_VIDEO_TITLE;
    }

    if (btnEl) {
        btnEl.href = FEATURED_VIDEO_URL;
    }

    if (!container) return;

    // If no video ID configured yet, leave card as static channel promo
    if (!FEATURED_VIDEO_ID) {
        return;
    }

    const embedUrl = `https://www.youtube.com/embed/${FEATURED_VIDEO_ID}`;

    container.innerHTML = `
        <iframe
            src="${embedUrl}"
            title="${FEATURED_VIDEO_TITLE}"
            allowfullscreen
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin">
        </iframe>
    `;
}

/* ============================================================
   MODE LABEL SYNC (C64 / AMIGA)
   - Keeps "MODE · C64 / Amiga" in hero in sync
   ============================================================ */

function syncModeLabel() {
    const labelEl = document.querySelector("[data-ccg-mode-label]");
    if (!labelEl) return;

    const mode = (document.body.getAttribute("data-ccg-mode") || "c64").toLowerCase();
    labelEl.textContent = mode.toUpperCase();
}

function initModeObserver() {
    const body = document.body;
    if (!body) return;

    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type === "attributes" && m.attributeName === "data-ccg-mode") {
                syncModeLabel();
            }
        }
    });

    observer.observe(body, {
        attributes: true,
        attributeFilter: ["data-ccg-mode"]
    });
}

/* ============================================================
   ANIMATION HOOKS — OPTION 3D (Non-breaking)
   - Adds classes that can be styled in ccg-anim.css / home.css
   - If CSS doesn’t define them yet, nothing breaks.
   ============================================================ */

function applyHomeAnimations() {
    const hero = document.querySelector(".home-hero");
    const highlights = document.querySelector(".home-section--highlights");
    const genres = document.querySelector(".home-section--genres");

    const targets = [hero, highlights, genres].filter(Boolean);

    if (!targets.length) return;

    window.requestAnimationFrame(() => {
        targets.forEach((el, index) => {
            // These classes/variables should be defined in your CSS for full effect.
            el.classList.add("ccg-anim-in");
            el.style.setProperty("--ccg-anim-delay", `${index * 0.08}s`);
        });
    });
}
