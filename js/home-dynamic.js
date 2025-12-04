/* ============================================================
   HOME-DYNAMIC.JS — OMEGA HOMEPAGE LOGIC
   - Mode toggle integration (C64 / Amiga)
   - Hero label update
   - Random game launcher (graceful fallback)
   - Starfield background (lightweight)
   ============================================================ */

(function () {
    "use strict";

    const body = document.body;
    const MODE_KEY = "ccg-mode";

    /* -----------------------------------------
       MODE TOGGLE + HERO LABEL
    ----------------------------------------- */

    const modeToggleBtn = document.querySelector("[data-ccg-mode-toggle]");
    const heroModeLabel = document.querySelector("[data-ccg-hero-mode-label]");

    function applyMode(mode) {
        const safeMode = mode === "amiga" ? "amiga" : "c64";
        body.setAttribute("data-ccg-mode", safeMode);
        if (heroModeLabel) {
            heroModeLabel.textContent = safeMode.toUpperCase();
        }
        try {
            localStorage.setItem(MODE_KEY, safeMode);
        } catch (e) {
            // ignore
        }
    }

    function toggleMode() {
        const current = body.getAttribute("data-ccg-mode") || "c64";
        const next = current === "c64" ? "amiga" : "c64";
        applyMode(next);
        // Optional: ping global mode engine if present
        if (window.CCGModeEngine && typeof window.CCGModeEngine.syncFromBody === "function") {
            window.CCGModeEngine.syncFromBody();
        }
    }

    // Restore saved mode
    (function initMode() {
        let saved = null;
        try {
            saved = localStorage.getItem(MODE_KEY);
        } catch (e) {
            saved = null;
        }
        applyMode(saved || "c64");
    })();

    if (modeToggleBtn) {
        modeToggleBtn.addEventListener("click", toggleMode);
    }

    /* -----------------------------------------
       RANDOM GAME BUTTON
    ----------------------------------------- */

    const randomBtn = document.querySelector("[data-ccg-random-game]");
    const GAMES_JSON_URL = "games/games.json";

    async function chooseRandomGame() {
        // Safe fallback if anything goes wrong
        const fallbackUrl = "games/index.html#random";

        try {
            const response = await fetch(GAMES_JSON_URL, { cache: "no-store" });
            if (!response.ok) {
                window.location.href = fallbackUrl;
                return;
            }

            const games = await response.json();
            if (!Array.isArray(games) || games.length === 0) {
                window.location.href = fallbackUrl;
                return;
            }

            const index = Math.floor(Math.random() * games.length);
            const game = games[index];

            // Try to infer an ID/slug field
            const gameId = game.id || game.slug || game.title;
            if (!gameId) {
                window.location.href = fallbackUrl;
                return;
            }

            // This assumes your game page uses ?id= style; adjust if needed
            const targetUrl = `games/game.html?id=${encodeURIComponent(gameId)}`;
            window.location.href = targetUrl;
        } catch (err) {
            window.location.href = fallbackUrl;
        }
    }

    if (randomBtn) {
        randomBtn.addEventListener("click", chooseRandomGame);
    }

    /* -----------------------------------------
       YEAR IN FOOTER
    ----------------------------------------- */

    const yearSpan = document.querySelector("[data-ccg-year]");
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    /* -----------------------------------------
       SIMPLE STARFIELD
       (Keeps it lightweight; your loader can
        still have its own intro starfield.)
    ----------------------------------------- */

    const canvas = document.getElementById("home-starfield");
    if (canvas && canvas.getContext) {
        const ctx = canvas.getContext("2d");
        let width = window.innerWidth;
        let height = window.innerHeight;
        let stars = [];

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        }

        function createStars(count) {
            stars = [];
            for (let i = 0; i < count; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    z: Math.random() * 0.8 + 0.2,
                    speed: Math.random() * 0.2 + 0.05
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);
            for (const star of stars) {
                star.y += star.speed * (star.z * 2);
                if (star.y > height) {
                    star.y = 0;
                    star.x = Math.random() * width;
                }

                const size = star.z * 1.4;
                const alpha = 0.4 + star.z * 0.6;
                ctx.fillStyle = `rgba(180, 230, 255, ${alpha})`;
                ctx.fillRect(star.x, star.y, size, size);
            }
            requestAnimationFrame(draw);
        }

        resize();
        createStars(160);
        draw();

        window.addEventListener("resize", () => {
            resize();
            createStars(160);
        });
    }
})();
