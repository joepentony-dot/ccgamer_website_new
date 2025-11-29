/* ================================================================
   CCG — SINGLE GAME LOADER (FINAL VERSION)
   Loads full game info from games.json into game.html
   Now 100% compatible with LOCAL THUMBNAILS + future domains
================================================================ */

async function loadSingleGame() {
    const container = document.getElementById("game-container");
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        container.innerHTML = "<p>Game not found.</p>";
        return;
    }

    try {
        // Absolute path ensures future Fasthosts hosting works perfectly
        const response = await fetch("/games/games.json");
        const games = await response.json();

        const game = games.find(g =>
            g.id?.toString() === gameId ||
            g.gameid?.toString() === gameId
        );

        if (!game) {
            container.innerHTML = "<p>Game not found.</p>";
            return;
        }

        // Build HTML
        container.innerHTML = `
            <h1 class="game-title">${game.title}</h1>

            <div class="game-top-section">

                <!-- Thumbnail -->
                <img class="game-thumbnail"
                     src="/${game.thumbnail}"
                     alt="${game.title}"
                     loading="lazy">

                <div class="game-meta">
                    <p><strong>Year:</strong> ${game.year || "Unknown"}</p>
                    <p><strong>Developer:</strong> ${game.developer || "Unknown"}</p>

                    ${renderGenres(game.genres)}
                    ${renderLemonLinks(game.lemon)}
                </div>
            </div>

            <hr>

            <!-- Video -->
            ${renderVideo(game.videoid)}

            <!-- PDF Manual -->
            ${renderPDF(game.pdf)}

            <!-- Disk Downloads -->
            ${renderDiskLinks(game.disk)}

            <hr>

            <a class="back-button" href="/complete-index.html">← Back to Index</a>
        `;

    } catch (err) {
        console.error("Error loading game:", err);
        container.innerHTML = "<p>Error loading game data.</p>";
    }
}

/* ================================================================
   HELPERS
================================================================ */

function renderGenres(genres) {
    if (!genres || !genres.length) return "";

    return `
        <p><strong>Genres:</strong><br>${genres.join(", ")}</p>
    `;
}

function renderLemonLinks(lemonList) {
    if (!lemonList || !lemonList.length) return "";

    return `
        <p><strong>Lemon Links:</strong></p>
        <ul>
            ${lemonList.map(url => `<li><a href="${url}" target="_blank">Open on Lemon64</a></li>`).join("")}
        </ul>
    `;
}

function renderPDF(pdfUrl) {
    if (!pdfUrl) return "";

    return `
        <h2>Manual (PDF)</h2>
        <a class="pdf-button" href="${pdfUrl}" target="_blank">📘 Open PDF Manual</a>
    `;
}

function renderDiskLinks(disks) {
    if (!disks || !disks.length) return "";

    return `
        <h2>Game Files</h2>
        <ul class="disk-list">
            ${disks.map(d => `<li><a href="${d}" target="_blank">💾 Download Disk</a></li>`).join("")}
        </ul>
    `;
}

function renderVideo(videoId) {
    if (!videoId) return "";

    return `
        <h2>Gameplay Video</h2>
        <div class="video-wrapper">
            <iframe 
                src="https://www.youtube.com/embed/${videoId}"
                allowfullscreen>
            </iframe>
        </div>
    `;
}

document.addEventListener("DOMContentLoaded", loadSingleGame);
