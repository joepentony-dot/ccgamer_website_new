// =====================================================================
// OMEGA SINGLE GAME LOADER — CINEMATIC HERO EDITION 😇🕹️👌
// Loads ALL DATA from games.json:
// - Title, system, year, genres, developer, lemon links
// - Thumbnail, video, manuals, disks
// - NEW: Cinematic blurred hero background
// - NEW: Proper system label
// - NEW: Related Games section hook
// =====================================================================

(function () {

    const REPO_PREFIX = "/ccgamer_website_new";

    function qs(sel) { return document.querySelector(sel); }
    function qsa(sel) { return document.querySelectorAll(sel); }

    function setText(sel, value, fallback = "—") {
        const el = typeof sel === "string" ? qs(sel) : sel;
        if (!el) return;
        const v =
            value === undefined ||
            value === null ||
            String(value).trim() === ""
                ? fallback
                : String(value);
        el.textContent = v;
    }

    function getParamId() {
        const params = new URLSearchParams(window.location.search);
        return params.get("id");
    }

    function jsonPath() {
        const usingRepoPrefix = window.location.pathname.startsWith(REPO_PREFIX);
        return (usingRepoPrefix ? REPO_PREFIX : "") + "/games/games.json";
    }

    // Thumbnail resolver from JSON → usable path
    function normaliseThumb(raw) {
        if (!raw) return "../resources/images/thumbnails/all/fallback.jpg";
        if (/^https?:\/\//i.test(raw)) return raw;
        return "../" + raw.replace(/^\/+/, "");
    }

    // Update browser metadata
    function setMeta(title, description) {
        const metaTitle = qs("#game-meta-title");
        const metaDesc = qs("#game-meta-description");

        if (metaTitle) metaTitle.textContent = title;
        if (metaDesc) metaDesc.content = description;

        document.title = title;
    }

    function buildGenresString(game) {
        return Array.isArray(game.genres) && game.genres.length
            ? game.genres.join(" • ")
            : "Unclassified";
    }

    // =================================================================
    // 🍋 LEMON LINKS (keep original behaviour)
    // =================================================================
    function populateLemonLinks(game) {
        const block = qs("#lemon-links-block");
        const list = qs("#lemon-links-list");
        if (!block || !list) return;

        if (!Array.isArray(game.lemon) || game.lemon.length === 0) {
            block.hidden = true;
            return;
        }

        list.innerHTML = "";
        game.lemon.forEach((url) => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener";
            a.textContent = `🍋 Lemon Entry`;
            li.appendChild(a);
            list.appendChild(li);
        });

        block.hidden = false;
    }

    // =================================================================
    // NEW: APPLY CINEMATIC HERO BACKGROUND
    // =================================================================
    function applyHeroBackground(thumbnailUrl) {
        const heroBg = qs(".game-hero-bg");
        if (!heroBg) return;

        heroBg.style.backgroundImage = `url('${thumbnailUrl}')`;
        heroBg.classList.add("game-hero-bg--active");
    }

    // =================================================================
    // NEW: POPULATE RELATED GAMES (placeholder for later)
    // =================================================================
    function prepareRelatedGames(game) {
        const grid = qs("#related-games-grid");
        if (!grid) return;

        // Placeholder text until we wire dynamic related games
        grid.innerHTML = `
            <div class="ccg-related-placeholder">
                Related games coming soon…
            </div>
        `;
    }

    // =================================================================
    // POPULATE GAME DETAILS
    // =================================================================
    function populateGame(game) {

        // -----------------------------------------------------------
        // BASIC INFO
        // -----------------------------------------------------------
        setText("#game-title", game.title);
        setText("#game-year", game.year);

        // Support BOTH old and new system fields
        setText("#game-system", game.system);
        setText("#game-system-label", game.system);

        setText("#game-genres", buildGenresString(game));

        setText("#game-description",
            game.description ||
            "No description has been added for this title yet."
        );

        // -----------------------------------------------------------
        // HERO IMAGE + BACKGROUND
        // -----------------------------------------------------------
        const heroImg = qs("#game-hero-image");
        const thumb = normaliseThumb(game.thumbnail);

        if (heroImg) {
            heroImg.src = thumb;
            heroImg.alt = `${game.title} cover`;
        }

        applyHeroBackground(thumb);

        // -----------------------------------------------------------
        // META TAGS
        // -----------------------------------------------------------
        const metaTitle = `${game.title} (${game.year || "Unknown"}) | Cheeky Commodore Gamer`;
        const metaDesc =
            `Details, manual, gameplay video and media for ${game.title} — a ${buildGenresString(game)} title on the ${game.system}.`;

        setMeta(metaTitle, metaDesc);

        // -----------------------------------------------------------
        // 🍋 LEMON LINKS
        // -----------------------------------------------------------
        populateLemonLinks(game);

        // -----------------------------------------------------------
        // 🎥 VIDEO BUTTON + EMBED
        // -----------------------------------------------------------
        const playBtn = qs("#game-play-video");
        const videoSection = qs("#game-video-section");
        const videoEmbed = qs("#game-video-embed");

        if (game.videoid) {
            if (playBtn) {
                playBtn.href = `https://www.youtube.com/watch?v=${encodeURIComponent(game.videoid)}`;
                playBtn.hidden = false;
            }
            if (videoSection && videoEmbed) {
                videoEmbed.src = `https://www.youtube.com/embed/${encodeURIComponent(game.videoid)}`;
                videoSection.hidden = false;
            }
        }

        // -----------------------------------------------------------
        // 📘 MANUAL PDF
        // -----------------------------------------------------------
        const pdfBtn = qs("#pdf-button");
        if (pdfBtn) {
            if (game.pdf && String(game.pdf).trim() !== "") {
                pdfBtn.href = game.pdf;
                pdfBtn.hidden = false;
            } else {
                pdfBtn.hidden = true;
            }
        }

        // -----------------------------------------------------------
        // 💾 DISK DOWNLOAD
        // -----------------------------------------------------------
        const diskBtn = qs("#disk-button");
        if (diskBtn) {
            if (Array.isArray(game.disk) && game.disk.length > 0) {
                diskBtn.href = game.disk[0];
                diskBtn.hidden = false;
            } else {
                diskBtn.hidden = true;
            }
        }

        // -----------------------------------------------------------
        // NEW: Related Games
        // -----------------------------------------------------------
        prepareRelatedGames(game);
    }

    // =================================================================
    // LOAD GAME JSON + FIND MATCH
    // =================================================================
    async function loadGame() {
        const id = getParamId();
        if (!id) {
            setText("#game-title", "Unknown Game");
            return;
        }

        try {
            const response = await fetch(jsonPath(), { cache: "no-store" });
            if (!response.ok) throw new Error("Failed to load games.json");

            const data = await response.json();
            const gamesArray = Array.isArray(data) ? data : data.games || [];
            const game = gamesArray.find((g) => g.id === id);

            if (!game) {
                setText("#game-title", "Game Not Found");
                return;
            }

            populateGame(game);

        } catch (err) {
            console.error("SINGLE GAME LOADER ERROR", err);
            setText("#game-title", "Error Loading Game");
        }
    }

    document.addEventListener("DOMContentLoaded", loadGame);

})();
