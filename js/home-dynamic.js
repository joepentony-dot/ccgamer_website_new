// ======================================================================
// home-dynamic.js — Omega Dynamic Loader (FINAL A1 BUILD)
// Drives:
//  ✔ Featured Game of the Day (randomised each load)
//  ✔ Dynamic Featured Video (from the same selected game)
//  ✔ Featured video iframe generator
//  ✔ Safe fallback handling
// ======================================================================

(async function () {
    const FEATURED_GAME_CONTAINER = document.querySelector("[data-ccg-featured-game]");
    const FEATURED_VIDEO_FRAME = document.querySelector("[data-ccg-featured-video]");
    const FEATURED_VIDEO_TITLE = document.querySelector("[data-ccg-featured-video-title]");
    const FEATURED_VIDEO_BUTTON = document.querySelector("[data-ccg-featured-video-btn]");

    if (!FEATURED_GAME_CONTAINER || !FEATURED_VIDEO_FRAME) {
        console.warn("Home dynamic elements missing — nothing to load.");
        return;
    }

    try {
        // Load JSON ---------------------------------------------------------
        const response = await fetch("games/games.json");
        const games = await response.json();

        // Filter games that actually have a YouTube video ID
        const videoCapable = games.filter(g => g.video && g.video.trim().length > 3);

        // Fallback safety
        if (videoCapable.length === 0) {
            FEATURED_VIDEO_FRAME.innerHTML = `<p style="color:#fff">No video-enabled games in JSON.</p>`;
            return;
        }

        // Pick a random game each page load --------------------------------
        const chosen = videoCapable[Math.floor(Math.random() * videoCapable.length)];

        // ===================================================================
        // FEATURED GAME CARD UPDATE
        // ===================================================================
        const titleEl = FEATURED_GAME_CONTAINER.querySelector("[data-fg-title]");
        const descEl = FEATURED_GAME_CONTAINER.querySelector("[data-fg-desc]");
        const imgEl = FEATURED_GAME_CONTAINER.querySelector("[data-fg-thumb]");
        const btnEl = FEATURED_GAME_CONTAINER.querySelector("[data-fg-btn]");

        if (titleEl) titleEl.textContent = chosen.title || "Unknown Game";
        if (descEl) descEl.textContent = chosen.description || "A classic entry in the C64/Amiga library.";
        if (imgEl) imgEl.src = chosen.thumb;
        if (btnEl) btnEl.href = `games/game.html?id=${chosen.slug}`;

        // ===================================================================
        // FEATURED VIDEO BLOCK UPDATE
        // ===================================================================
        const ytID = chosen.video.trim();

        // Update title
        if (FEATURED_VIDEO_TITLE)
            FEATURED_VIDEO_TITLE.textContent = `Featured Video — ${chosen.title}`;

        // Dynamic iframe
        FEATURED_VIDEO_FRAME.innerHTML = `
            <iframe 
                src="https://www.youtube.com/embed/${ytID}"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                loading="lazy"
                allowfullscreen>
            </iframe>
        `;

        // Watch more button
        if (FEATURED_VIDEO_BUTTON)
            FEATURED_VIDEO_BUTTON.href = `https://www.youtube.com/watch?v=${ytID}`;

    } catch (err) {
        console.error("Dynamic load error:", err);
        FEATURED_VIDEO_FRAME.innerHTML = `<p style="color:#fff">Failed to load featured content.</p>`;
    }
})();
