// ======================================================================
// home-dynamic.js — Omega Dynamic Loader (FINAL A2 BUILD)
// Drives:
//  ✔ Featured Game of the Day (randomised each load)
//  ✔ Dynamic Featured Video (from the same selected game)
//  ✔ Safe fallback handling
// Uses games/games.json with keys: id, title, videoid, thumbnail, genres, etc.
// ======================================================================

(function () {
    const html = document.documentElement;
    if (html.getAttribute("data-ccg-page") !== "home") return;

    const FEATURED_GAME_CONTAINER = document.querySelector("[data-ccg-featured-game]");
    const FEATURED_VIDEO_FRAME   = document.querySelector("[data-ccg-featured-video]");
    const FEATURED_VIDEO_TITLE   = document.querySelector("[data-ccg-featured-video-title]");
    const FEATURED_VIDEO_BUTTON  = document.querySelector("[data-ccg-featured-video-btn]");

    if (!FEATURED_GAME_CONTAINER || !FEATURED_VIDEO_FRAME) {
        console.warn("Home dynamic elements missing — nothing to load.");
        return;
    }

    const titleEl = FEATURED_GAME_CONTAINER.querySelector("[data-fg-title]");
    const descEl  = FEATURED_GAME_CONTAINER.querySelector("[data-fg-desc]");
    const imgEl   = FEATURED_GAME_CONTAINER.querySelector("[data-fg-thumb]");
    const btnEl   = FEATURED_GAME_CONTAINER.querySelector("[data-fg-btn]");

    function resolveThumbForHome(raw) {
        if (!raw) return "resources/images/thumbnails/all/1942.jpg";
        let p = String(raw).trim();

        // Strip repo prefix if present
        p = p.replace(/^\/?ccgamer_website_new\//, "");

        // Strip any leading slash so it's relative from site root
        p = p.replace(/^\//, "");

        return p; // e.g. "resources/images/thumbnails/all/1942.jpg"
    }

    async function loadFeatured() {
        try {
            const response = await fetch("games/games.json");
            if (!response.ok) throw new Error("games.json fetch failed");
            const games = await response.json();

            // Only games with a videoid
            const videoCapable = games.filter(g => g.videoid && String(g.videoid).trim().length > 0);

            if (!videoCapable.length) {
                FEATURED_VIDEO_FRAME.innerHTML =
                    `<p style="color:#fff;padding:1rem;">No video-enabled games in JSON.</p>`;
                return;
            }

            // Pick random game each load
            const chosen = videoCapable[Math.floor(Math.random() * videoCapable.length)];

            const title = chosen.title || "Unknown Game";
            const year  = chosen.year ? ` (${chosen.year})` : "";
            const system = chosen.system || "";
            const dev   = chosen.developer || "";
            const ytID  = String(chosen.videoid).trim();

            // ---------------- Featured Game Card ----------------
            if (titleEl) titleEl.textContent = title;

            if (descEl) {
                const bits = [];
                if (system) bits.push(system);
                if (dev) bits.push(dev);
                descEl.textContent = bits.length
                    ? `${bits.join(" • ")} — a standout entry in the Commodore library.`
                    : "A classic entry in the C64/Amiga library.";
            }

            if (imgEl) {
                imgEl.src = resolveThumbForHome(chosen.thumbnail);
                imgEl.alt = title;
            }

            if (btnEl) {
                btnEl.href = `games/game.html?id=${encodeURIComponent(chosen.id)}`;
            }

            // ---------------- Featured Video Block ----------------
            if (FEATURED_VIDEO_TITLE) {
                FEATURED_VIDEO_TITLE.textContent = `Featured CCG Video — ${title}${year}`;
            }

            FEATURED_VIDEO_FRAME.innerHTML = `
                <iframe
                    src="https://www.youtube.com/embed/${ytID}"
                    title="Featured CCG video"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    loading="lazy">
                </iframe>
            `;

            if (FEATURED_VIDEO_BUTTON) {
                FEATURED_VIDEO_BUTTON.href = `https://www.youtube.com/watch?v=${ytID}`;
            }
        } catch (err) {
            console.error("Dynamic home load error:", err);
            FEATURED_VIDEO_FRAME.innerHTML =
                `<p style="color:#fff;padding:1rem;">Failed to load featured content.</p>`;
        }
    }

    document.addEventListener("DOMContentLoaded", loadFeatured);
})();
