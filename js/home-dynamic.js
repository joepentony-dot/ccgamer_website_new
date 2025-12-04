/* ============================================================
   HOME-DYNAMIC.JS — OMEGA HOMEPAGE LOGIC (FIXED)
   - Listens to global mode engine (no double toggle)
   - Hero label update
   - Random game launcher (graceful fallback)
   - Starfield background (lightweight)
   ============================================================ */

(function () {
    "use strict";

    const body = document.body;

    /* -----------------------------------------
       HERO MODE LABEL — FOLLOW GLOBAL ENGINE
    ----------------------------------------- */

    const heroModeLabel = document.querySelector("[data-ccg-hero-mode-label]");

    function updateHeroLabel(mode) {
        const safeMode = mode === "amiga" ? "amiga" : "c64";
        if (heroModeLabel) {
            heroModeLabel.textContent = safeMode.toUpperCase();
        }
    }

    // 1) Initial read from body (set by ccg-mode-engine)
    updateHeroLabel(body.dataset.ccgMode || "c64");

    // 2) React to future changes from ccg-mode-engine.js
    document.addEventListener("ccg:modeChange", (evt) => {
        if (!evt.detail || !evt.detail.mode) return;
        updateHeroLabel(evt.detail.mode);
    });

    /* -----------------------------------------
       RANDOM GAME BUTTON
    ----------------------------------------- */

    const randomBtn = document.querySelector("[data-ccg-random-game]");
    const GAMES_JSON_URL = "games/games.json";

    async function chooseRandomGame() {
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

            const gameId = game.id || game.slug || game.title;
            if (!gameId) {
                window.location.href = fallbackUrl;
                return;
            }

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
