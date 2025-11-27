// ================================
// CCG - LOAD GAMES (MAIN BROWSER)
// ================================

(function () {
    const listEl = document.getElementById("games-list");
    if (!listEl) return; // Not on the games index page

    const searchInput = document.getElementById("filter-search");
    const systemSelect = document.getElementById("filter-system");
    const genreSelect = document.getElementById("filter-genre");
    const resetBtn = document.getElementById("reset-filters");
    const countEl = document.getElementById("games-count");
    const statusEl = document.getElementById("games-status");

    let allGames = [];
    let filteredGames = [];

    // ---------- Utilities ----------

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getGamesBasePath() {
        // Extract "/.../games/" from the path, so it works from /games/ and /games/genres/
        const path = window.location.pathname;
        const marker = "/games/";
        const idx = path.indexOf(marker);
        if (idx !== -1) {
            return path.slice(0, idx + marker.length); // includes trailing "/"
        }
        // Fallback if something is odd
        return "games/";
    }

    function getGamesJsonUrl() {
        return getGamesBasePath() + "games.json";
    }

    function getDetailUrl(slug) {
        return getGamesBasePath() + "game.html?id=" + encodeURIComponent(slug);
    }

    function fetchGamesJson() {
        if (window.__CCG_GAMES_CACHE__) {
            return Promise.resolve(window.__CCG_GAMES_CACHE__);
        }
        const url = getGamesJsonUrl();
        return fetch(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error("HTTP " + res.status + " while loading " + url);
                }
                return res.json();
            })
            .then(json => {
                if (!Array.isArray(json)) {
                    throw new Error("games.json is not an array");
                }
                window.__CCG_GAMES_CACHE__ = json;
                return json;
            });
    }

    function renderCards(games) {
        listEl.innerHTML = "";

        if (!games.length) {
            if (statusEl) statusEl.textContent = "No games match your filters.";
            return;
        }

        const basePath = getGamesBasePath();

        const frag = document.createDocumentFragment();

        games.forEach(game => {
            const card = document.createElement("article");
            card.className = "game-card";

            const detailUrl = basePath + "game.html?id=" + encodeURIComponent(game.slug);

            const genresText = Array.isArray(game.genres)
                ? escapeHtml(game.genres.join(", "))
                : "";

            const thumbUrl = escapeHtml(game.thumbUrl || "");
            const title = escapeHtml(game.title || "");
            const system = escapeHtml(game.system || "");

            card.innerHTML = `
                <a href="${detailUrl}" class="game-card-link">
                    <div class="game-thumb">
                        ${thumbUrl ? `<img src="${thumbUrl}" alt="${title}" loading="lazy">` : ""}
                    </div>
                    <div class="game-info">
                        <h2>${title}</h2>
                        <p class="game-meta">
                            <span class="game-system">${system}</span>
                            ${genresText ? ` • <span class="game-genres">${genresText}</span>` : ""}
                        </p>
                    </div>
                </a>
            `;

            frag.appendChild(card);
        });

        listEl.appendChild(frag);
        if (statusEl) statusEl.textContent = "";
    }

    function applyFilters() {
        const search = (searchInput?.value || "").toLowerCase().trim();
        const systemFilter = systemSelect?.value || "";
        const genreFilter = genreSelect?.value || "";

        filteredGames = allGames.filter(game => {
            // Title / slug search
            if (search) {
                const haystack =
                    (game.title || "").toLowerCase() +
                    " " +
                    (game.slug || "").toLowerCase();
                if (!haystack.includes(search)) return false;
            }

            // System filter
            if (systemFilter && game.system !== systemFilter) {
                return false;
            }

            // Genre filter
            if (genreFilter) {
                const g = Array.isArray(game.genres) ? game.genres : [];
                const matches = g.some(
                    gen => (gen || "").toLowerCase() === genreFilter.toLowerCase()
                );
                if (!matches) return false;
            }

            return true;
        });

        // Sort by title A–Z
        filteredGames.sort((a, b) =>
            (a.title || "").localeCompare(b.title || "", "en", { sensitivity: "base" })
        );

        if (countEl) {
            countEl.textContent =
                "Showing " + filteredGames.length + " of " + allGames.length + " games.";
        }

        renderCards(filteredGames);
    }

    function populateGenreSelect() {
        if (!genreSelect) return;

        const genreSet = new Set();
        allGames.forEach(game => {
            (game.genres || []).forEach(gen => {
                if (gen) genreSet.add(gen);
            });
        });

        const genres = Array.from(genreSet).sort((a, b) =>
            a.localeCompare(b, "en", { sensitivity: "base" })
        );

        // Clear any existing options except the first "All"
        while (genreSelect.options.length > 1) {
            genreSelect.remove(1);
        }

        genres.forEach(gen => {
            const opt = document.createElement("option");
            opt.value = gen;
            opt.textContent = gen;
            genreSelect.appendChild(opt);
        });
    }

    // ---------- Event wiring ----------

    function attachEvents() {
        if (searchInput) {
            searchInput.addEventListener("input", applyFilters);
        }
        if (systemSelect) {
            systemSelect.addEventListener("change", applyFilters);
        }
        if (genreSelect) {
            genreSelect.addEventListener("change", applyFilters);
        }
        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                if (searchInput) searchInput.value = "";
                if (systemSelect) systemSelect.value = "";
                if (genreSelect) genreSelect.value = "";
                applyFilters();
            });
        }
    }

    // ---------- Boot ----------

    if (countEl) countEl.textContent = "Loading games…";
    if (statusEl) statusEl.textContent = "";

    fetchGamesJson()
        .then(games => {
            allGames = games.slice(); // clone
            populateGenreSelect();
            attachEvents();
            applyFilters();
        })
        .catch(err => {
            console.error("Error loading games:", err);
            if (statusEl) {
                statusEl.textContent = "Error loading game data.";
            }
            if (countEl) countEl.textContent = "0 games.";
        });
})();
