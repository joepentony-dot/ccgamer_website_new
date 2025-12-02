// js/genre-loader.js
// BIT CHIEF — UNIVERSAL GENRE LOADER 😇🕹️👌
// Works with ANY genre naming convention

(() => {

    const GAMES_JSON_URL =
        "https://raw.githubusercontent.com/joepentony-dot/ccgamer_website_new/main/games/games.json";

    const FALLBACK_THUMB =
        "../../resources/images/genres/miscellaneous.png";

    async function loadGames() {
        const rawGenre = (document.body.dataset.genre || "").trim();
        const listEl = document.getElementById("game-list");

        if (!listEl) {
            console.error("BIT CHIEF ERROR: #game-list not found!");
            return;
        }

        listEl.innerHTML = "<div class='loading'>Loading games…</div>";

        try {
            const response = await fetch(GAMES_JSON_URL + "?cache=" + Date.now());
            const games = await response.json();

            // normalize search term
            const search = rawGenre
                .toLowerCase()
                .replace(/-/g, " ")
                .replace(/_/g, " ")
                .trim();

            const filtered = games.filter(game => {
                const fields = [
                    game.genre,
                    ...(Array.isArray(game.genres) ? game.genres : []),
                    game.primary_genre,
                    game.secondary_genre,
                    game.tertiary_genre,
                ].filter(Boolean);

                return fields.some(field =>
                    String(field)
                        .toLowerCase()
                        .replace(/[-_/]/g, " ")
                        .includes(search)
                );
            });

            if (filtered.length === 0) {
                listEl.innerHTML = `<p>No matching games found for: <strong>${rawGenre}</strong></p>`;
                return;
            }

            listEl.innerHTML = "";

            filtered.forEach(game => {
                const card = document.createElement("div");
                card.classList.add("game-card");

                const thumb = game.thumbnail || FALLBACK_THUMB;

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
            console.error(err);
            listEl.innerHTML = "<p>Error loading games.</p>";
        }
    }

    document.addEventListener("DOMContentLoaded", loadGames);

})();
