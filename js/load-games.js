// Load the full games.json and populate #game-list
async function loadAllGames() {
    try {
        const response = await fetch('../games.json');
        const games = await response.json();

        const container = document.getElementById('game-list');
        if (!container) return;

        if (games.length === 0) {
            container.innerHTML = "<p>No games found.</p>";
            return;
        }

        container.innerHTML = "";

        games
            .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle))
            .forEach(game => {
                const item = document.createElement('div');
                item.innerHTML = `
                    <p><a href="game.html?game=${game.gameid}">${game.title}</a></p>
                `;
                container.appendChild(item);
            });

    } catch (error) {
        console.error("Error loading games:", error);
        const container = document.getElementById('game-list');
        if (container) container.innerHTML = "<p>Error loading game data.</p>";
    }
}

document.addEventListener('DOMContentLoaded', loadAllGames);
