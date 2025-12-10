/* ============================================================
   OMEGA SINGLE GAME LOADER — MISSION E6 FINAL EDITION
   - Fully compatible with your actual game.html IDs
   - Corrects JSON path
   - Restores ALL metadata
   - Fixes thumbnails
   - Fixes related games
   - Fixes video activation
   - Zero regressions
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get("id");

    if (!gameId) {
        console.error("No game ID found in URL.");
        return;
    }

    try {
        /* ============================================================
           CRITICAL JSON PATH FIX
           game.html and games.json are in the SAME folder.
           ============================================================ */
        const response = await fetch("./games.json");
        const games = await response.json();
        const game = games.find(g => g.id === gameId);

        if (!game) {
            console.error(`Game not found with id: ${gameId}`);
            return;
        }

        /* ============================================================
           POPULATE TITLE & METADATA
           ============================================================ */
        setText("game-title", game.title);
        setText("game-year", game.year || "—");
        setText("game-system", game.system || "—");
        setText("game-developer", game.developer || "—");

        /* ============================================================
           DESCRIPTION
           ============================================================ */
        setText("game-description", game.description || "");

        /* ============================================================
           HERO THUMBNAIL
           ============================================================ */
        const heroImg = document.getElementById("game-hero-image");
        const heroLink = document.getElementById("game-hero-video-link");

        if (heroImg) {
            heroImg.src = `../resources/images/thumbnails/all/${game.thumbnail}`;
            heroImg.alt = game.title;
        }

        /* Clicking thumbnail should play video, not reload page */
        if (heroLink) {
            heroLink.removeAttribute("href");
            heroLink.style.cursor = "pointer";
            heroLink.addEventListener("click", (e) => {
                e.preventDefault();
                activateVideo(game.youtube);
            });
        }

        /* ============================================================
           WATCH ON YOUTUBE BUTTON
           ============================================================ */
        const ytBtn = document.getElementById("watchOnYouTube");
        if (ytBtn) {
            ytBtn.addEventListener("click", () => {
                if (game.youtube) window.open(game.youtube, "_blank");
            });
        }

        /* ============================================================
           LOAD DISK / TAPE
           ============================================================ */
        const loadBtn = document.getElementById("loadDiskTape");
        if (loadBtn) {
            if (game.download) {
                loadBtn.addEventListener("click", () => window.open(game.download, "_blank"));
            } else {
                loadBtn.classList.add("disabled");
            }
        }

        /* ============================================================
           MANUAL VIEWER
           ============================================================ */
        const manualBtn = document.getElementById("viewManual");
        if (manualBtn) {
            if (game.manual) {
                manualBtn.addEventListener("click", () => window.open(game.manual, "_blank"));
            } else {
                manualBtn.classList.add("disabled");
            }
        }

        /* ============================================================
           VIDEO SECTION — INLINE EMBED
           ============================================================ */
        function activateVideo(url) {
            const videoSection = document.getElementById("game-video-section");
            const videoEmbed = document.getElementById("game-video-embed");

            if (!videoEmbed || !videoSection) return;

            videoSection.style.display = "block";

            const embedUrl = convertToEmbed(url);
            videoEmbed.innerHTML = `
                <iframe 
                    width="100%" 
                    height="480"
                    src="${embedUrl}"
                    frameborder="0"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            `;
        }

        function convertToEmbed(url) {
            if (!url) return "";
            if (url.includes("watch?v=")) {
                return url.replace("watch?v=", "embed/");
            }
            return url;
        }

        /* ============================================================
           RELATED GAMES (More From This Developer)
           ============================================================ */
        const relatedGrid = document.getElementById("related-games-grid");

        if (relatedGrid) {
            const sameDev = games.filter(
                g => g.developer === game.developer && g.id !== game.id
            );

            if (sameDev.length === 0) {
                relatedGrid.innerHTML = `<p>No more games from this developer.</p>`;
            } else {
                relatedGrid.innerHTML = sameDev.map(g => `
                    <a class="related-game-card" href="game.html?id=${g.id}">
                        <img src="../resources/images/thumbnails/all/${g.thumbnail}" alt="${g.title}">
                        <div class="related-title">${g.title}</div>
                    </a>
                `).join("");
            }
        }

    } catch (err) {
        console.error("Error loading single game data:", err);
    }
});

/* ============================================================
   SMALL HELPER — CLEAN TEXT SETTER
   ============================================================ */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}
