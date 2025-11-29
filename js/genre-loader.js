/* ================================================================
   CHEEKY COMMODORE GAMER - UNIVERSAL GENRE/COLLECTION LOADER
   Updated for LOCAL thumbnails (Phase 4)
================================================================ */

async function loadGenrePage() {
    const container = document.getElementById("genre-results");
    const titleElement = document.querySelector("header h1");
    const genreName = titleElement ? titleElement.textContent.trim() : "";

    try {
        const response = await fetch("../games/games.json");
        const games = await response.json();

        // Match games by folder name or by genre array
        const matches = games.filter(game => {
            if (!game.genres) return false;
            return game.genres.includes(genreName);
        });

        container.innerHTML = "";

        if (matches.length === 0) {
            container.innerHTML = `<p>No games found for <strong>${genreName}</strong>.</p>`;
            return;
        }

        matches.forEach(game => {
            const card = document.createElement("div");
            card.className = "game-card";

            const link = document.createElement("a");
            link.href = `../game.html?id=${encodeURIComponent(game.id)}`;

            const img = document.createElement("img");
            img.src = "../" + game.thumbnail;
            img.alt = game.title;

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
