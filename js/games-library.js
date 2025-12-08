// =====================================================================
// games-library.js — Omega Games Index Loader (A2)
// Includes Omega Accordion UI wiring
// =====================================================================

(function () {
    const html = document.documentElement;
    if (html.getAttribute("data-ccg-page") !== "games-index") return;

    // Original UI Elements
    const searchInput = document.querySelector("[data-ccg-games-search]");
    const systemButtons = Array.from(document.querySelectorAll("[data-ccg-system-filter]"));
    const genreSelect = document.querySelector("[data-ccg-genre-filter]");
    const grid = document.querySelector("[data-ccg-games-grid]");
    const loadMoreBtn = document.querySelector("[data-ccg-load-more]");

    // NEW Accordion Inputs
    const accSearch = document.querySelector("#searchInput");
    const accSystem = document.querySelector("#systemFilter");
    const accGenre = document.querySelector("#genreFilter");

    // Accordion Items
    const accordionItems = document.querySelectorAll(".ccg-acc-item");
    const accordionHeaders = document.querySelectorAll("[data-acc-toggle]");

    if (!grid) {
        console.warn("Games grid missing, aborting games-library.js");
        return;
    }

    const PAGE_SIZE = 36;

    let allGames = [];
    let filteredGames = [];
    let renderedCount = 0;

    let activeSystem = "all";
    let activeGenre = "all";
    let searchTerm = "";

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------

    function normalizeThumbPath(raw) {
        if (!raw) return "../resources/images/thumbnails/all/1942.jpg";

        let p = String(raw).trim();

        // Clean path fragments
        p = p.replace(/^\/?ccgamer_website_new\//, "");
        p = p.replace(/^\//, "");

        return "../" + p;
    }

    function baseGenres(genresArr) {
        if (!Array.isArray(genresArr)) return [];
        return genresArr.map(g =>
            String(g).replace(/\s+Games$/i, "").trim()
        );
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
            system: raw.system || "",
            year: raw.year || "",
            developer: raw.developer || "",
            genres: genresBase,
            rawGenres: raw.genres || [],
            thumbnail: normalizeThumbPath(raw.thumbnail),
            videoid: raw.videoid || "",
            searchText: searchBits.join(" ").toLowerCase()
        };
    }

    function buildGenreOptions() {
        const set = new Set();

        allGames.forEach(g => {
            g.genres.forEach(genre => {
                if (genre) set.add(genre);
            });
        });

        const genres = Array.from(set).sort((a, b) => a.localeCompare(b));

        if (!genreSelect) return;

        genreSelect.innerHTML = `<option value="all">All genres</option>` +
            genres.map(g => `<option value="${g}">${g}</option>`).join("");

        // Also fill accordion genre menu
        if (accGenre) {
            accGenre.innerHTML = genreSelect.innerHTML;
        }
    }

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
            if (loadMoreBtn) loadMoreBtn.style.display = "none";
            return;
        }

        renderNextPage();
    }

    function renderNextPage() {
        const slice = filteredGames.slice(renderedCount, renderedCount + PAGE_SIZE);

        slice.forEach(game => {
            grid.appendChild(buildCard(game));
        });

        renderedCount += slice.length;

        if (!loadMoreBtn) return;
        loadMoreBtn.style.display =
            renderedCount < filteredGames.length ? "inline-flex" : "none";
    }

    function buildCard(game) {
        const card = document.createElement("article");
        card.className = "ccg-game-card";

        const genresLabel = game.genres.length
            ? game.genres.join(" • ")
            : "";

        const yearLabel = game.year ? String(game.year) : "";
        const systemLabel = game.system || "";

        card.innerHTML = `
            <div class="ccg-game-card__thumb">
                <img src="${game.thumbnail}" alt="${game.title}">
            </div>
            <div class="ccg-game-card__body">
                <h2 class="ccg-game-card__title">${game.title}</h2>
                <div class="ccg-game-card__meta">
                    ${systemLabel ? `<span class="ccg-pill">${systemLabel}</span>` : ""}
                    ${yearLabel ? `<span class="ccg-pill">${yearLabel}</span>` : ""}
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
                        </a>
                    ` : ""}
                </div>
            </div>
        `;

        return card;
    }

    // ---------------------------------------------------------
    // UI wiring (chips + selects + accordion)
    // ---------------------------------------------------------

    function bindUI() {

        // SEARCH
        function updateSearch(value) {
            searchTerm = value.trim().toLowerCase();
            if (searchInput) searchInput.value = value;
            if (accSearch) accSearch.value = value;
            applyFilters();
        }

        if (searchInput) {
            searchInput.addEventListener("input", e => updateSearch(e.target.value));
        }
        if (accSearch) {
            accSearch.addEventListener("input", e => updateSearch(e.target.value));
        }

        // SYSTEM
        function updateSystem(system) {
            activeSystem = system;

            systemButtons.forEach(b => b.classList.remove("ccg-chip--active"));
            systemButtons.forEach(b => {
                if (b.getAttribute("data-system") === system) {
                    b.classList.add("ccg-chip--active");
                }
            });

            if (accSystem) accSystem.value = system;

            applyFilters();
        }

        systemButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                updateSystem(btn.getAttribute("data-system") || "all");
            });
        });

        if (accSystem) {
            accSystem.addEventListener("change", e => {
                updateSystem(e.target.value);
            });
        }

        // GENRE
        function updateGenre(genre) {
            activeGenre = genre;

            if (genreSelect) genreSelect.value = genre;
            if (accGenre) accGenre.value = genre;

            applyFilters();
        }

        if (genreSelect) {
            genreSelect.addEventListener("change", e => updateGenre(e.target.value));
        }
        if (accGenre) {
            accGenre.addEventListener("change", e => updateGenre(e.target.value));
        }

        // LOAD MORE
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener("click", renderNextPage);
        }

        // ACCORDION BEHAVIOUR
        accordionHeaders.forEach(header => {
            header.addEventListener("click", () => {
                const parent = header.parentElement;
                parent.classList.toggle("open");
            });
        });
    }

    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    async function init() {
        try {
            const response = await fetch("games.json");
            if (!response.ok) throw new Error("Failed to fetch games.json");
            const data = await response.json();

            allGames = data.map(normaliseGame);

            buildGenreOptions();
            bindUI();
            applyFilters();

        } catch (err) {
            console.error("Error initialising games-library:", err);
            grid.innerHTML = `<p style="grid-column:1/-1; padding:1rem;">
                Failed to load games library.
            </p>`;
            if (loadMoreBtn) loadMoreBtn.style.display = "none";
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();
