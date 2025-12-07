// js/home-dynamic.js
// Omega Home Dynamics — Random Featured Game + Mode Sync
// Uses games/games.json but does NOT touch the intro loader at all.

(function () {
    const html = document.documentElement;
    if (!html || html.getAttribute("data-ccg-page") !== "home") return;

    const body = document.body;

    /* --------------------------------------------------------
       HERO MODE BADGE SYNC (C64 / Amiga)
    --------------------------------------------------------- */
    const modeLabelEl = document.querySelector("[data-ccg-hero-mode-label]");

    function getCurrentMode() {
        return body.getAttribute("data-mode") ||
               body.getAttribute("data-ccg-mode") ||
               "c64";
    }

    function syncHeroMode() {
        if (!modeLabelEl) return;
        const mode = getCurrentMode().toLowerCase();
        modeLabelEl.textContent = mode === "amiga" ? "Amiga" : "C64";
    }

    // Initial sync
    document.addEventListener("DOMContentLoaded", syncHeroMode);

    // Watch for mode changes coming from ccg-mode-engine.js
    const modeObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === "attributes" &&
                (m.attributeName === "data-mode" || m.attributeName === "data-ccg-mode")) {
                syncHeroMode();
            }
        }
    });

    modeObserver.observe(body, {
        attributes: true,
        attributeFilter: ["data-mode", "data-ccg-mode"]
    });

    /* --------------------------------------------------------
       GAMES.JSON LOADER
    --------------------------------------------------------- */

    let gamesCache = null;

    async function loadGamesJson() {
        if (gamesCache) return gamesCache;

        const response = await fetch("games/games.json", { cache: "no-store" });
        if (!response.ok) {
            throw new Error("Failed to load games.json: " + response.status);
        }
        const json = await response.json();
        if (!Array.isArray(json) || !json.length) {
            throw new Error("games.json did not contain a list of games.");
        }
        gamesCache = json;
        return gamesCache;
    }

    function pickRandomGame(games) {
        if (!Array.isArray(games) || games.length === 0) return null;
        const index = Math.floor(Math.random() * games.length);
        return games[index];
    }

    function resolveThumbnailPath(thumbnail) {
        if (!thumbnail) return null;

        // If absolute (as in /ccgamer_website_new/resources/...), normalise to repo-relative.
        const prefix = "/ccgamer_website_new/";
        if (thumbnail.startsWith(prefix)) {
            return thumbnail.slice(prefix.length);
        }

        // If it starts with a leading slash but no prefix, strip it so it's relative.
        if (thumbnail.startsWith("/")) {
            return thumbnail.slice(1);
        }

        // Already relative or full URL.
        return thumbnail;
    }

    /* --------------------------------------------------------
       DOM APPLIERS — FEATURED GAME + VIDEO
    --------------------------------------------------------- */

    function applyFeaturedGame(game) {
        if (!game) return;

        const thumbEl = document.getElementById("featured-game-thumb");
        const titleEl = document.getElementById("featured-game-title");
        const metaEl  = document.getElementById("featured-game-meta");
        const textEl  = document.getElementById("featured-game-text");
        const linkPageEl  = document.getElementById("featured-game-link-page");
        const linkVideoEl = document.getElementById("featured-game-link-video");

        const system = game.system || "C64/Amiga";
        const year   = game.year || "—";
        const dev    = game.developer || "Unknown";
        const id     = game.id;
        const video  = game.videoid;

        // Thumbnail
        if (thumbEl) {
            const resolved = resolveThumbnailPath(game.thumbnail);
            if (resolved) thumbEl.src = resolved;
            thumbEl.alt = `${game.title} (${system})`;
        }

        // Title
        if (titleEl) {
            titleEl.textContent = `Featured Game: ${game.title} (${system})`;
        }

        // Meta
        if (metaEl) {
            metaEl.innerHTML = `System: <span>${system}</span> • Year: <span>${year}</span> • Developer: <span>${dev}</span>`;
        }

        // Keep your nice flavour text if present
        if (textEl && !textEl.dataset.ccgLocked) {
            // You can set data-ccg-locked="true" on the element if you want to stop JS changing it later.
            textEl.textContent = textEl.textContent.trim();
        }

        // Game page link
        if (linkPageEl && id) {
            linkPageEl.href = `games/game.html?id=${encodeURIComponent(id)}`;
        }

        // YouTube review link
        if (linkVideoEl && video) {
            linkVideoEl.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video)}`;
        }
    }

    function applyFeaturedVideo(game) {
        if (!game) return;

        const iframeEl = document.getElementById("featured-video-iframe");
        const titleEl  = document.getElementById("featured-video-title");
        const metaEl   = document.getElementById("featured-video-meta");
        const textEl   = document.getElementById("featured-video-text");
        const btnEl    = document.getElementById("featured-video-button");

        const system = game.system || "C64/Amiga";
        const video  = game.videoid;

        if (iframeEl && video) {
            iframeEl.src = `https://www.youtube.com/embed/${encodeURIComponent(video)}`;
        }

        if (titleEl) {
            titleEl.textContent = `Featured Video: ${game.title} (${system}) Review`;
        }

        if (metaEl) {
            metaEl.textContent = "Direct from the Cheeky Commodore Gamer channel.";
        }

        if (textEl && !textEl.dataset.ccgLocked) {
            textEl.textContent = "Deep-dive gameplay, commentary and nostalgia — all from the CCG vault.";
        }

        if (btnEl && video) {
            btnEl.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video)}`;
        }
    }

    /* --------------------------------------------------------
       RANDOM GAME BUTTON
    --------------------------------------------------------- */

    function setupRandomGameButton(games) {
        const btn = document.querySelector("[data-ccg-random-game]");
        if (!btn || !Array.isArray(games) || !games.length) return;

        btn.addEventListener("click", () => {
            const game = pickRandomGame(games);
            if (!game || !game.id) return;
            const target = `games/game.html?id=${encodeURIComponent(game.id)}`;
            window.location.href = target;
        });
    }

    /* --------------------------------------------------------
       INIT
    --------------------------------------------------------- */

    async function initHome() {
        try {
            const games = await loadGamesJson();
            const featuredGame = pickRandomGame(games);
            if (!featuredGame) return;

            applyFeaturedGame(featuredGame);
            applyFeaturedVideo(featuredGame);
            setupRandomGameButton(games);
        } catch (err) {
            console.error("CCG Home init error:", err);
        }
    }

    document.addEventListener("DOMContentLoaded", initHome);
})();
