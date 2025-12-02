// js/genre-loader.js
// BIT CHIEF — FINAL ABSOLUTE VERSION 😇🕹️👌
// Works with your neon HTML, your grid ID, your count tag, your thumbnail paths.

(function () {

    // ============================================================
    //  MASTER JSON SOURCE (always works: GitHub Pages + Fasthosts)
    // ============================================================
    const GAMES_JSON_URL =
        "https://raw.githubusercontent.com/joepentony-dot/ccgamer_website_new/main/games/games.json";

    // Fallback thumbnail for missing images
    const FALLBACK_THUMB =
        "../../resources/images/genres/miscellaneous.png";

    // ============================================================
    //  UNIVERSAL GENRE LOADER
    //  Called by HTML:  window.loadGenreGames(genreSlug, gridEl, countEl)
    // ============================================================
    window.loadGenreGames = async function (genreSlug, gridEl, countEl) {

        if (!gridEl) {
            console.error("BIT CHIEF ERROR: #genreGamesGrid not found!");
            return;
        }

        gridEl.innerHTML = "<div>Loading games…</div>";
        if (countEl) countEl.textContent = "Loading…";

        try {
            // Always fetch fresh data
            const res = await fetch(GAMES_JSON_URL + "?cache=" + Date.now());
            const data = await res.json();

            // Normalise genre incoming from HTML
            const search = genreSlug
                .toLowerCase()
                .replace(/[-_]/g, " ")
                .trim();

            // Filter by ANY genre field found in JSON
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

            // Nothing found
            if (filtered.length === 0) {
                gridEl.innerHTML =
                    `<div>No games found for <strong>${genreSlug}</strong>.</div>`;
                if (countEl) countEl.textContent = "0 titles";
                return;
            }

            // Update count
            if (countEl) {
                countEl.textContent = `${filtered.length} titles`;
            }

            // ============================================================
            //  BUILD GAME CARDS (MATCHES YOUR NEON DESIGN)
            // ============================================================
            gridEl.innerHTML = "";

            filtered.forEach(game => {
                const card = document.createElement("div");
                card.className = "ccg-card";

                // FIXED THUMBNAIL PATH (FULL PATH BUILT HERE)
                const thumb = game.thumbnail
                    ? `../../resources/images/thumbnails/all/${game.thumbnail}`
                    : FALLBACK_THUMB;

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
