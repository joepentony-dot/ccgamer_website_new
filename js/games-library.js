/* ============================================================
   OMEGA GAMES LIBRARY — ULTRA EDITION
   - Drives games/index.html
   - Loads all games from games.json
   - Correct thumbnail paths
   - Thumbnails + title + button all link to single game page
   - Basic filters: search, system, genre
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("gamesGrid");
    const countEl = document.getElementById("gamesCount");
    const searchInput = document.getElementById("gamesSearch");
    const systemFilter = document.getElementById("systemFilter");
    const genreFilter = document.getElementById("genreFilter");

    if (!grid) {
        console.warn("CCG Games Library: #gamesGrid not found");
        return;
    }

    let allGames = [];
    let filteredGames = [];

    // ------------------------------------------------------------
    // Load games.json (relative to /games/index.html)
    // ------------------------------------------------------------
    fetch("games.json")
        .then((response) => response.json())
        .then((data) => {
            allGames = Array.isArray(data) ? data : [];
            filteredGames = [...allGames];

            renderGames();
            updateCount();
            populateFilters();
        })
        .catch((err) => {
            console.error("Error loading games.json for library:", err);
        });

    // ------------------------------------------------------------
    // EVENT LISTENERS — FILTERS
    // ------------------------------------------------------------

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            applyFilters();
        });
    }

    if (systemFilter) {
        systemFilter.addEventListener("change", () => {
            applyFilters();
        });
    }

    if (genreFilter) {
        genreFilter.addEventListener("change", () => {
            applyFilters();
        });
    }

    // ------------------------------------------------------------
    // FILTER LOGIC
    // ------------------------------------------------------------

    function applyFilters() {
        const term = (searchInput?.value || "").toLowerCase().trim();
        const system = systemFilter?.value || "all";
        const activeGenre = genreFilter?.value || "all";

        filteredGames = allGames.filter((game) => {
            // Search
            if (term) {
                const haystack = [
                    game.title,
                    game.developer,
                    game.system,
                    String(game.year || "")
                ]
                    .join(" ")
                    .toLowerCase();

                if (!haystack.includes(term)) return false;
            }

            // System filter
            if (system !== "all" && game.system !== system) {
                return false;
            }

            // Genre filter — games.json uses an array: game.genres
            if (activeGenre !== "all") {
                const genres = Array.isArray(game.genres) ? game.genres : [];
                if (!genres.includes(activeGenre)) {
                    return false;
                }
            }

            return true;
        });

        renderGames();
        updateCount();
    }

    // ------------------------------------------------------------
    // RENDERING
    // ------------------------------------------------------------

    function renderGames() {
        if (!filteredGames.length) {
            grid.innerHTML =
                `<p class="ccg-empty-state">No games match those filters yet — try adjusting your search.</p>`;
            return;
        }

        const cardsHtml = filteredGames
            .map((game) => {
                const thumbPath = `../resources/images/thumbnails/all/${game.thumbnail}`;
                const detailUrl = `game.html?id=${encodeURIComponent(game.id)}`;

                return `
            <article class="ccg-game-card">
                <a class="ccg-game-card__thumb" href="${detailUrl}">
                    <img src="${thumbPath}"
                         alt="${game.title}"
                         loading="lazy"
                         onerror="this.style.opacity='0.2';">
                </a>
                <div class="ccg-game-card__body">
                    <h3 class="ccg-game-card__title">
                        <a href="${detailUrl}">${game.title}</a>
                    </h3>
                    <div class="ccg-game-card__meta">
                        <span>${game.year || "—"}</span>
                        <span class="divider">·</span>
                        <span>${game.system || "—"}</span>
                    </div>
                    <div class="ccg-game-card__tags">
                        ${
                            Array.isArray(game.genres)
                                ? game.genres
                                      .map(
                                          (g) =>
                                              `<span class="ccg-game-card__tag">${g}</span>`
                                      )
                                      .join("")
                                : ""
                        }
                    </div>
                    <a class="ccg-btn ccg-btn--primary ccg-view-btn" href="${detailUrl}">
                        View Game
                    </a>
                </div>
            </article>
        `;
            })
            .join("");

        grid.innerHTML = cardsHtml;
    }

    function updateCount() {
        if (!countEl) return;
        countEl.textContent = filteredGames.length;
    }

    // ------------------------------------------------------------
    // POPULATE FILTER DROPDOWNS (SYSTEM + GENRE)
    // ------------------------------------------------------------

    function populateFilters() {
        // Systems
        if (systemFilter) {
            const systems = Array.from(
                new Set(allGames.map((g) => g.system).filter(Boolean))
            ).sort();

            systemFilter.innerHTML = `
                <option value="all">All Systems</option>
                ${systems
                    .map(
                        (s) =>
                            `<option value="${s}">${s}</option>`
                    )
                    .join("")}
            `;
        }

        // Genres — flatten all game.genres arrays
        if (genreFilter) {
            const genreSet = new Set();

            allGames.forEach((g) => {
                if (Array.isArray(g.genres)) {
                    g.genres.forEach((genre) => {
                        if (genre) genreSet.add(genre);
                    });
                }
            });

            const genres = Array.from(genreSet).sort();

            genreFilter.innerHTML = `
                <option value="all">All genres</option>
                ${genres
                    .map(
                        (g) =>
                            `<option value="${g}">${g}</option>`
                    )
                    .join("")}
            `;
        }
    }
});
