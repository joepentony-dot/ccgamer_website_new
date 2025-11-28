async function loadCompleteIndex() {
    // Correct path to the games.json file based on your file structure
    const response = await fetch('games/games.json');
    const games = await response.json();  // Convert the JSON data

    const container = document.getElementById('complete-results');
    container.innerHTML = '';  // Clear the "loading" message

    // Loop through each game and create a card with title and thumbnail
    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';

        const link = document.createElement('a');
        link.href = `games/game.html?id=${game.id}`;  // Link to the individual game page
        link.textContent = game.title;  // Use the correct title property

        const img = document.createElement('img');
        img.src = game.thumblink;  // Fetch thumbnail URL from the game data
        img.alt = game.title;  // Use the game title for the alt text

        card.appendChild(link);
        card.appendChild(img);
        container.appendChild(card);
    });
}

// Call the function to load the complete game index
loadCompleteIndex();
