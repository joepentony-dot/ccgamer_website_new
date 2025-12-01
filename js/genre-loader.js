document.addEventListener("DOMContentLoaded", () => {
    const gameListEl = document.getElementById("game-list");
    const statusEl = document.getElementById("loading-status");

    if (!gameListEl || !statusEl) return;

    // Correct relative path from /games/genres/*.html to /games/games.json
    const jsonURL = "../games.json";

    fetch(jsonURL)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load JSON: " + res.status);
            return res.json();
        })
        .then(data => {
            statusEl.textContent = "Loading complete.";

            const genre = document.body.dataset.genre;
            if (!genre) {
                statusEl.textContent = "Genre not specified.";
                return;
            }

            const filtered = data.filter(game => game.genre === genre);

            if (filtered.length === 0) {
                statusEl.textContent = "No games found for this genre.";
                return;
            }

            statusEl.textContent = "";

            filtered.forEach(game => {
                const card = document.createElement("div");
                card.className = "game-card";

                card.innerHTML = `
                    <img src="../../resources/images/thumbnails/all/${game.thumbnail}" 
                         alt="${game.title}">
                    <h3>${game.title}</h3>
                    <a href="../game.html?id=${game.id}">View Game</a>
                `;

                gameListEl.appendChild(card);
            });
        })
        .catch(err => {
            statusEl.textContent = "Error loading games.";
            console.error("Genre loader error:", err);
        });
});
