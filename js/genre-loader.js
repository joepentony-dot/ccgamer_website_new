// js/genre-loader.js
// BIT CHIEF — FINAL WORKING VERSION 😇🕹️👌
// Uses correct JSON thumbnail paths (Option B)

(function () {

    // ============================================================
    //  MASTER JSON SOURCE
    // ============================================================
    const GAMES_JSON_URL =
        "https://raw.githubusercontent.com/joepentony-dot/ccgamer_website_new/main/games/games.json";

    // Fallback thumbnail
    const FALLBACK_THUMB =
        "/ccgamer_website_new/resources/images/thumbnails/all/_no_thumbnail.png";

    // ============================================================
    //  UNIVERSAL GENRE LOADER
    // ============================================================
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

            // Normalise slug
            const search = genreSlug
                .toLowerCase()
                .replace(/[-_]/g, " ")
                .trim();

            // Filter games by ANY genre field
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
                gridEl.innerHTML =
                    `<div>No games found for <strong>${genreSlug}</strong>.</div>`;
                if (countEl) countEl.textContent = "0 titles";
                return;
            }

            // Update title count
            if (countEl) {
                countEl.textContent = `${filtered.length} titles`;
            }

            // ============================================================
            //  BUILD GAME CARDS (CORRECTED THUMBNAILS)
            // ============================================================
            gridEl.innerHTML = "";

            filtered.forEach(game => {
                const card = document.createElement("div");
                card.className = "ccg-card";

                // CORRECT — TRUST JSON PATH (Option B)
                const thumb = game.thumbnail
                    ? game.thumbnail                   // ← THIS IS THE FIX
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
