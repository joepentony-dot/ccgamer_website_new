/* ================================================================
   CCG — SINGLE GAME LOADER (PHASE 7B FUNCTIONAL EDITION)
   CLEAN, FUTURE-PROOF, ZERO AESTHETIC LOCK-IN
================================================================ */

async function loadSingleGame() {
    const container = document.getElementById("game-container");
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        container.innerHTML = "<p>No game selected.</p>";
        return;
    }

    try {
        // Supports GitHub Pages AND future Fasthosts domain
        const response = await fetch("../games.json");
        const games = await response.json();

        const game = games.find(g =>
            g.id?.toString() === gameId ||
            g.gameid?.toString() === gameId
        );

        if (!game) {
            container.innerHTML = "<p>Game not found.</p>";
            return;
        }

        // Build metadata
        const dev = game.developer || "Unknown";
        const year = game.year || "Unknown";
        const genres = Array.isArray(game.genres) ? game.genres : [];
        const thumb = game.thumbnail ? `../${game.thumbnail}` : "";
        const pdf = game.pdf || null;
        const downloads = game.disk || [];
        const videoId = game.videoid || null;
        const lemonList = game.lemon || [];

        // ========== MAIN PAGE STRUCTURE ==========
        container.innerHTML = `
            <div class="game-header">
                <img class="game-thumbnail"
                     src="${thumb}"
                     alt="${game.title}"
                     loading="lazy">

                <div class="game-meta">
                    <h1>${game.title}</h1>

                    <p><strong>Developer:</strong> ${dev}</p>
                    <p><strong>Year:</strong> ${year}</p>

                    ${renderGenres(genres)}
                    ${renderLemonLinks(lemonList)}
                </div>
            </div>

            ${renderVideo(videoId)}
            ${renderPDF(pdf)}
            ${renderDownloads(downloads)}

            <hr>

            <a class="back-button" href="../complete-index.html">← Back to Index</a>
        `;

    } catch (err) {
        container.innerHTML = "<p>Error loading game data.</p>";
        console.error(err);
    }
}

/* ================================================================
   HELPERS
================================================================ */

// Genre list
function renderGenres(list) {
    if (!list || !list.length) return "";
    return `
        <p><strong>Genres:</strong></p>
        <ul>
            ${list
                .map(genre =>
                    `<li><a href="./genres/${genre.toLowerCase().replace(/ /g, "-")}.html">${genre}</a></li>`
                )
                .join("")}
        </ul>
    `;
}

// Lemon64 / LemonAmiga links
function renderLemonLinks(list) {
    if (!Array.isArray(list) || !list.length) return "";
    return `
        <p><strong>Game Info:</strong></p>
        <ul>
            ${list.map(url => `<li><a href="${url}" target="_blank">Open Info Page</a></li>`).join("")}
        </ul>
    `;
}

// YouTube embed
function renderVideo(id) {
    if (!id) return "";
    return `
        <div class="video-section">
            <h2>Gameplay Video</h2>
            <iframe
                src="https://www.youtube.com/embed/${id}"
                loading="lazy"
                allowfullscreen>
            </iframe>
        </div>
    `;
}

// PDF Manual
function renderPDF(url) {
    if (!url) return "";
    return `
        <div class="pdf-section">
            <h2>Manual</h2>
            <a class="pdf-button" href="${url}" target="_blank">📘 Open PDF Manual</a>
        </div>
    `;
}

// Disk / Tape / CRT downloads
function renderDownloads(list) {
    if (!Array.isArray(list) || !list.length) return "";
    return `
        <div class="downloads-section">
            <h2>Downloads</h2>
            <ul>
                ${list
                    .map(url => `<li><a href="${url}" target="_blank">💾 Download File</a></li>`)
                    .join("")}
            </ul>
        </div>
    `;
}

document.addEventListener("DOMContentLoaded", loadSingleGame);
