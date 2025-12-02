// js/genre-loader.js
// BIT CHIEF — FINAL VERSION (MATCHES YOUR HTML PERFECTLY)

(function () {

    const GAMES_JSON_URL =
        "https://raw.githubusercontent.com/joepentony-dot/ccgamer_website_new/main/games/games.json";

    const FALLBACK_THUMB =
        "../../resources/images/genres/miscellaneous.png";

    // ------------------------------------------------------------
    //  Universal Genre Loader (matches ANY naming style)
    //  Used by your HTML: window.loadGenreGames(genreSlug, grid, count)
    // ------------------------------------------------------------
    window.loadGenreGames = async function (genreSlug, gridEl, countEl) {

        if (!gridEl) {
            console.error("BIT CHIEF ERROR: #genreGamesGrid not found!");
            return;
        }

        gridEl.innerHTML = "<div>Loading games…</div>";
        if (countEl) countEl.textContent = "Loading…";

        try {
            const res = await fetch(GAMES_JSON_URL + "?cache=" + Date.now());
            const data = await res.json();

            // normalise incoming genre
            const search = genreSlug
                .toLowerCase()
                .replace(/[-_]/g, " ")
                .trim();

            // filter games by ANY genre field
            const filtered = data.filter(game => {
                const fields = [
                    game.genre,
                    ...(Array.isArray(game.genres) ? game.genres : []),
                    game.primary_genre,
                    game.secondary_genre,
                    game.tertiary_genre
                ].filter(Boolean);

                return fields.some(f =>
                    String(f)
                        .toLowerCase()
                        .replace(/[-_/]/g, " ")
                        .includes(search)
                );
            });

            if (filtered.length === 0) {
                gridEl.innerHTML = `<div>No games found for <strong>${genreSlug}</strong>.</div>`;
                if (countEl) countEl.textContent = "0 games";
                return;
            }

            // update count
            if (countEl) {
                countEl.textContent = `${filtered.length} titles`;
            }

            // build cards
            gridEl.innerHTML = "";
            filtered.forEach(game => {

                const card = document.createElement("div");
                card.className = "ccg-card";

                const thumb = game.thumbnail || FALLBACK_THUMB;

                card.innerHTML = `
                    <div class="ccg-card-thumb">
                        <img src="${thumb}"
                             alt="${game.title}"
                             onerror="this.onerror=null;this.src='${FALLBACK_THUMB}';">
                    </div>

                    <div class="ccg-card-title">${game.title}</div>
                `;

                gridEl.appendChild(card);
            });

        } catch (err) {
            console.error("BIT CHIEF LOAD ERROR:", err);
            gridEl.innerHTML = "<div>Error loading games.</div>";
            if (countEl) countEl.textContent = "Error";
        }
    };

})();
