// =====================================================================
// games-library.js — Omega Games Index Loader (A2 — Full Normalisation)
// Uses: ../games.json
// Works only on: [data-ccg-page="games-index"]
// =====================================================================

(function () {
    const html = document.documentElement;
    if (html.getAttribute("data-ccg-page") !== "games-index") return;

    // ---------------------------------------------------------
    // DOM HOOKS
    // ---------------------------------------------------------
    const searchInput = document.querySelector("[data-ccg-games-search]");
    const systemButtons = Array.from(document.querySelectorAll("[data-ccg-system-filter]"));
    const genreSelect = document.querySelector("[data-ccg-genre-filter]");
    const grid = document.querySelector("[data-ccg-games-grid]");
    const loadMoreBtn = document.querySelector("[data-ccg-load-more]");

    if (!grid) {
        console.warn("Games grid missing — aborting games-library.js");
        return;
    }

    // ---------------------------------------------------------
    // CONFIG
    // ---------------------------------------------------------
    const PAGE_SIZE = 36;

    let allGames = [];
    let filteredGames = [];
    let renderedCount = 0;

    let activeSystem = "all";
    let activeGenre = "all";
    let searchTerm = "";

    // ---------------------------------------------------------
    // NORMALISERS
    // ---------------------------------------------------------

    // Fix system names (AMIGA → Amiga)
    function normaliseSystem(sys) {
        if (!sys) return "C64";

        const s = String(sys).trim().toLowerCase();

        if (["c64", "commodore 64"].includes(s)) return "C64";
        if (["amiga", "commodore amiga", "aga"].includes(s)) return "Amiga";

        return "C64"; // fallback
    }

    // Genre normalisation map
    function baseGenres(genresArr) {
        if (!Array.isArray(genresArr)) return [];

        const map = {
            "arcade games": "Arcade",
            "arcade": "Arcade",

            "shooting games": "Shooting",
            "shooter": "Shooting",

            "adventure games": "Adventure",
            "adventure": "Adventure",

            "licensed games": "Licensed",
            "licensed": "Licensed",

            "racing games": "Racing",
            "racing": "Racing",

            "sports games": "Sports",
            "sports": "Sports",

            "strategy games": "Strategy",
            "strategy": "Strategy",

            "platform games": "Platform",
            "platform": "Platform",

            "puzzle games": "Puzzle",
            "puzzle": "Puzzle",

            "bpjs games": "BPJS",
            "bpjs": "BPJS",

            "horror games": "Horror",
            "horror": "Horror",

            "misc": "Miscellaneous",
            "miscellaneous": "Miscellaneous",
            "miscellenous": "Miscellaneous",
            "misc games": "Miscellaneous",
            "misc.": "Miscellaneous"
        };

        return genresArr.map(g => {
            const key = String(g).trim().toLowerCase();
            return map[key] || g.replace(/Games$/i, "").trim();
        });
    }

    // Fix thumbnail paths
    function normalizeThumbPath(raw) {
        if (!raw) return "../resources/images/thumbnails/all/1942.jpg";

        let p = String(raw).trim();

        // Strip repo prefix if present
        p = p.replace(/^\/?ccgamer_website_new\//, "");

        // Remove any leading slash
        p = p.replace(/^\//, "");

        // Correct relative path (games/index.html → ../)
        return "../" + p;
    }

    function normaliseGame(raw) {
        const genresBase = baseGenres(raw.genres);

        const searchBits = [
            raw.title || "",
            raw.sorttitle || "",
            raw.system || "",
            raw.developer || "",
            raw.year || "",
            genresBase.join(" ")
        ];

        return {
            id: raw.id,
            title: raw.title || "Unknown Game",
            system: normaliseSystem(raw.system),
            year: raw.year || "",
            developer: raw.developer || "",
            genres: genresBase,
            rawGenres: raw.genres || [],
            thumbnail: normalizeThumbPath(raw.thumbnail),
            videoid: raw.videoid || "",
            searchText: searchBits.join(" ").toLowerCase()
        };
    }

    // ---------------------------------------------------------
    // GENRE DROPDOWN POPULATION
    // ---------------------------------------------------------

    function buildGenreOptions() {
        const set = new Set();

        allGames.forEach(g => {
            g.genres.forEach(genre => {
                if (genre) set.add(genre);
            });
        });

        const genres = Array.from(set).sort((a, b) => a.localeCompare(b));

        if (!genreSelect) return;

        genreSelect.innerHTML =
            `<option value="all">All genres</option>` +
            genres.map(g => `<option value="${g}">${g}</option>`).join("");
    }

    // ---------------------------------------------------------
    // FILTERING ENGINE
    // ---------------------------------------------------------

    function applyFilters() {
        filteredGames = allGames.filter(game => {
            if (activeSystem !== "all" && game.system !== activeSystem) return false;

            if (activeGenre !== "all" && !game.genres.includes(activeGenre)) return false;

            if (searchTerm && !game.searchText.includes(searchTerm)) return false;

            return true;
        });

        renderedCount = 0;
        grid.innerHTML = "";

        if (!filteredGames.length) {
            grid.innerHTML = `<p style="grid-column:1/-1; padding:1rem; opacity:0.85;">
                No games found for the current filters.
            </p>`;
            loadMoreBtn.style.display = "none";
            return;
        }

        renderNextPage();
    }

    // ---------------------------------------------------------
    // CARD RENDERING
    // ---------------------------------------------------------

    function buildCard(game) {
        const card = document.createElement("article");
        card.className = "ccg-game-card";

        const genresLabel = game.genres.length ? game.genres.join(" • ") : "";

        return Object.assign(card, {
            innerHTML: `
                <div class="ccg-game-card__thumb">
                    <img src="${game.thumbnail}" alt="${game.title}">
                </div>

                <div class="ccg-game-card__body">
                    <h2 class="ccg-game-card__title">${game.title}</h2>

                    <div class="ccg-game-card__meta">
                        ${game.system ? `<span class="ccg-pill">${game.system}</span>` : ""}
                        ${game.year ? `<span class="ccg-pill">${game.year}</span>` : ""}
                        ${game.developer ? `<span class="ccg-pill">${game.developer}</span>` : ""}
                    </div>

                    ${genresLabel ? `<p class="ccg-game-card__genres">${genresLabel}</p>` : ""}

                    <div class="ccg-game-card__footer">
                        <a class="ccg-btn ccg-btn--mini ccg-btn--primary"
                           href="game.html?id=${encodeURIComponent(game.id)}">
                            View Game
                        </a>

                        ${game.videoid ? `
                            <a class="ccg-btn ccg-btn--mini ccg-btn--ghost"
                               href="https://www.youtube.com/watch?v=${game.videoid}"
                               target="_blank" rel="noopener">
                                Watch Video
                            </a>` : ""}
                    </div>
                </div>
            `
        });
    }

    function renderNextPage() {
        const slice = filteredGames.slice(renderedCount, renderedCount + PAGE_SIZE);

        slice.forEach(game => grid.appendChild(buildCard(game)));

        renderedCount += slice.length;

        loadMoreBtn.style.display =
            renderedCount < filteredGames.length ? "inline-flex" : "none";
    }

    // ---------------------------------------------------------
    // UI EVENTS
    // ---------------------------------------------------------

    function bindUI() {
        searchInput?.addEventListener("input", (e) => {
            searchTerm = e.target.value.trim().toLowerCase();
            applyFilters();
        });

        systemButtons.forEach(btn =>
            btn.addEventListener("click", () => {
                systemButtons.forEach(b => b.classList.remove("ccg-chip--active"));
                btn.classList.add("ccg-chip--active");

                activeSystem = btn.dataset.system || "all";
                applyFilters();
            })
        );

        genreSelect?.addEventListener("change", (e) => {
            activeGenre = e.target.value || "all";
            applyFilters();
        });

        loadMoreBtn?.addEventListener("click", renderNextPage);
    }

    // ---------------------------------------------------------
    // INIT
    // ---------------------------------------------------------

    async function init() {
        try {
            const response = await fetch("games.json");
            if (!response.ok) throw new Error("Failed to fetch games.json");

            const json = await response.json();
            allGames = json.map(normaliseGame);

            buildGenreOptions();
            bindUI();
            applyFilters();

        } catch (err) {
            console.error("Error initialising games-library.js:", err);
            grid.innerHTML = `<p style="padding:1rem;">Failed to load games library.</p>`;
            loadMoreBtn.style.display = "none";
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();
