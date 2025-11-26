/* ============================================================
   Cheeky Commodore Gamer – Global Engine (Phase C / Option B)
   Provides:
     - Starfield background
     - Global click sound (.play-sound)
     - Theme system (C64 / Amiga)
     - Back-to-top helper
     - ccgSearchInit (for homepage search)
     - ccgSocialBar (for socialMount)
   ============================================================ */

(function () {
    "use strict";

    /* ========================================================
       1. STARFIELD BACKGROUND
       ======================================================== */
    function initStarfield() {
        const canvas = document.getElementById("starfield");
        if (!canvas || !canvas.getContext) return;

        const ctx = canvas.getContext("2d");
        let stars = [];
        let width = window.innerWidth;
        let height = window.innerHeight;
        const STAR_COUNT = 120;

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            createStars();
        }

        function createStars() {
            stars = [];
            for (let i = 0; i < STAR_COUNT; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    z: 0.2 + Math.random() * 0.8,
                    speed: 0.15 + Math.random() * 0.35
                });
            }
        }

        function update() {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = "#fff";

            for (let s of stars) {
                s.y += s.speed * s.z;
                if (s.y > height) {
                    s.y = 0;
                    s.x = Math.random() * width;
                    s.z = 0.2 + Math.random() * 0.8;
                }
                const size = s.z * 2;
                ctx.globalAlpha = 0.35 + s.z * 0.4;
                ctx.fillRect(s.x, s.y, size, size);
            }

            ctx.globalAlpha = 1;
            requestAnimationFrame(update);
        }

        window.addEventListener("resize", resize);
        resize();
        update();
    }

    /* ========================================================
       2. GLOBAL CLICK SOUND FOR .play-sound
       ======================================================== */
    function initClickSound() {
        // If you ever change this filename, just update here:
        const clickAudio = new Audio("resources/audio/joystick_wobble.mp3");
        clickAudio.volume = 0.5;

        function playClick() {
            try {
                clickAudio.currentTime = 0;
                clickAudio.play();
            } catch (e) {
                // ignore autoplay issues
            }
        }

        document.addEventListener("click", (ev) => {
            const target = ev.target;
            if (!target) return;

            // Match element or its ancestors with .play-sound
            let el = target;
            while (el && el !== document.body) {
                if (el.classList && el.classList.contains("play-sound")) {
                    playClick();
                    break;
                }
                el = el.parentElement;
            }
        });
    }

    /* ========================================================
       3. THEME SYSTEM (C64 / AMIGA)
       ======================================================== */
    function applyTheme(theme) {
        if (!theme) return;
        document.body.setAttribute("data-theme", theme);
        try {
            localStorage.setItem("ccgTheme", theme);
        } catch (e) {
            // localStorage might be blocked; ignore
        }
    }

    function initTheme() {
        let theme = "c64";
        try {
            const stored = localStorage.getItem("ccgTheme");
            if (stored === "c64" || stored === "amiga") {
                theme = stored;
            }
        } catch (e) {
            // ignore
        }
        applyTheme(theme);

        // Any element with [data-theme-toggle] will switch theme on click
        const toggles = document.querySelectorAll("[data-theme-toggle]");
        toggles.forEach(btn => {
            btn.addEventListener("click", () => {
                const current = document.body.getAttribute("data-theme") || "c64";
                const next = current === "c64" ? "amiga" : "c64";
                applyTheme(next);
            });
        });
    }

    /* ========================================================
       4. BACK TO TOP BUTTON (optional)
       ======================================================== */
    function initBackToTop() {
        const btn = document.getElementById("backToTop");
        if (!btn) return;

        function updateVisibility() {
            if (window.scrollY > 400) {
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            } else {
                btn.style.opacity = "0";
                btn.style.pointerEvents = "none";
            }
        }

        window.addEventListener("scroll", updateVisibility);
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        updateVisibility();
    }

    /* ========================================================
       5. GLOBAL SOCIAL BAR (used on homepage + others)
       ======================================================== */
    function ccgSocialBar() {
        // Returns HTML string so pages can just do:
        // document.getElementById("socialMount").innerHTML = ccgSocialBar();
        return `
            <div class="social-bar">
                <a href="https://www.youtube.com/@CheekyCommodoreGamer" target="_blank" rel="noopener" class="btn-retro play-sound">
                    <i class="fa-brands fa-youtube"></i> YouTube Channel
                </a>
                <a href="https://www.patreon.com/cheekycommodoregamer" target="_blank" rel="noopener" class="btn-retro play-sound">
                    <i class="fa-brands fa-patreon"></i> Support on Patreon
                </a>
                <a href="https://discord.gg/" target="_blank" rel="noopener" class="btn-retro play-sound">
                    <i class="fa-brands fa-discord"></i> Join the Discord
                </a>
                <a href="https://x.com/" target="_blank" rel="noopener" class="btn-retro play-sound">
                    <i class="fa-brands fa-x-twitter"></i> Updates
                </a>
            </div>
        `;
    }

    // Expose globally
    window.ccgSocialBar = ccgSocialBar;

    /* ========================================================
       6. SEARCH INITIALISER (used by index.html)
       ======================================================== */

    /**
     * Initialise the live search box on the homepage (and other pages if needed).
     * @param {string} inputId - ID of the search input element
     * @param {string} resultsId - ID of the results container element
     * @param {Array<{title:string, system:string, video:string}>} games
     */
    function ccgSearchInit(inputId, resultsId, games) {
        const input = document.getElementById(inputId);
        const resultsBox = document.getElementById(resultsId);

        if (!input || !resultsBox || !Array.isArray(games)) return;

        let lastQuery = "";

        function escapeHtml(str) {
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

        function renderResults(list, query) {
            if (!query) {
                resultsBox.innerHTML = "";
                resultsBox.style.display = "none";
                return;
            }

            if (!list.length) {
                resultsBox.innerHTML = `<div class="search-empty">No matches found.</div>`;
                resultsBox.style.display = "block";
                return;
            }

            const html = list.map(g => {
                const title = escapeHtml(g.title || "Unknown Title");
                const system = escapeHtml(g.system || "C64");
                const video = escapeHtml(g.video || "");
                return `
                    <div class="search-result-item play-sound"
                         data-video="${video}">
                        <span class="search-title">${title}</span>
                        <span class="search-system">(${system})</span>
                    </div>
                `;
            }).join("");

            resultsBox.innerHTML = html;
            resultsBox.style.display = "block";

            // Attach click events for each result (focus spotlight video or open YouTube)
            const items = resultsBox.querySelectorAll(".search-result-item");
            items.forEach(item => {
                item.addEventListener("click", () => {
                    const videoId = item.getAttribute("data-video");
                    if (!videoId) return;

                    const spotlight = document.getElementById("spotlightVideo");
                    if (spotlight) {
                        spotlight.innerHTML = `
                            <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0"
                                    title="CCG Gameplay"
                                    allow="autoplay"
                                    frameborder="0"
                                    allowfullscreen></iframe>
                        `;
                    } else {
                        // Fallback: open in new tab
                        window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
                    }
                });
            });
        }

        function handleInput() {
            const query = input.value.trim().toLowerCase();
            if (query === lastQuery) return;
            lastQuery = query;

            if (!query) {
                renderResults([], "");
                return;
            }

            const filtered = games
                .filter(g => {
                    const t = (g.title || "").toLowerCase();
                    const s = (g.system || "").toLowerCase();
                    return t.includes(query) || s.includes(query);
                })
                .sort((a, b) => a.title.localeCompare(b.title))
                .slice(0, 20); // limit visible results

            renderResults(filtered, query);
        }

        input.addEventListener("input", handleInput);
        input.addEventListener("focus", handleInput);
        document.addEventListener("click", (ev) => {
            if (!resultsBox.contains(ev.target) && ev.target !== input) {
                // hide results when clicking outside
                resultsBox.style.display = "none";
            }
        });
    }

    // Expose globally
    window.ccgSearchInit = ccgSearchInit;

    /* ========================================================
       7. INITIALISATION ON DOM READY
       ======================================================== */
    function onReady(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn);
        } else {
            fn();
        }
    }

    onReady(() => {
        // Mark site as ready so CRT CSS can apply .site-ready rules
        document.body.classList.add("site-ready");

        initStarfield();
        initClickSound();
        initTheme();
        initBackToTop();
        // Any other global init can be added here.
    });

})();
