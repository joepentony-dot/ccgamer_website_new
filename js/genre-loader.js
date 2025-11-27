// Detect genre name from <h1>Genre Name</h1>
function detectGenre() {
    const header = document.querySelector("h1");
    if (!header) return "";
    return header.textContent.replace(" Games", "").trim();
}

// Load all games and filter by genre
async function loadGenreGames() {
    try {
        const response = await fetch('../../games.json');
        const games = await response.json();

        const genreName = detectGenre();
        const container = document.getElementById('game-list') || document.querySelector('main section');

        if (!genreName || !container) return;

        const filtered = games.filter(game =>
            game.genres.some(g => g.toLowerCase() === genreName.toLowerCase())
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
    }
}

document.addEventListener('DOMContentLoaded', loadGenreGames);
