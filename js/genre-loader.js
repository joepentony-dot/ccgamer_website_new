// js/genre-loader.js
// Ultimate full-system GENRE LOADER for Cheeky Commodore Gamer 😇🕹️👌
//
// - Handles ALL genres via <body data-genre="...">
// - Multi-genre aware (supports genre, genres[], primary/secondary etc.)
// - Pagination
// - Fallback thumbnails
// - C64 / Amiga dual-mode toggle
// - Smooth transitions (CSS hooks only; animations done in CSS)

(() => {

    /* ==========================================================
       🔥 FIXED FOR GITHUB PAGES — RELATIVE PATH AUTO-DETECT
       ========================================================== */
   /* UNIVERSAL PATH — WORKS ON GITHUB, FUTURE DOMAIN, LOCAL, ANY DEPTH */
const GAMES_JSON_URL =
    `${window.location.origin}${window.location.pathname.split('/games/')[0]}/games/games.json`;

    const PAGE_SIZE = 24;

    const state = {
        allGames: [],
        filteredGames: [],
        currentPage: 1,
        pageSize: PAGE_SIZE,
        genreKey: null
    };

    const GENRE_ALIASES = {
        "arcade": ["arcade"],
        "action-adventure": ["action adventure", "action-adventure", "action/adventure"],
        "adventure": ["adventure", "graphic adventure", "text adventure"],
        "bpjs-indexed": ["bpjs", "bpjs indexed games", "bpjs-indexed"],
        "cartridge": ["cartridge", "cart", "cartridge games"],
        "casino": ["casino", "gambling"],
        "fighting": ["fighting", "beat 'em up", "beat em up"],
        "horror": ["horror"],
        "licensed": ["licensed", "movie tie-in", "tv tie-in"],
        "miscellaneous": ["miscellaneous", "misc", "other"],
        "platform": ["platform", "platformer"],
        "puzzle": ["puzzle", "brain", "brain teaser"],
        "quiz": ["quiz", "trivia"],
        "racing": ["racing", "driving"],
        "rpg": ["rpg", "role playing"],
        "shooting": ["shooting", "shooter"],
        "sports": ["sports", "sport"],
        "strategy": ["strategy", "tactics"],
        "top-picks": ["top picks", "top-picks", "favourites", "favorites"]
    };

    function canonicalize(str) {
        if (!str) return "";
        return String(str)
            .toLowerCase()
            .trim()
            .replace(/&/g, "and")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function resolveGenreKey(raw) {
        const key = canonicalize(raw);
        if (!key) return null;

        if (GENRE_ALIASES[key]) return key;

        for (const [canonical, aliases] of Object.entries(GENRE_ALIASES)) {
            if (canonical === key) return canonical;
            if (aliases.some(a => canonicalize(a) === key)) return canonical;
        }

        return key;
    }

    function extractGenresFromGame(game) {
        const genres = new Set();

        function addFromValue(val) {
            if (!val) return;
            if (Array.isArray(val)) {
                val.forEach(v => addFromValue(v));
                return;
            }
            String(val)
                .split(/[;,/]/)
                .map(s => s.trim())
                .filter(Boolean)
                .forEach(s => genres.add(canonicalize(s)));
        }

        addFromValue(game.genre);
        addFromValue(game.genres);
        addFromValue(game.primary_genre);
        addFromValue(game.secondary_genre);
        addFromValue(game.tertiary_genre);
        addFromValue(game.tags);

        return genres;
    }

    function gameMatchesGenre(game, requestedGenreKey) {
        if (!requestedGenreKey) return true;

        const requestedAliases = new Set(
            (GENRE_ALIASES[requestedGenreKey] || [])
                .map(canonicalize)
                .concat([requestedGenreKey])
        );

        const gameGenres = extractGenresFromGame(game);
        for (const g of gameGenres) {
            if (requestedAliases.has(g)) return true;
        }
        return false;
    }

    function buildThumbnailUrl(game) {
        if (game.thumbnail) {
            if (/^https?:\/\//i.test(game.thumbnail)) return game.thumbnail;
            if (game.thumbnail.startsWith("/")) return game.thumbnail;
            return `/ccgamer_website_new/resources/images/thumbnails/all/${game.thumbnail}`;
        }

        if (game.id) {
            return `/ccgamer_website_new/resources/images/thumbnails/all/${game.id}.jpg`;
        }

        return "/ccgamer_website_new/resources/images/thumbnails/all/_no_thumbnail.png";
    }

    function getSystemBadge(game) {
        const systemRaw = game.system || game.machine || "";
        const system = String(systemRaw).toUpperCase();
        if (!system) return "";

        return `<span class="badge badge-system badge-system-${canonicalize(system)}">${system}</span>`;
    }

    function getYearPublisherLine(game) {
        const bits = [];
        if (game.year) bits.push(game.year);
        if (game.publisher) bits.push(game.publisher);
        return bits.join(" · ");
    }

    function getComposerLine(game) {
        if (!game.composer) return "";
        return `<span class="meta-composer">${game.composer}</span>`;
    }

    function clearNode(el) {
        while (el.firstChild) el.removeChild(el.firstChild);
    }

    function renderGamesPage() {
        const listEl = document.getElementById("game-list");
        const paginationEl = document.getElementById("pagination");
        if (!listEl || !paginationEl) return;

        const total = state.filteredGames.length;
        const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
        state.currentPage = Math.min(Math.max(1, state.currentPage), totalPages);

        clearNode(listEl);
        clearNode(paginationEl);

        listEl.classList.add("is-transitioning");

        const start = (state.currentPage - 1) * state.pageSize;
        const end = Math.min(start + state.pageSize, total);
        const slice = state.filteredGames.slice(start, end);

        if (slice.length === 0) {
            const empty = document.createElement("div");
            empty.className = "game-list-empty";
            empty.textContent =
                "No games found for this genre (yet). Stay tuned…";
            listEl.appendChild(empty);
        } else {
            const frag = document.createDocumentFragment();

            slice.forEach(game => {
                const card = document.createElement("article");
                card.className = "game-card fade-in";

                const thumbUrl = buildThumbnailUrl(game);
                const imgAlt = game.title
                    ? `${game.title} (thumbnail)`
                    : "Game thumbnail";

                card.innerHTML = `
                    <div class="game-thumb-wrap">
                        <img class="game-thumb"
                             src="${thumbUrl}"
                             alt="${imgAlt}"
                             loading="lazy"
                             onerror="this.onerror=null;this.src='/ccgamer_website_new/resources/images/thumbnails/all/_no_thumbnail.png';">
                        <div class="thumb-overlay glow-border"></div>
                    </div>
                    <div class="game-meta">
                        <h3 class="game-title">${game.title || "Unknown Title"}</h3>
                        <div class="game-meta-line">
                            ${getSystemBadge(game)}
                            <span class="meta-year-pub">${getYearPublisherLine(game)}</span>
                        </div>
                        ${getComposerLine(game)}
                    </div>
                `.trim();

                frag.appendChild(card);
            });

            listEl.appendChild(frag);
        }

        if (totalPages > 1) {
            const pager = document.createElement("div");
            pager.className = "pager-inner";

            const prevBtn = document.createElement("button");
            prevBtn.className = "pager-btn pager-prev";
            prevBtn.textContent = "⟵ Previous";
            prevBtn.disabled = state.currentPage === 1;
            prevBtn.addEventListener("click", () => {
                if (state.currentPage > 1) {
                    state.currentPage--;
                    renderGamesPage();
                }
            });

            const nextBtn = document.createElement("button");
            nextBtn.className = "pager-btn pager-next";
            nextBtn.textContent = "Next ⟶";
            nextBtn.disabled = state.currentPage === totalPages;
            nextBtn.addEventListener("click", () => {
                if (state.currentPage < totalPages) {
                    state.currentPage++;
                    renderGamesPage();
                }
            });

            const info = document.createElement("div");
            info.className = "pager-info";
            info.textContent = `Page ${state.currentPage} of ${totalPages} · ${total} game${total === 1 ? "" : "s"}`;

            pager.appendChild(prevBtn);
            pager.appendChild(info);
            pager.appendChild(nextBtn);

            paginationEl.appendChild(pager);
        }

        requestAnimationFrame(() => {
            listEl.classList.remove("is-transitioning");
        });
    }

    function filterGamesByGenre() {
        state.filteredGames = state.allGames.filter(game =>
            gameMatchesGenre(game, state.genreKey)
        );
        state.currentPage = 1;
        renderGamesPage();
    }

    async function loadGames() {
        try {
            const response = await fetch(GAMES_JSON_URL, { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            state.allGames = Array.isArray(data)
                ? data
                : data.games || [];

            filterGamesByGenre();
        } catch (err) {
            console.error("Failed to load games.json", err);

            const listEl = document.getElementById("game-list");
            if (listEl) {
                clearNode(listEl);
                const error = document.createElement("div");
                error.className = "game-list-error";
                error.textContent =
                    "Error loading games list. Please try refreshing the page.";
                listEl.appendChild(error);
            }
        }
    }

    function initModeToggle() {
        const btn = document.getElementById("mode-toggle");
        if (!btn) return;

        const body = document.body;

        function updateLabel() {
            if (body.classList.contains("mode-amiga")) {
                btn.textContent = "AMIGA MODE";
            } else {
                btn.textContent = "C64 MODE";
            }
        }

        if (
            !body.classList.contains("mode-c64") &&
            !body.classList.contains("mode-amiga")
        ) {
            body.classList.add("mode-c64");
        }

        btn.addEventListener("click", () => {
            body.classList.toggle("mode-c64");
            body.classList.toggle("mode-amiga");
            updateLabel();
        });

        updateLabel();
    }

    function initGenreFromBody() {
        const rawGenre = document.body.dataset.genre || "";
        state.genreKey = resolveGenreKey(rawGenre);

        const labelEl = document.getElementById("genre-label");
        if (labelEl && rawGenre) {
            labelEl.textContent = rawGenre
                .replace(/-/g, " ")
                .replace(/\b\w/g, c => c.toUpperCase());
        }
    }

    function init() {
        initGenreFromBody();
        initModeToggle();
        loadGames();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
