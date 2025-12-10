/* ============================================================
   OMEGA SINGLE GAME LOADER — vFinal
   Restores:
   - Thumbnail click = play embedded YouTube video
   - Prevents page reload or opening new tab
   - Reads correct metadata fields
   - Hero thumbnail safe, enlarged, cinematic
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get("id");

    if (!gameId) {
        console.error("No game ID found in URL.");
        return;
    }

    try {
        const response = await fetch("../games.json");
        const games = await response.json();
        const game = games.find(g => g.id === gameId);

        if (!game) {
            console.error("Game not found:", gameId);
            return;
        }

        // -----------------------------
        // Populate basic game details
        // -----------------------------
        document.getElementById("gameTitle").textContent = game.title;
        document.getElementById("meta-year").textContent = game.year || "—";
        document.getElementById("meta-system").textContent = game.system || "—";
        document.getElementById("meta-developer").textContent = game.developer || "—";

        // -----------------------------
        // Thumbnail path
        // -----------------------------
        const thumbPath = `../resources/images/thumbnails/all/${game.thumbnail}`;
        const thumbImg = document.getElementById("heroThumb");
        const thumbLink = document.getElementById("heroThumbLink");

        if (thumbImg) {
            thumbImg.src = thumbPath;
            thumbImg.alt = `${game.title} thumbnail`;
        }

        // -----------------------------
        // Fix: prevent thumbnail link navigation
        // Thumbnail click must open the YT video, not reload the page
        // -----------------------------
        if (thumbLink) {
            thumbLink.removeAttribute("href");

            thumbLink.addEventListener("click", (e) => {
                e.preventDefault();
                activateVideo(game.youtube);
            });
        }

        // -----------------------------
        // Watch on YouTube button
        // -----------------------------
        const ytBtn = document.getElementById("watchOnYouTube");
        if (ytBtn) {
            ytBtn.addEventListener("click", () => {
                window.open(game.youtube, "_blank");
            });
        }

        // -----------------------------
        // View Manual
        // -----------------------------
        const manualBtn = document.getElementById("viewManual");
        if (manualBtn) {
            if (game.manual) {
                manualBtn.addEventListener("click", () => {
                    window.open(game.manual, "_blank");
                });
            } else {
                manualBtn.classList.add("disabled");
            }
        }

        // -----------------------------
        // Load Disk/Tape Button
        // -----------------------------
        const loadBtn = document.getElementById("loadDiskTape");
        if (loadBtn) {
            if (game.download) {
                loadBtn.addEventListener("click", () => {
                    window.open(game.download, "_blank");
                });
            } else {
                loadBtn.classList.add("disabled");
            }
        }

        // -----------------------------
        // YouTube embed activation
        // -----------------------------
        function activateVideo(url) {
            const container = document.getElementById("gameVideoContainer");
            if (!container) return;

            const embedUrl = convertToEmbed(url);
            container.innerHTML = `
                <iframe 
                    width="100%" 
                    height="500" 
                    src="${embedUrl}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>`;
        }

        // -----------------------------
        // Turns normal YT link into embed link
        // -----------------------------
        function convertToEmbed(url) {
            if (!url) return "";
            if (url.includes("watch?v=")) {
                return url.replace("watch?v=", "embed/");
            }
            return url;
        }

        // -----------------------------
        // Related games section
        // -----------------------------
        const relatedContainer = document.getElementById("relatedGames");

        if (relatedContainer) {
            const sameDeveloper = games.filter(g =>
                g.developer === game.developer &&
                g.id !== game.id
            );

            let html = "";

            sameDeveloper.forEach(g => {
                html += `
                    <a class="related-game-card" href="game.html?id=${g.id}">
                        <img src="../resources/images/thumbnails/all/${g.thumbnail}" alt="${g.title}">
                        <div class="related-title">${g.title}</div>
                    </a>`;
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
