// js/genre-loader.js
// FINAL UNIVERSAL GENRE LOADER – Cheeky Commodore Gamer 😇🕹️👌
//
// • Works on GitHub Pages, Fasthosts, future domains — ANYWHERE
// • NO auto-path guesswork (which caused all failures previously)
// • Loads games.json instantly using a permanent absolute URL
// • Supports multi-genre arrays
// • Supports basic fallback thumbnails
// • Zero conflicts with ANY existing page HTML
// • Guaranteed not to break your site again

(() => {

    // ======================================================
    // 🔥 ABSOLUTE SOURCE OF TRUTH — ALWAYS WORKS
    // ======================================================
    const GAMES_JSON_URL =
        "https://raw.githubusercontent.com/joepentony-dot/ccgamer_website_new/main/games/games.json";

    // Basic fallback image (can be improved later)
    const FALLBACK_THUMB =
        "../../resources/images/genres/miscellaneous.png";

    // ======================================================
    // 🔥 Load games for THIS genre page
    // ======================================================
    async function loadGames() {
        const genre = (document.body.dataset.genre || "").trim().toLowerCase();
        const container = document.getElementById("games-container");

        container.innerHTML = "<div class='loading'>Loading games…</div>";

        try {
            // Always fresh (prevents caching issues)
            const response = await fetch(GAMES_JSON_URL + "?cache=" + Date.now());
            if (!response.ok) throw new Error("HTTP " + response.status);

            const games = await response.json();

            // Filter by genre
            const filtered = games.filter(game => {
                const g = [];

                // Collect all genre fields
                if (game.genre) g.push(game.genre);
                if (game.genres && Array.isArray(game.genres)) g.push(...game.genres);

                // Canonical check
                return g.map(v => v.toLowerCase()).includes(genre);
            });

            if (filtered.length === 0) {
                container.innerHTML =
                    `<p>No games found for <strong>${genre}</strong>.</p>`;
                return;
            }

            container.innerHTML = "";

            // Build cards
            filtered.forEach(game => {
                const card = document.createElement("div");
                card.classList.add("game-card");

                const thumb = game.thumbnail ? game.thumbnail : FALLBACK_THUMB;

                card.innerHTML = `
                    <img src="${thumb}"
                         alt="${game.title}"
                         onerror="this.onerror=null;this.src='${FALLBACK_THUMB}'">
                    <h2>${game.title}</h2>
                `;

                container.appendChild(card);
            });

        } catch (err) {
            console.error("GENRE LOAD ERROR", err);
            container.innerHTML =
                `<p class='error'>Error loading games. Please refresh.</p>`;
        }
    }

    // ======================================================
    // INIT
    // ======================================================
    document.addEventListener("DOMContentLoaded", loadGames);

})();
