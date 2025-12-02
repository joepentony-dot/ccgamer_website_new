/* ============================================================
   CCG — ULTIMATE GENRE LOADER (Option A — Ultra Fast Edition)
   Loads /games/games.json and filters by <body data-genre="">
   Fully compatible with GitHub Pages & Fasthosts.
   No styling, no animations — CSS can be added later.
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const genreSlug = document.body.getAttribute("data-genre");
    const gamesCountEl = document.getElementById("genreGamesCount");
    const gamesGridEl = document.getElementById("genreGamesGrid");

    if (!genreSlug) {
        console.error("❌ No data-genre found on body.");
        return;
    }

    const gamesJsonUrl = "../../games/games.json";

    fetch(gamesJsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to load games.json");
            }
            return response.json();
        })
        .then(allGames => {

            // filter games whose genre matches the page slug
            const filteredGames = allGames.filter(game => {
                if (!game.genres || !Array.isArray(game.genres)) return false;

                // normalise slugs
                const cleanGenres = game.genres.map(g =>
                    g.trim().toLowerCase().replace(/\s+/g, "-")
                );

                return cleanGenres.includes(genreSlug.trim().toLowerCase());
            });

            // update count
            gamesCountEl.textContent = filteredGames.length + " games found";

            // inject cards
            gamesGridEl.innerHTML = filteredGames
                .map(game => {
                    const thumb = game.thumbnail
                        ? "../../resources/images/thumbnails/all/" + game.thumbnail
                        : "../../resources/images/thumbnails/all/_fallback.jpg";

                    return `
                        <a class="genre-game-card" href="../game.html?id=${encodeURIComponent(game.id)}">
                            <img src="${thumb}" alt="${game.title}" onerror="this.src='../../resources/images/thumbnails/all/_fallback.jpg'">
                            <div class="genre-game-title">${game.title}</div>
                        </a>
                    `;
                })
                .join("");
        })
        .catch(err => {
            console.error("❌ Genre Loader Error:", err);
            gamesCountEl.textContent = "Failed to load games.";
            gamesGridEl.innerHTML = "<p>Error loading games.</p>";
        });
});
