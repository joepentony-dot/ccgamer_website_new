// =========================================
// UNIVERSAL GENRE LOADER FOR ALL GENRE PAGES
// =========================================

async function loadGenrePage(targetGenre) {
    const container = document.getElementById("genre-list");

    try {
        const response = await fetch("../games.json");
        const data = await response.json();

        // Filter where ANY item in genres[] matches the target
        const filtered = data.filter(game =>
            Array.isArray(game.genres) &&
            game.genres.includes(targetGenre)
        );

        if (filtered.length === 0) {
            container.textContent = "No games found in this genre.";
            return;
        }

        container.innerHTML = "";
        filtered.forEach(game => {
            const div = document.createElement("div");
            div.textContent = game.title;
            container.appendChild(div);
        });

    } catch (err) {
        console.error("Genre load failed:", err);
        container.textContent = "Error loading genre.";
    }
}
