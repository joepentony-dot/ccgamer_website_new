// Assuming games data is stored as JSON format (after processing CSV or directly pulling CSV)
async function loadCompleteIndex() {
    const response = await fetch('path_to_your_games_data.json');  // Adjust the path to where the JSON or CSV file is hosted
    const games = await response.json();  // Assuming JSON conversion

    const container = document.getElementById('complete-results');
    container.innerHTML = '';  // Clear the "loading" text

    // Loop through each game and create a card with title and thumbnail
    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';

        const link = document.createElement('a');
        link.href = `games/game.html?id=${game.gameid}`;  // Link to the individual game page
        link.textContent = game.gametitle;  // Game title

        const img = document.createElement('img');
        img.src = game.thumblink;  // Thumbnail image URL from CSV
        img.alt = game.gametitle;  // Game title as alt text

        card.appendChild(link);
        card.appendChild(img);
        container.appendChild(card);
    });
}

// Call the function to load the complete game index
loadCompleteIndex();
