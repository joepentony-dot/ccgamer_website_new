// ===============================
// CCG Genre Loader (Clean Version)
// Detects genre name from filename
// Loads games.json and filters by genre
// ===============================

// Convert "arcade-games" → "Arcade Games"
function formatGenreName(slug) {
    return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Detect genre from the filename of the current page
function detectGenreFromFilename() {
    const path = window.location.pathname;
    const filename = path.split("/").pop().replace(".html", "");
    return formatGenreName(filename);
}

// Load all games and filter by the detected genre
async function loadGenreGames() {
    const genreName = detectGenreFromFilename();
    const container = document.getElementById("genre-results");
    const title = document.getElementById("genre-title");

    // Update page <h1>
    if (title) title.textContent = genreName;

    try {
        const response = await fetch("../../games.json");
        const games = await response.json();

        const filtered = games.filter(g => g.genre === genreName);

        if (filtered.length === 0) {
            container.innerHTML = `<p>No games found in ${genreName}.</p>`;
            return;
        }

        container.innerHTML = "";

        filtered.forEach(game => {
            const div = document.createElement("div");
            div.textContent = game.title;
            container.appendChild(div);
        });

    } catch (err) {
        console.error("Error loading games:", err);
        container.innerHTML = `<p>Error loading game data.</p>`;
    }
}

document.addEventListener("DOMContentLoaded", loadGenreGames);
