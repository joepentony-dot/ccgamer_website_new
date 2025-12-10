/* ============================================================
   OMEGA SINGLE GAME LOADER — Mission E6 FIXED EDITION
   - Correct JSON path (critical fix)
   - Restores all metadata
   - Restores thumbnail + video activation
   - Related games stable
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
           CRITICAL FIX — CORRECT PATH
           game.html is inside /games/
           games.json is also inside /games/
           ============================================================ */
        const response = await fetch("./games.json");
        const games = await response.json();
        const game = games.find(g => g.id === gameId);

        if (!game) {
            console.error(`Game not found: ${gameId}`);
            return;
        }

        /* ----------------------------- */
        /* Basic fields                  */
        /* ----------------------------- */
        document.getElementById("gameTitle").textContent = game.title;
        document.getElementById("meta-year").textContent = game.year || "—";
        document.getElementById("meta-system").textContent = game.system || "—";
        document.getElementById("meta-developer").textContent = game.developer || "—";

        /* ----------------------------- */
        /* Thumbnail setup               */
        /* ----------------------------- */
        const thumbPath = `../resources/images/thumbnails/all/${game.thumbnail}`;
        const thumbImg = document.getElementById("heroThumb");
        const thumbLink = document.getElementById("heroThumbLink");

        if (thumbImg) {
            thumbImg.src = thumbPath;
            thumbImg.alt = `${game.title} artwork`;
        }

        // Make thumbnail play the video instead of navigating
        if (thumbLink) {
            thumbLink.removeAttribute("href");
            thumbLink.addEventListener("click", (e) => {
                e.preventDefault();
                activateVideo(game.youtube);
            });
        }

        /* ----------------------------- */
        /* Buttons                       */
        /* ----------------------------- */
        const ytBtn = document.getElementById("watchOnYouTube");
        if (ytBtn) {
            ytBtn.addEventListener("click", () => {
                window.open(game.youtube, "_blank");
            });
        }

        const manualBtn = document.getElementById("viewManual");
        if (manualBtn) {
            if (game.manual) manualBtn.addEventListener("click", () => window.open(game.manual, "_blank"));
            else manualBtn.classList.add("disabled");
        }

        const loadBtn = document.getElementById("loadDiskTape");
        if (loadBtn) {
            if (game.download) loadBtn.addEventListener("click", () => window.open(game.download, "_blank"));
            else loadBtn.classList.add("disabled");
        }

        /* ----------------------------- */
        /* YouTube video embedding       */
        /* ----------------------------- */
        function activateVideo(url) {
            const container = document.getElementById("gameVideoContainer");
            if (!container) return;

            const embedUrl = convertToEmbed(url);
            container.innerHTML = `
                <iframe 
                    width="100%" height="500"
                    src="${embedUrl}"
                    frameborder="0"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            `;
        }

        function convertToEmbed(url) {
            if (!url) return "";
            if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
            return url;
        }

        /* ----------------------------- */
        /* Related games                 */
        /* ----------------------------- */
        const relatedContainer = document.getElementById("relatedGames");

        if (relatedContainer) {
            const sameDeveloper = games.filter(g =>
                g.developer === game.developer && g.id !== game.id
            );

            let html = "";

            sameDeveloper.forEach(g => {
                html += `
                    <a class="related-game-card" href="game.html?id=${g.id}">
                        <img src="../resources/images/thumbnails/all/${g.thumbnail}" alt="${g.title}">
                        <div class="related-title">${g.title}</div>
                    </a>
                `;
            });

            if (sameDeveloper.length === 0) {
                html = `<p class="no-related">No more games from this developer.</p>`;
            }

            relatedContainer.innerHTML = html;
        }

    } catch (err) {
        console.error("Error loading game data:", err);
    }
});
