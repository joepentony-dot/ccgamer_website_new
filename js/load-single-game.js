// =====================================================
// CCG Single Game Loader (Correct Version for your JSON)
// Loads one game based on URL parameter ?id=xxx
// =====================================================

function getGameID() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

async function loadGame() {
    const gameID = getGameID();
    const container = document.getElementById("game-container");

    if (!gameID) {
        container.innerHTML = "<p>Game ID missing.</p>";
        return;
    }

    try {
        const response = await fetch("../games.json"); 
        const games = await response.json();

        // YOUR JSON USES gameid, not id
        const game = games.find(g => String(g.gameid) === String(gameID));

        if (!game) {
            container.innerHTML = "<p>Game not found.</p>";
            return;
        }

        // Build the display
        let html = `<h1>${game.title}</h1>`;

        // System (C64 / AMIGA)
        if (game.system) {
            html += `<p><strong>System:</strong> ${game.system}</p>`;
        }

        // Optional metadata if you add it later
        if (game.year) html += `<p><strong>Year:</strong> ${game.year}</p>`;
        if (game.publisher) html += `<p><strong>Publisher:</strong> ${game.publisher}</p>`;
        if (game.developer) html += `<p><strong>Developer:</strong> ${game.developer}</p>`;

        // Thumbnail (future ready)
        if (game.thumbnail) {
            html += `
                <div>
                    <img src="${game.thumbnail}" alt="${game.title}" style="max-width:300px;">
                </div>
            `;
        }

        // Genres
        if (Array.isArray(game.genres) && game.genres.length > 0) {
            html += `<p><strong>Genres:</strong> `;
            html += game.genres
                .map(g => `<a href="genres/${g.toLowerCase().replace(/ /g, "-")}.html">${g}</a>`)
                .join(", ");
            html += `</p>`;
        }

        // Links
        let hasLinks = false;
        let linksHtml = `<h2>Links</h2><ul>`;

        if (game.lemonLink) {
            hasLinks = true;
            linksHtml += `<li><a href="${game.lemonLink}" target="_blank">Lemon Page</a></li>`;
        }

        if (game.diskLink) {
            hasLinks = true;
            linksHtml += `<li><a href="${game.diskLink}" target="_blank">Download Disk Image</a></li>`;
        }

        if (game.pdfLink) {
            hasLinks = true;
            linksHtml += `<li><a href="${game.pdfLink}" target="_blank">Manual (PDF)</a></li>`;
        }

        if (game.videoLink) {
            hasLinks = true;
            linksHtml += `<li><a href="${game.videoLink}" target="_blank">YouTube Video</a></li>`;
        } else if (game.videoId) {
            hasLinks = true;
            linksHtml += `<li><a href="https://www.youtube.com/watch?v=${game.videoId}" target="_blank">YouTube Video</a></li>`;
        }

        linksHtml += `</ul>`;

        if (hasLinks) html += linksHtml;

        // Back button
        html += `<p><a href="javascript:history.back()">← Back</a></p>`;

        container.innerHTML = html;

    } catch (error) {
        console.error("Error loading game:", error);
        container.innerHTML = "<p>Error loading game data.</p>";
    }
}

document.addEventListener("DOMContentLoaded", loadGame);
