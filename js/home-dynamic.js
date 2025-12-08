// ======================================================================
// home-dynamic.js — Omega Dynamic Loader (A2 JSON-SYNC BUILD)
// Drives:
//  ✔ Featured Game of the Day (randomised each load)
//  ✔ Dynamic Featured Video (from the same selected game)
//  ✔ Safe fallbacks if JSON / video is missing
//  Uses real keys from games/games.json:
//     id, title, system, year, videoid, thumbnail
// ======================================================================

(async function () {
    const FEATURED_GAME_CONTAINER = document.querySelector("[data-ccg-featured-game]");
    const FEATURED_VIDEO_FRAME    = document.querySelector("[data-ccg-featured-video]");
    const FEATURED_VIDEO_TITLE    = document.querySelector("[data-ccg-featured-video-title]");
    const FEATURED_VIDEO_BUTTON   = document.querySelector("[data-ccg-featured-video-btn]");

    // If we’re not on the home page or markup is missing, bail out quietly
    if (!FEATURED_GAME_CONTAINER || !FEATURED_VIDEO_FRAME) {
        console.warn("home-dynamic.js: Home dynamic elements missing — nothing to load.");
        return;
    }

    try {
        // -------------------------------------------------------------
        // 1) LOAD games.json
        // -------------------------------------------------------------
        const response = await fetch("games/games.json", { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} while fetching games.json`);
        }

        const games = await response.json();
        if (!Array.isArray(games) || games.length === 0) {
            throw new Error("games.json did not contain an array");
        }

        // -------------------------------------------------------------
        // 2) FILTER to games that actually have a YouTube videoid
        // -------------------------------------------------------------
        const videoCapable = games.filter(g =>
            typeof g.videoid === "string" && g.videoid.trim().length > 0
        );

        if (videoCapable.length === 0) {
            console.warn("home-dynamic.js: No video-enabled games in JSON.");
            FEATURED_VIDEO_FRAME.innerHTML =
                `<p class="ccg-error-text">No video-enabled games in JSON.</p>`;
            return;
        }

        // Pick a random game each page load
        const chosen = videoCapable[Math.floor(Math.random() * videoCapable.length)];

        const title   = chosen.title || "Featured Game";
        const system  = chosen.system || "";
        const year    = chosen.year || "";
        const videoId = chosen.videoid.trim();
        const thumb   = chosen.thumbnail || "";
        const gameId  = chosen.id || "";

        // -------------------------------------------------------------
        // 3) UPDATE FEATURED GAME CARD
        // -------------------------------------------------------------
        const titleEl = FEATURED_GAME_CONTAINER.querySelector("[data-fg-title]");
        const descEl  = FEATURED_GAME_CONTAINER.querySelector("[data-fg-desc]");
        const imgEl   = FEATURED_GAME_CONTAINER.querySelector("[data-fg-thumb]");
        const btnEl   = FEATURED_GAME_CONTAINER.querySelector("[data-fg-btn]");

        if (titleEl) {
            titleEl.textContent = title;
        }

        if (descEl) {
            const systemPart = system ? ` on ${system}` : "";
            const yearPart   = year ? ` (${year})` : "";
            descEl.textContent =
                `${title}${systemPart}${yearPart} — one of the many curated classics in the CCG library.`;
        }

        if (imgEl) {
            if (thumb) {
                // games.json paths already include /ccgamer_website_new/ prefix, which
                // works correctly on GitHub Pages, so we can use them as-is.
                imgEl.src = thumb;
            }
            imgEl.alt = `${title} cover art`;
        }

        if (btnEl && gameId) {
            btnEl.href = `games/game.html?id=${encodeURIComponent(gameId)}`;
        }

        // -------------------------------------------------------------
        // 4) UPDATE FEATURED VIDEO BLOCK
        // -------------------------------------------------------------
        if (FEATURED_VIDEO_TITLE) {
            FEATURED_VIDEO_TITLE.textContent = `Featured CCG Video — ${title}`;
        }

        if (videoId) {
            FEATURED_VIDEO_FRAME.innerHTML = `
                <iframe
                    src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}"
                    title="Cheeky Commodore Gamer featured video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    loading="lazy"
                    allowfullscreen>
                </iframe>
            `;
        } else {
            FEATURED_VIDEO_FRAME.innerHTML =
                `<p class="ccg-error-text">This game has no video attached.</p>`;
        }

        if (FEATURED_VIDEO_BUTTON && videoId) {
            FEATURED_VIDEO_BUTTON.href =
                `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
        }

    } catch (err) {
        console.error("home-dynamic.js error:", err);
        if (FEATURED_VIDEO_FRAME) {
            FEATURED_VIDEO_FRAME.innerHTML =
                `<p class="ccg-error-text">Failed to load featured content — please try again later.</p>`;
        }
    }
})();
