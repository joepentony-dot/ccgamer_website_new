// ================================
// CCG - SINGLE GAME LOADER
// ================================

(function () {
    const titleEl = document.getElementById("game-title");
    const thumbEl = document.getElementById("game-thumbnail");
    const systemEl = document.getElementById("game-system");
    const yearEl = document.getElementById("game-year");
    const genreEl = document.getElementById("game-genre");
    const devEl = document.getElementById("game-developer");
    const pubEl = document.getElementById("game-publisher");
    const notesEl = document.getElementById("game-notes");

    const videoLinkEl = document.getElementById("game-video-link");
    const diskLinkEl = document.getElementById("game-disk-link");
    const manualLinkEl = document.getElementById("game-manual-link");
    const lemonLinkEl = document.getElementById("game-lemon-link");
    const statusEl = document.getElementById("game-status");

    if (!titleEl) return; // Not on game.html

    // ---------- Utilities ----------

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getGamesBasePath() {
        const path = window.location.pathname;
        const marker = "/games/";
        const idx = path.indexOf(marker);
        if (idx !== -1) {
            return path.slice(0, idx + marker.length);
        }
        return "games/";
    }

    function getGamesJsonUrl() {
        return getGamesBasePath() + "games.json";
    }

    function fetchGamesJson() {
        if (window.__CCG_GAMES_CACHE__) {
            return Promise.resolve(window.__CCG_GAMES_CACHE__);
        }
        const url = getGamesJsonUrl();
        return fetch(url)
            .then(res => {
                if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
                return res.json();
            })
            .then(json => {
                if (!Array.isArray(json)) throw new Error("games.json is not an array");
                window.__CCG_GAMES_CACHE__ = json;
                return json;
            });
    }

    function getSlugFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get("id");
    }

    function safeSetText(el, value) {
        if (!el) return;
        el.textContent = value || "";
    }

    function hideEl(el) {
        if (!el) return;
        el.style.display = "none";
    }

    // ---------- Render ----------

    function renderGame(game) {
        const title = game.title || "Unknown title";

        safeSetText(titleEl, title);
        if (thumbEl && game.thumbUrl) {
            thumbEl.src = game.thumbUrl;
            thumbEl.alt = title;
        }

        safeSetText(systemEl, game.system || "");
        // games.json currently has no year – we'll leave it blank or "Unknown"
        safeSetText(yearEl, ""); // optional, or "Unknown"

        const genresText = Array.isArray(game.genres)
            ? game.genres.join(", ")
            : "";
        safeSetText(genreEl, genresText);

        // Developer / publisher not in JSON – leave blank for now
        safeSetText(devEl, "");
        safeSetText(pubEl, "");

        if (notesEl) {
            notesEl.textContent =
                "Extra trivia and commentary will be added to this page in future.";
        }

        // Links
        if (videoLinkEl) {
            if (game.videoId) {
                videoLinkEl.href = "https://www.youtube.com/watch?v=" + encodeURIComponent(game.videoId);
            } else {
                hideEl(videoLinkEl);
            }
        }

        if (diskLinkEl) {
            if (game.diskUrl && game.diskUrl !== "#") {
                diskLinkEl.href = game.diskUrl;
            } else {
                hideEl(diskLinkEl);
            }
        }

        if (manualLinkEl) {
            if (game.pdfUrl && game.pdfUrl !== "#") {
                manualLinkEl.href = game.pdfUrl;
            } else {
                hideEl(manualLinkEl);
            }
        }

        if (lemonLinkEl) {
            if (game.lemonUrl && game.lemonUrl !== "#") {
                lemonLinkEl.href = game.lemonUrl;
            } else {
                hideEl(lemonLinkEl);
            }
        }

        if (statusEl) statusEl.textContent = "";
    }

    // ---------- Boot ----------

    const slug = getSlugFromUrl();
    if (!slug) {
        if (statusEl) statusEl.textContent = "No game selected.";
        safeSetText(titleEl, "Game not found");
        return;
    }

    if (statusEl) statusEl.textContent = "Loading game details…";

    fetchGamesJson()
        .then(games => {
            const game =
                games.find(g => g.slug === slug) ||
                games.find(g => (g.slug || "").toLowerCase() === slug.toLowerCase());

            if (!game) {
                safeSetText(titleEl, "Game not found");
                if (statusEl) statusEl.textContent = "Could not find a game with id: " + slug;
                return;
            }

            renderGame(game);
        })
        .catch(err => {
            console.error("Error loading game:", err);
            safeSetText(titleEl, "Game not found");
            if (statusEl) statusEl.textContent = "Error loading game data.";
        });
})();
