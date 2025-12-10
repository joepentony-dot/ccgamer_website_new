// =====================================================================
// OMEGA SINGLE GAME LOADER — CINEMATIC HERO + RELATED GAMES EDITION
// Bit Chief 😇🕹️👌 — WITH DEVELOPER SUPPORT (OPTION A) + E3 DOWNLOAD POLISH
// =====================================================================

(function () {

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

    // games.json sits in the same folder as game.html
    function jsonPath() {
        return "games.json";
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

    // Small helper to make the disk button label format-aware
    function buildDiskLabelFromUrl(url) {
        if (!url) return "Load Disk / Tape";
        const lower = String(url).toLowerCase();
        const lastDot = lower.lastIndexOf(".");
        let ext = "";
        if (lastDot !== -1) {
            ext = lower.slice(lastDot + 1);
        }

        switch (ext) {
            case "d64":
            case "d71":
            case "d81":
                return "Load " + ext.toUpperCase() + " Disk";
            case "g64":
                return "Load G64 Disk";
            case "adf":
                return "Load ADF Disk";
            case "tap":
            case "tzx":
                return "Load " + ext.toUpperCase() + " Tape";
            case "zip":
            case "rar":
            case "7z":
                return "Download " + ext.toUpperCase() + " Archive";
            default:
                return "Load Disk / Tape";
        }
    }

    // =================================================================
    // 🍋 LEMON / EXTERNAL LINKS
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

            let label = "Game Database Entry";
            const lower = String(url).toLowerCase();

            if (lower.includes("lemon64")) {
                label = "Lemon64";
            } else if (lower.includes("lemonamiga")) {
                label = "Lemon Amiga";
            }

            a.textContent = label;
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

        heroBg.style.backgroundImage = "url('" + thumbnailUrl + "')";
        heroBg.classList.add("game-hero-bg--active");
    }

    // =================================================================
    // RELATED GAMES — ENHANCED WITH DEVELOPER PRIORITY (OPTION A)
    // =================================================================

    function shuffle(arr) {
        return arr
            .map(a => ({ sort: Math.random(), value: a }))
            .sort((a, b) => a.sort - b.sort)
            .map(a => a.value);
    }

    function generateRelated(game, allGames) {
        const related = [];

        // 1) MATCH BY GENRE FIRST
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

        // 2) MATCH BY DEVELOPER (Option A)
        if (game.developer) {
            allGames.forEach(g => {
                if (g.id === game.id) return;
                if (!g.developer) return;
                if (g.developer === game.developer && !related.includes(g)) {
                    related.push(g);
                }
            });
        }

        // 3) RANDOM FILLER IF STILL FEW
        if (related.length < 3) {
            const randoms = shuffle(allGames.filter(g => g.id !== game.id));
            randoms.forEach(g => {
                if (!related.includes(g)) related.push(g);
            });
        }

        return shuffle(related).slice(0, 6);
    }

    function updateRelatedTitle(game, relatedGames) {
        const titleEl = qs("#related-games-title");
        if (!titleEl) return;

        if (!game.developer) {
            titleEl.textContent = "Related games";
            return;
        }

        const sameDeveloperCount = relatedGames.filter(
            g => g.developer === game.developer
        ).length;

        if (sameDeveloperCount >= 3) {
            titleEl.textContent = "More From This Developer";
        } else {
            titleEl.textContent = "Related games";
        }
    }

    function renderRelatedGames(games) {
        const grid = qs("#related-games-grid");
        if (!grid) return;

        if (!games || games.length === 0) {
            grid.innerHTML = "<p>No related games available.</p>";
            return;
        }

        grid.innerHTML = "";

        games.forEach(g => {
            const card = document.createElement("a");
            card.className = "ccg-game-card";
            card.href = "game.html?id=" + encodeURIComponent(g.id);

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

        // ⭐ OPTION A — DEVELOPER
        setText("#game-developer", game.developer);

        // SYSTEM ACCENT CLASS ON <html>
        const root = document.documentElement;
        if (root) {
            root.classList.remove("single-game--c64", "single-game--amiga");
            const sys = (game.system || "").toLowerCase();
            if (sys.includes("amiga")) {
                root.classList.add("single-game--amiga");
            } else if (sys.includes("64")) {
                root.classList.add("single-game--c64");
            }
        }

        // GENRES
        setText("#game-genres", buildGenresString(game));

        // DESCRIPTION (OPTIONAL)
        const descSection = qs("#game-description-section");
        const descEl = qs("#game-description");
        if (descSection && descEl) {
            const raw = (game.description || "").trim();
            if (raw) {
                descEl.textContent = raw;
                descSection.hidden = false;
            } else {
                descSection.hidden = true;
            }
        }

        // HERO IMAGE + BACKGROUND
        const heroImg = qs("#game-hero-image");
        const thumb = normaliseThumb(game.thumbnail);
        if (heroImg) {
            heroImg.src = thumb;
            heroImg.alt = game.title ? (game.title + " cover") : "Game cover";
        }
        applyHeroBackground(thumb);

        // META TAGS
        const pageTitle = (game.title ? game.title : "Game") +
            " (" + (game.year || "Unknown") + ") | Cheeky Commodore Gamer";
        const pageDesc =
            "Details, manual, gameplay video and media for " +
            (game.title || "this title") +
            " — a " + buildGenresString(game) +
            " title on the " + (game.system || "system") + ".";
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

        // DISK LINK(S)
        const diskBtn = qs("#disk-button");
        let diskFiles = [];
        if (Array.isArray(game.disk)) {
            diskFiles = game.disk;
        } else if (typeof game.disk === "string" && game.disk.trim() !== "") {
            diskFiles = [game.disk.trim()];
        }

        if (diskBtn) {
            if (diskFiles.length > 0) {
                const firstDiskUrl = diskFiles[0];
                diskBtn.href = firstDiskUrl;
                const labelSpan = diskBtn.querySelector(".game-hero-btn__label");
                if (labelSpan) {
                    labelSpan.textContent = buildDiskLabelFromUrl(firstDiskUrl);
                }
                diskBtn.hidden = false;
            } else {
                diskBtn.hidden = true;
            }
        }

        // EXTERNAL LINKS
        populateLemonLinks(game);

        // VIDEO
        const playBtn = qs("#game-play-video");
        const videoSection = qs("#game-video-section");
        const videoEmbed = qs("#game-video-embed");

        if (game.videoid) {
            if (playBtn) {
                playBtn.href = "https://www.youtube.com/watch?v=" +
                    encodeURIComponent(game.videoid);
                playBtn.hidden = false;
            }
            if (videoSection && videoEmbed) {
                videoEmbed.src = "https://www.youtube.com/embed/" +
                    encodeURIComponent(game.videoid);
                videoSection.hidden = false;
            }
        } else {
            if (playBtn) playBtn.hidden = true;
            if (videoSection) videoSection.hidden = true;
        }

        // DOWNLOAD CONSOLE VISIBILITY (hide if nothing to show)
        const actions = qs(".game-hero-actions");
        if (actions) {
            const anyVisible =
                (pdfBtn && !pdfBtn.hidden) ||
                (diskBtn && !diskBtn.hidden) ||
                (playBtn && !playBtn.hidden);
            actions.hidden = !anyVisible;
        }

        // RELATED GAMES (OPTION A ENHANCED)
        const related = generateRelated(game, allGames);
        updateRelatedTitle(game, related);
        renderRelatedGames(related);

        // Mark page as loaded (CSS reveals transitions)
        if (root) {
            root.classList.add("single-game-loaded");
        }
    }

    // =================================================================
    // LOAD JSON + APPLY GAME DATA
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
            const gamesArray = Array.isArray(data) ? data : (data.games || []);

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
