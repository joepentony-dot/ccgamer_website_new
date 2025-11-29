/* ================================================================
   CHEEKY COMMODORE GAMER - UNIVERSAL GENRE/COLLECTION LOADER
   FINAL FIXED VERSION — THUMBNAILS NOW WORK 100%
   ---------------------------------------------------------------
   This script loads games for ANY genre or collection page by
   reading the page's <h1> title and matching "genres" from JSON.
   Thumbnails now use absolute paths so they ALWAYS load.
================================================================ */

async function loadGenrePage() {
    const container = document.getElementById("genre-results");
    const titleElement = document.querySelector("header h1");
    const genreName = titleElement ? titleElement.textContent.trim() : "";

    try {
        // Load the JSON file
        const response = await fetch("/games/games.json");
        const games = await response.json();

        // Match games by their "genres" field
        const matches = games.filter(game => {
            if (!game.genres) return false;
            return game.genres.includes(genreName);
        });

        container.innerHTML = "";

        if (matches.length === 0) {
            container.innerHTML = `<p>No games found for <strong>${genreName}</strong>.</p>`;
            return;
        }

        // Render each game
        matches.forEach(game => {
            const card = document.createElement("div");
            card.className = "game-card";

            // Link to single-game page
            const link = document.createElement("a");
            link.href = `/games/game.html?id=${encodeURIComponent(game.id)}`;

            // Thumbnail image (ABSOLUTE PATH!)
            const img = document.createElement("img");
            img.src = "/" + game.thumbnail;   // <--- FIXED!
            img.alt = game.title;
            img.loading = "lazy";

            // Game title text
            const title = document.createElement("div");
            title.className = "game-card-title";
            title.textContent = game.title;

            link.appendChild(img);
            link.appendChild(title);
            card.appendChild(link);

            container.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading genre page:", err);
        container.innerHTML = `<p>Error loading games.</p>`;
    }
}

document.addEventListener("DOMContentLoaded", loadGenrePage);
