// =====================================================================
// OMEGA SINGLE GAME LOADER — CINEMATIC HERO + RELATED GAMES EDITION
// Bit Chief 😇🕹️👌
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

    function normaliseThumb(raw) {
        if (!raw) return "../resources/images/thumbnails/all/fallback.jpg";
        if (/^https?:\/\//i.test(raw)) return raw;
        return "../" + raw.replace(/^\/+/, "");
    }

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
    // 🍋 LEMON LINKS
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
    // OMEGA — CINEMATIC HERO BACKGROUND
    // =================================================================
    function applyHeroBackground(thumbnailUrl) {
        const heroBg = qs(".game-hero-bg");
        if (!heroBg) return;

        heroBg.style.backgroundImage = `url('${thumbnailUrl}')`;
        heroBg.classList.add("game-hero-bg--active");
    }

    // =================================================================
    // RELATED GAMES — OMEGA EDITION 😇🕹️👌
    // =================================================================

    function shuffle(arr) {
        return arr
            .map(a => ({ sort: Math.random(), value: a }))
            .sort((a, b) => a.sort - b.sort)
            .map(a => a.value);
    }

    function generateRelated(game, allGames) {
        const related = [];

        // 1) MATCH BY GENRE
        if (Array.isArray(game.genres)) {
            allGames.forEach(g => {
                if (g.id === game.id) return;
                if (!Array.isArray(g.genres)) return;

                const shared = g.genres.some(tag =>
                    game.genres.includes(tag)
                );

                if (shared) related.push(g);
            });
        }

        // 2) FALLBACK: DEVELOPER MATCH
        if (related.length < 3 && game.developer) {
            allGames.forEach(g => {
                if (g.id === game.id) return;
                if (!g.developer) return;
                if (g.developer === game.developer && !related.includes(g)) {
                    related.push(g);
                }
            });
        }

        // 3) FINAL FALLBACK: RANDOM SELECTION
        if (related.length < 3) {
            const randoms = shuffle(allGames.filter(g => g.id !== game.id));
            randoms.forEach(g => {
                if (!related.includes(g)) related.push(g);
            });
        }

        return shuffle(related).slice(0, 6);
    }

    function renderRelatedGames(games) {
        const grid = qs("#related-games-grid");
        if (!grid) return;

        if (!games || games.length === 0) {
            grid.innerHTML = `<p>No related games available.</p>`;
            return;
        }

        grid.innerHTML = "";

        games.forEach(g => {
            const card = document.createElement("a");
            card.className = "ccg-game-card";
            card.href = `game.html?id=${encodeURIComponent(g.id)}`;

            const thumb = normaliseThumb(g.thumbnail);

            card.innerHTML = `
                <div class="ccg-game-card__thumb">
                    <img src="${thumb}" alt="${g.title}">
                </div>
                <div class="ccg-game-card__body">
                    <h3 class="ccg-game-card__title">${g.title}</h3>
                    <p class="ccg-game-card__meta">${g.year || ""} • ${g.system || ""}</p>
                </div>
            `;

            grid.appendChild(card);
        });
    }

    // =================================================================
    // POPULATE MAIN GAME DETAILS
    // =================================================================
    function populateGame(game, allGames) {

        // TITLE, YEAR, SYSTEM
        setText("#game-title", game.title);
        setText("#game-year", game.year);
        setText("#game-system", game.system);
        setText("#game-system-label", game.system);

        // GENRES + DESCRIPTION
        setText("#game-genres", buildGenresString(game));
        setText("#game-description",
            game.description ||
            "No description has been added for this title yet."
        );

        // HERO IMAGE + BACKGROUND
        const heroImg = qs("#game-hero-image");
        const thumb = normaliseThumb(game.thumbnail);
        if (heroImg) {
            heroImg.src = thumb;
            heroImg.alt = `${game.title} cover`;
        }
        applyHeroBackground(thumb);

        // META TAGS
        const pageTitle = `${game.title} (${game.year || "Unknown"}) | Cheeky Commodore Gamer`;
        const pageDesc =
            `Details, manual, gameplay video and media for ${game.title} — a ${buildGenresString(game)} title on the ${game.system}.`;
        setMeta(pageTitle, pageDesc);

        // MANUAL PDF
        const pdfBtn = qs("#pdf-button");
        if (pdfBtn) {
            if (game.pdf && String(game.pdf).trim() !== "") {
                pdfBtn.href = game.pdf;
                pdfBtn.hidden = false;
            } else {
                pdfBtn.hidden = true;
            }
        }

        // DISK LINK
        const diskBtn = qs("#disk-button");
        if (diskBtn) {
            if (Array.isArray(game.disk) && game.disk.length > 0) {
                diskBtn.href = game.disk[0];
                diskBtn.hidden = false;
            } else {
                diskBtn.hidden = true;
            }
        }

        // LEMON LINKS
        populateLemonLinks(game);

        // VIDEO
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

        // 🔥 DYNAMIC RELATED GAMES
        const related = generateRelated(game, allGames);
        renderRelatedGames(related);
    }

    // =================================================================
    // LOAD JSON + APPLY DATA
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

            const game = gamesArray.find(g => g.id === id);

            if (!game) {
                setText("#game-title", "Game Not Found");
                return;
            }

            populateGame(game, gamesArray);

        } catch (err) {
            console.error("SINGLE GAME LOADER ERROR", err);
            setText("#game-title", "Error Loading Game");
        }
    }

    document.addEventListener("DOMContentLoaded", loadGame);

})();
