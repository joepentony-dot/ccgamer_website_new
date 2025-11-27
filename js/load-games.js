/* ==========================================================
   CHEEKY COMMODORE GAMER — load-games.js
   Full safe replacement
   Handles:
   - Loading games/games.json
   - Filtering by genre or collection
   - Building clickable thumbnail cards
   - Status messages
   ========================================================== */

/* --------------------------
   1. Fetch the full games list
   -------------------------- */

async function ccgFetchGames() {
    try {
        // NOTE: this file lives in /js/, pages that use it live in /games/genres/ and /games/collections/
        // games.json is at /games/games.json → relative path from those pages is "../games.json"
        const response = await fetch("../games.json");

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const data = await response.json();
        return data.games || data; // supports both { games: [...] } and plain [...]
    } catch (err) {
        console.error("Error loading games:", err);
        return null;
    }
}

/* --------------------------
   2. Card builder (16:9 thumbnails)
   -------------------------- */

function createGameCard(game) {
    const card = document.createElement("div");
    card.className = "ccg-game-card";
    card.onclick = () => location.href = game.page;

    const img = document.createElement("img");
    img.className = "ccg-game-thumb";
    img.src = game.thumbnail;
    img.alt = game.title;
    img.loading = "lazy";

    card.appendChild(img);
    return card;
}

/* --------------------------
   3. Main loader
   -------------------------- */

async function loadGames() {
    const statusEl = document.getElementById("genre-status");
    const listEl = document.getElementById("genre-games-list");

    if (!statusEl || !listEl) {
        console.warn("Not a genre/collection page — loadGames aborted.");
        return;
    }

    statusEl.textContent = "Loading games…";

    const allGames = await ccgFetchGames();

    if (!allGames) {
        statusEl.textContent = "Error loading game data.";
        return;
    }

    const body = document.body;

    let filterType = null;
    let filterValue = null;

    if (body.dataset.genre) {
        filterType = "genre";
        filterValue = body.dataset.genre.trim();
    }

    if (body.dataset.collection) {
        filterType = "collection";
        filterValue = body.dataset.collection.trim();
    }

    let filtered = [];

    if (filterType === "genre") {
        filtered = allGames.filter(g => g.genre && g.genre.trim() === filterValue);
    } else if (filterType === "collection") {
        filtered = allGames.filter(g =>
            g.collection &&
            g.collection.toLowerCase().includes(filterValue.toLowerCase())
        );
    } else {
        statusEl.textContent = "No filter applied.";
        return;
    }

    if (filtered.length === 0) {
        statusEl.textContent = "No games found in this category.";
        return;
    }

    statusEl.textContent = "";
    listEl.innerHTML = "";

    filtered.forEach(game => {
        const card = createGameCard(game);
        listEl.appendChild(card);
    });
}

/* Auto-run when page loads */
document.addEventListener("DOMContentLoaded", loadGames);
