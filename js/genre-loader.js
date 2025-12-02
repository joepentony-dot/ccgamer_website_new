// js/genre-loader.js
// BIT CHIEF — FINAL HOTFIX VERSION 😇🕹️👌
// Compatible with existing Cheeky Neon Layout (uses #game-list)

(() => {

    const GAMES_JSON_URL =
        "https://raw.githubusercontent.com/joepentony-dot/ccgamer_website_new/main/games/games.json";

    const FALLBACK_THUMB =
        "../../resources/images/genres/miscellaneous.png";

    async function loadGames() {
        const genre = (document.body.dataset.genre || "").trim().toLowerCase();
        const listEl = document.getElementById("game-list");

        if (!listEl) {
            console.error("BIT CHIEF ERROR: #game-list not found!");
            return;
        }

        listEl.innerHTML = "<div class='loading'>Loading games…</div>";

        try {
            const response = await fetch(GAMES_JSON_URL + "?cache=" + Date.now());
            if (!response.ok) throw new Error("HTTP " + response.status);

            const games = await response.json();

            const filtered = games.filter(game => {
                const g = [];
                if (game.genre) g.push(game.genre);
                if (Array.isArray(game.genres)) g.push(...game.genres);
                return g.map(v => v.toLowerCase()).includes(genre);
            });

            if (filtered.length === 0) {
                listEl.innerHTML =
                    `<p>No games found for <strong>${genre}</strong>.</p>`;
                return;
            }

            listEl.innerHTML = "";

            filtered.forEach(game => {
                const card = document.createElement("div");
                card.classList.add("game-card");

                const thumb = game.thumbnail ? game.thumbnail : FALLBACK_THUMB;

                card.innerHTML = `
                    <div class="game-card-thumb">
                        <img src="${thumb}"
                             alt="${game.title}"
                             onerror="this.onerror=null;this.src='${FALLBACK_THUMB}'">
                    </div>
                    <div class="game-card-title">${game.title}</div>
                `;

                listEl.appendChild(card);
            });

        } catch (err) {
            console.error("BIT CHIEF LOAD ERROR:", err);
            listEl.innerHTML =
                "<p class='error'>Error loading games. Please refresh.</p>";
        }
    }

    document.addEventListener("DOMContentLoaded", loadGames);

})();
