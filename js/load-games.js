// =====================================================
// CCG GLOBAL GAME DATA LOADER (Safe & Stable Version)
// Loads games from a SINGLE source no matter the page
// =====================================================

// MASTER JSON FEED (local GitHub version for now)
const GAMES_JSON_URL = "https://joepentony-dot.github.io/ccgamer_website_new/games.json";

// Auto-detect which page we are on
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    if (path.includes("game.html")) {
        loadSingleGame();
    }
    if (path.includes("complete-index.html")) {
        loadCompleteIndex();
    }
    if (path.includes("genres")) {
        loadGenrePage();
    }
});

// =====================================================
// LOAD ALL GAMES (for complete index)
// =====================================================
async function loadCompleteIndex() {
    const container = document.getElementById("complete-results");

    try {
        const response = await fetch(GAMES_JSON_URL);
        const games = await response.json();

        // Sort alphabetically
        games.sort((a, b) => a.title.localeCompare(b.title));

        container.innerHTML = "";

        games.forEach(game => {
            const item = document.createElement("div");

            const link = document.createElement("a");
            link.href = `games/game.html?id=${encodeURIComponent(game.id)}`;
            link.textContent = game.title;

            item.appendChild(link);

            if (game.year) {
                const yearSpan = document.createElement("span");
                yearSpan.textContent = ` (${game.year})`;
                item.appendChild(yearSpan);
            }

            container.appendChild(item);
        });
    }
    catch (err) {
        console.error("Error loading complete index:", err);
        container.innerHTML = "<p>Error loading games.</p>";
    }
}

// =====================================================
// LOAD SINGLE GAME PAGE
// =====================================================
async function loadSingleGame() {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    const container = document.getElementById("game-content");

    try {
        const response = await fetch(GAMES_JSON_URL);
        const games = await response.json();

        const game = games.find(g => g.id === gameId);

        if (!game) {
            container.innerHTML = "<p>Game not found.</p>";
            return;
        }

        container.innerHTML = `
            <div class="game-header">
                <img class="game-thumb" src="${game.thumbnail}" alt="${game.title}">
                <div class="game-info">
                    <h1>${game.title}</h1>
                    <p><strong>Year:</strong> ${game.year || "Unknown"}</p>
                    <p><strong>Developer:</strong> ${game.developer || "Unknown"}</p>
                    <p><strong>Composer:</strong> ${game.composer || "Unknown"}</p>
                </div>
            </div>

            <div class="links-section">
                <h2>Downloads & Extras</h2>

                ${game.pdf ? `<a href="${game.pdf}" target="_blank">📘 Download Manual (PDF)</a>` : ``}
                ${game.disklink ? `<a href="${game.disklink}" target="_blank">💾 Download Game Disk</a>` : ``}
                ${game.lemonlink ? `<a href="${game.lemonlink}" target="_blank">🍋 View on Lemon64</a>` : ``}
            </div>
        `;
    }
    catch (err) {
        container.innerHTML = "<p>Error loading game details.</p>";
        console.error(err);
    }
}

// =====================================================
// LOAD GENRE PAGES
// =====================================================
async function loadGenrePage() {
    const container = document.getElementById("genre-results");
    const header = document.querySelector("header h1");

    if (!container || !header) return;

    const genreName = header.textContent.trim();

    try {
        const response = await fetch(GAMES_JSON_URL);
        const games = await response.json();

        const filtered = games.filter(g => 
            g.genres && g.genres.includes(genreName)
        );

        if (filtered.length === 0) {
            container.innerHTML = "<p>No games found in this genre.</p>";
            return;
        }

        filtered.forEach(game => {
            const item = document.createElement("div");

            const link = document.createElement("a");
            link.href = `../game.html?id=${encodeURIComponent(game.id)}`;
            link.textContent = game.title;

            item.appendChild(link);
            container.appendChild(item);
        });
    }
    catch (err) {
        container.innerHTML = "<p>Could not load genre games.</p>";
        console.error(err);
    }
}
