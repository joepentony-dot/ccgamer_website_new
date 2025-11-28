// =====================================================
// CCG Single Game Loader
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
        const response = await fetch("games.json");
        const games = await response.json();

        const game = games.find(g => String(g.id) === String(gameID));

        if (!game) {
            container.innerHTML = "<p>Game not found.</p>";
            return;
        }

        // Build the display
        let html = `
            <h1>${game.title}</h1>
            <p><strong>Year:</strong> ${game.year || "Unknown"}</p>
            <p><strong>Publisher:</strong> ${game.publisher || "Unknown"}</p>
            <p><strong>Developer:</strong> ${game.developer || "Unknown"}</p>
        `;

        // Thumbnail image (if exists)
        if (game.thumbnail) {
            html += `
                <div>
                    <img src="${game.thumbnail}" alt="${game.title} thumbnail" style="max-width:300px;">
                </div>
            `;
        }

        // Genres
        if (Array.isArray(game.genres)) {
            html += `<p><strong>Genres:</strong> `;
            html += game.genres
                .map(g => `<a href="genres/${g.toLowerCase().replace(/ /g, "-")}.html">${g}</a>`)
                .join(", ");
            html += `</p>`;
        }

        // Links
        html += `<h2>Links</h2><ul>`;

        if (game.lemon64) {
            html += `<li><a href="${game.lemon64}" target="_blank">Lemon64 Page</a></li>`;
        }

        if (game.disk) {
            html += `<li><a href="${game.disk}" download>Download Disk Image</a></li>`;
        }

        if (game.pdf) {
            html += `<li><a href="${game.pdf}" target="_blank">Manual</a></li>`;
        }

        if (game.video) {
            html += `<li><a href="${game.video}" target="_blank">YouTube Video</a></li>`;
        }

        html += `</ul>`;

        // Back link
        html += `<p><a href="javascript:history.back()">← Back</a></p>`;

        container.innerHTML = html;

    } catch (err) {
        console.error("Error loading game:", err);
        container.innerHTML = "<p>Error loading game data.</p>";
    }
}

document.addEventListener("DOMContentLoaded", loadGame);
