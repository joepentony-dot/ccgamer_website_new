/* ================================================================
   CHEEKY COMMODORE GAMER - GENRE LOADER (FINAL VERSION)
================================================================ */

async function loadGenrePage() {
    const container = document.getElementById("genre-results");
    const titleElement = document.querySelector("header h1");
    const genreName = titleElement ? titleElement.textContent.trim() : "";

    try {
        const response = await fetch("../games.json");
        const games = await response.json();

        const matches = games.filter(game =>
            game.genres && game.genres.includes(genreName)
        );

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
            img.src = "../../" + game.thumbnail; // UPDATED!
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
        console.error("Genre loader error:", err);
        container.innerHTML = "<p>Error loading games.</p>";
    }
}

document.addEventListener("DOMContentLoaded", loadGenrePage);
