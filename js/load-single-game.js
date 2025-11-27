function getGameId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("game");
}

async function loadGameDetails() {
    try {
        const response = await fetch('../games.json');
        const games = await response.json();

        const id = getGameId();
        const game = games.find(g => g.gameid === id);

        const title = document.getElementById("game-title");
        const container = document.getElementById("game-details");

        if (!game) {
            title.textContent = "Game Not Found";
            container.innerHTML = "<p>This game does not exist in the database.</p>";
            return;
        }

        title.textContent = game.title;

        container.innerHTML = `
            <p><strong>System:</strong> ${game.system}</p>
            <p><strong>Genres:</strong> ${game.genres.join(', ')}</p>
            <p><strong>YouTube:</strong> ${
                game.videoId ? `<a href="https://www.youtube.com/watch?v=${game.videoId}" target="_blank">Watch Video</a>` : "No video available"
            }</p>
            <p><strong>Lemon Link:</strong> ${
                game.lemonLink ? `<a href="${game.lemonLink}" target="_blank">Lemon64</a>` : "None"
            }</p>
            <p><strong>Download:</strong> ${
                game.diskLink ? `<a href="${game.diskLink}" target="_blank">Disk Image</a>` : "None"
            }</p>
        `;
    } catch (error) {
        console.error("Error loading game:", error);
    }
}

document.addEventListener('DOMContentLoaded', loadGameDetails);
