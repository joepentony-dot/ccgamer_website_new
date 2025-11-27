async function loadGenre() {
    const params = new URLSearchParams(window.location.search);
    const genreName = params.get("genre");

    const container = document.getElementById("genre-list");

    if (!genreName) {
        container.innerHTML = "<p>No genre specified.</p>";
        return;
    }

    try {
        // IMPORTANT: games.json is in the ROOT of the repo
        const res = await fetch("../games.json");
        const games = await res.json();

        // Normalise compare
        const filtered = games.filter(g =>
            g.genre?.toLowerCase() === genreName.toLowerCase()
        );

        if (filtered.length === 0) {
            container.innerHTML = "<p>No games found in this genre.</p>";
            return;
        }

        container.innerHTML = filtered.map(game => `
            <div class="game-card">
                <a href="game.html?id=${game.id}">
                    <img src="${game.thumbnail}">
                </a>
                <h3>${game.title}</h3>
            </div>
        `).join("");

    } catch (err) {
        console.error("Genre load error:", err);
        container.innerHTML = "<p>Error loading games.</p>";
    }
}

loadGenre();
