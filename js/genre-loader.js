// ============================================
// CCG Genre Loader (Array-Compatible Version)
// Supports: "genres": ["Arcade Games", "BPJS Games", ...]
// ============================================

// Convert "arcade-games" → "Arcade Games"
function formatGenreName(slug) {
    return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Detect genre from filename
function detectGenreFromFilename() {
    const path = window.location.pathname;
    const filename = path.split("/").pop().replace(".html", "");
    return formatGenreName(filename);
}

// Normalise strings: remove spaces/punctuation, lowercase
function normalise(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Load and filter games
async function loadGenreGames() {
    const genreName = detectGenreFromFilename();  // e.g., Arcade Games
    const normGenre = normalise(genreName);       // e.g., arcadegames

    const container = document.getElementById("genre-results");
    const title = document.getElementById("genre-title");

    // Update page header
    if (title) title.textContent = genreName;

    try {
        const response = await fetch("../../games.json");
        const games = await response.json();

        // Important: each game has an ARRAY of genres
        const filtered = games.filter(game => {
            if (!Array.isArray(game.genres)) return false;

            return game.genres.some(g => normalise(g) === normGenre);
        });

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
