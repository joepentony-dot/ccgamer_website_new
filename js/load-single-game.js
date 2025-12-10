/* ============================================================
   load-single-game.js — Omega Single Game Loader (Stability)
   Uses: games/games.json
   Target: /games/game.html
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    const main = document.querySelector(".ccg-main");
    if (!main) return;

    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get("id");
    if (!gameId) return;

    try {
        const response = await fetch("games.json");
        if (!response.ok) {
            throw new Error("Failed to fetch games.json");
        }

        const games = await response.json();
        const game = games.find(g => String(g.id) === String(gameId));

        if (!game) {
            console.warn("Game not found:", gameId);
            return;
        }

        renderGame(game, games);

    } catch (err) {
        console.error("Error loading single game:", err);
    }
});

/* ============================================================
   PATH + VALUE NORMALISERS
   ============================================================ */

// Canonical: games.json has "resources/images/thumbnails/all/<file>"
// Single game page is at /games/game.html → needs "../resources/..."
function normaliseSingleGameThumb(raw) {
    const FALLBACK = "../resources/images/thumbnails/all/1942.jpg";

    if (!raw) return FALLBACK;

    let p = String(raw).trim();

    // Strip any ../ at the start
    p = p.replace(/^(\.\.\/)+/, "");

    // Strip repo prefix if present
    p = p.replace(/^\/?ccgamer_website_new\//, "");

    // Remove leading slash
    p = p.replace(/^\//, "");

    if (p.startsWith("resources/images/thumbnails/")) {
        if (!p.startsWith("resources/images/thumbnails/all/")) {
            p = p.replace(
                "resources/images/thumbnails/",
                "resources/images/thumbnails/all/"
            );
        }
    } else {
        // Treat as bare filename
        p = "resources/images/thumbnails/all/" + p;
    }

    return "../" + p;
}

function normaliseSystemLabel(sys) {
    if (!sys) return "C64";

    const s = String(sys).trim().toLowerCase();

    if (["c64", "commodore 64"].includes(s)) return "C64";
    if (["amiga", "commodore amiga", "aga"].includes(s)) return "Amiga";

    return sys;
}

/* ============================================================
   RENDER THE PAGE
   ============================================================ */

function renderGame(game, games) {

    // -------------------------------
    // Derived values
    // -------------------------------
    const thumbPath = normaliseSingleGameThumb(game.thumbnail);
    const systemLabel = normaliseSystemLabel(game.system);
    const videoId = game.videoid || "";
    const youtubeWatchUrl = videoId
        ? `https://www.youtube.com/watch?v=${videoId}`
        : "";
    const youtubeEmbedUrl = videoId
        ? `https://www.youtube.com/embed/${videoId}?rel=0`
        : "";

    // ----------------------------------------------
    // System class (C64 / Amiga glow)
    // ----------------------------------------------
    const body = document.querySelector("body");
    if (body) {
        body.classList.remove("single-game--c64", "single-game--amiga");

        if (game.system && game.system.toLowerCase().includes("amiga")) {
            body.classList.add("single-game--amiga");
        } else {
            body.classList.add("single-game--c64");
        }
    }

    // ----------------------------------------------
    // HERO BACKGROUND (blurred backdrop)
    // ----------------------------------------------
    const heroBg = document.querySelector(".game-hero-bg");
    if (heroBg) {
        heroBg.style.backgroundImage = `url('${thumbPath}')`;
        heroBg.classList.add("game-hero-bg--active");
    }

    // ----------------------------------------------
    // HERO: THUMBNAIL + CLICK → PLAY VIDEO
    // ----------------------------------------------
    const thumb = document.querySelector(".game-hero-thumb");
    const thumbWrap = document.querySelector(".game-hero-thumb-wrap");

    if (thumb) {
        thumb.src = thumbPath;
        thumb.alt = game.title || "";
    }

    if (thumbWrap && youtubeEmbedUrl) {
        thumbWrap.style.cursor = "pointer";

        // If the image is wrapped in an <a>, neutralise its default navigation
        const thumbLink = thumbWrap.querySelector("a");

        if (thumbLink) {
            thumbLink.removeAttribute("href");
            thumbLink.style.cursor = "pointer";

            thumbLink.addEventListener("click", (e) => {
                e.preventDefault();
                activateVideoPlayback(youtubeEmbedUrl);
            });
        } else {
            thumbWrap.addEventListener("click", () => {
                activateVideoPlayback(youtubeEmbedUrl);
            });
        }
    }

    // ----------------------------------------------
    // TITLE + SYSTEM BOX
    // ----------------------------------------------
    const titleEl = document.getElementById("game-title");
    if (titleEl) {
        titleEl.textContent = game.title || "Untitled";
    }

    const systemMeta = document.getElementById("game-system");
    if (systemMeta) {
        systemMeta.textContent = systemLabel;
    }

    const systemKicker = document.getElementById("game-system-label");
    if (systemKicker) {
        systemKicker.textContent = systemLabel;
    }

    // ----------------------------------------------
    // META FIELDS: YEAR / SYSTEM / DEVELOPER
    // (match actual IDs in game.html)
    // ----------------------------------------------
    setText("game-year", game.year);
    setText("game-system", systemLabel);
    setText("game-developer", game.developer);

    // ----------------------------------------------
    // GENRES (string)
    // ----------------------------------------------
    const genreEl = document.getElementById("game-genres");
    if (genreEl && Array.isArray(game.genres)) {
        genreEl.textContent = game.genres.join(", ");
    }

    // ----------------------------------------------
    // DESCRIPTION (hide section if empty)
    // ----------------------------------------------
    const descSection = document.getElementById("game-description-section");
    const descEl = document.getElementById("game-description");
    if (descEl && descSection) {
        const text = (game.description || "").trim();
        if (text) {
            descEl.textContent = text;
            descSection.hidden = false;
        } else {
            descEl.textContent = "";
            descSection.hidden = true;
        }
    }

    // ----------------------------------------------
    // LEMON / EXTERNAL LINKS (optional)
    // ----------------------------------------------
    const lemonSection = document.getElementById("lemon-links-block");
    const lemonList = document.getElementById("lemon-links-list");

    if (lemonSection && lemonList) {
        lemonList.innerHTML = "";

        if (Array.isArray(game.lemonLinks) && game.lemonLinks.length > 0) {
            game.lemonLinks.forEach(link => {
                if (!link || !link.url) return;

                const li = document.createElement("li");
                li.innerHTML = `<a href="${link.url}" target="_blank" rel="noopener">${link.label || link.url}</a>`;
                lemonList.appendChild(li);
            });

            lemonSection.hidden = false;
        } else {
            lemonSection.hidden = true;
        }
    }

    // ----------------------------------------------
    // VIDEO HANDLING (using videoid)
    // ----------------------------------------------
    const videoSection = document.getElementById("game-video-section");
    const videoBtn = document.getElementById("game-play-video");

    if (videoBtn) {
        if (youtubeWatchUrl) {
            videoBtn.href = youtubeWatchUrl;
            videoBtn.hidden = false;
        } else {
            videoBtn.hidden = true;
        }
    }

    if (videoSection) {
        // Embedded section appears on first play
        videoSection.hidden = true;
    }

    // ----------------------------------------------
    // RELATED GAMES = FIRST BY SAME DEVELOPER,
    // FALLBACK TO SHARED GENRE
    // ----------------------------------------------
    renderRelatedGames(game, games);
}

/* ============================================================
   HELPERS
   ============================================================ */

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "—";
}

/* ============================================================
   VIDEO INJECTION + FRAME FLASH
   ============================================================ */

function injectVideo(videoUrl) {
    const frame = document.getElementById("game-video-embed");
    if (!frame) return;

    frame.src = videoUrl;

    const outer = document.querySelector(".game-video-frame-outer");
    if (outer) {
        outer.classList.remove("video-frame--active");
        void outer.offsetWidth; // reflow
        outer.classList.add("video-frame--active");
    }
}

/* When clicking the thumbnail, start video playback */
function activateVideoPlayback(videoUrl) {
    injectVideo(videoUrl);

    const videoSection = document.getElementById("game-video-section");
    if (videoSection) {
        videoSection.hidden = false;
        videoSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

/* ============================================================
   RELATED GAMES LOGIC
   ============================================================ */

function renderRelatedGames(game, games) {
    const grid = document.getElementById("related-games-grid");
    const title = document.getElementById("related-games-title");
    const subtitle = document.getElementById("related-games-subtitle"); // optional

    if (!grid) return;

    grid.innerHTML = "";

    let related = [];

    // TRY 1: Same Developer
    if (game.developer) {
        related = games.filter(
            g =>
                g.id !== game.id &&
                g.developer &&
                g.developer.toLowerCase() === game.developer.toLowerCase()
        );
    }

    if (related.length > 0) {
        if (title) title.textContent = "More From This Developer";
        if (subtitle) subtitle.textContent = game.developer || "";
    } else {
        // TRY 2: Same Genre
        related = games.filter(
            g =>
                g.id !== game.id &&
                Array.isArray(g.genres) &&
                Array.isArray(game.genres) &&
                g.genres.some(genre => game.genres.includes(genre))
        );

        if (title) title.textContent = "Related games";
        if (subtitle) subtitle.textContent = "";
    }

    related.slice(0, 6).forEach(g => {
        const card = document.createElement("a");
        card.href = `game.html?id=${encodeURIComponent(g.id)}`;
        card.className = "ccg-game-card";

        const relatedThumb = normaliseSingleGameThumb(g.thumbnail);
        const sysLabel = normaliseSystemLabel(g.system);

        card.innerHTML = `
            <div class="ccg-game-card__thumb">
                <img src="${relatedThumb}" alt="${g.title || ""}">
            </div>
            <div class="ccg-game-card__body">
                <div class="ccg-game-card__title">${g.title || "Untitled"}</div>
                <div class="ccg-game-card__meta">
                    ${(g.year || "").toString().trim() || "—"} • ${sysLabel}
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}
