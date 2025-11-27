// Clean genre names (remove weird spacing)
function normalize(str) {
    return str
        .toLowerCase()
        .replace(/\s+/g, " ")        // collapse spaces
        .replace(/\u00A0/g, " ")     // remove non-breaking spaces
        .trim();
}

// Detect genre name from <h1>
function detectGenre() {
    const header = document.querySelector("h1");
    if (!header) return "";
    return normalize(header.textContent);
}

// Load games and filter by genre
async function loadGenreGames() {
    try {
        const response = await fetch('../../games.json');
        const games = await response.json();

        const genreName = detectGenre();
        const container = document.getElementById('game-list');

        if (!genreName || !container) return;

        const filtered = games.filter(game =>
            game.genres.some(g => normalize(g) === genreName)
        );

        if (filtered.length === 0) {
            container.innerHTML = `<p>No games found in ${genreName}.</p>`;
            return;
        }

        container.innerHTML = "";

        filtered
            .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle))
            .forEach(game => {
                const item = document.createElement('div');
                item.innerHTML = `
                    <p><a href="../game.html?game=${game.gameid}">${game.title}</a></p>
                `;
                container.appendChild(item);
            });

    } catch (error) {
        console.error("Error loading genre games:", error);
        const container = document.getElementById('game-list');
        if (container) container.innerHTML = "<p>Error loading genre data.</p>";
    }
}

document.addEventListener('DOMContentLoaded', loadGenreGames);
