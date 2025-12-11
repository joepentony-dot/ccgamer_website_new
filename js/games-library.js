/* ============================================================
   CCG GAMES LIBRARY — OMEGA ACCORDION EDITION
   - Fetches /games/games.json from /games/index.html
   - 16:9 card thumbnails (handled by ccg-cards.css)
   - Search by title / system / developer
   - Alphabet jump (A–Z + #) with accordion sections
   ============================================================ */

let CCG_ALL_GAMES = [];
let CCG_FILTERED_GAMES = [];

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    initGamesLibrary();
});

async function initGamesLibrary() {
    try {
        const response = await fetch("games.json"); // /games/index.html → /games/games.json
        const games = await response.json();

        CCG_ALL_GAMES = Array.isArray(games) ? games.slice() : [];
        CCG_FILTERED_GAMES = CCG_ALL_GAMES.slice();

        // Sort master list by title for consistent grouping
        CCG_ALL_GAMES.sort((a, b) => {
            const ta = (a.title || "").toLowerCase();
            const tb = (b.title || "").toLowerCase();
            return ta.localeCompare(tb);
        });

        CCG_FILTERED_GAMES = CCG_ALL_GAMES.slice();

        bindGamesUI();
        renderAlphabetStrip();
        renderGamesAccordion();

        updateStats();

    } catch (err) {
        console.error("Error loading games.json:", err);
    }
}

/* ============================================================
   UI BINDINGS
   ============================================================ */

function bindGamesUI() {
    const searchInput = document.getElementById("gamesSearchInput");
    const clearBtn = document.getElementById("gamesSearchClear");
    const accordion = document.getElementById("gamesAccordion");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            applySearchFilter(searchInput.value || "");
        });
    }

    if (clearBtn && searchInput) {
        clearBtn.addEventListener("click", () => {
            searchInput.value = "";
            applySearchFilter("");
            searchInput.focus();
        });
    }

    // Accordion toggle via event delegation
    if (accordion) {
        accordion.addEventListener("click", (e) => {
            const header = e.target.closest(".games-accordion__header");
            if (!header) return;

            const section = header.closest(".games-accordion__section");
            if (!section) return;

            section.classList.toggle("games-accordion__section--open");
        });
    }
}

/* ============================================================
   SEARCH FILTER
   ============================================================ */

function applySearchFilter(rawTerm) {
    const term = String(rawTerm || "").toLowerCase().trim();

    if (!term) {
        CCG_FILTERED_GAMES = CCG_ALL_GAMES.slice();
        renderGamesAccordion({ expandAll: false });
        updateStats();
        return;
    }

    CCG_FILTERED_GAMES = CCG_ALL_GAMES.filter(g => {
        const title = (g.title || "").toLowerCase();
        const system = (g.system || "").toLowerCase();
        const dev = (g.developer || "").toLowerCase();

        return (
            title.includes(term) ||
            system.includes(term) ||
            dev.includes(term)
        );
    });

    renderGamesAccordion({ expandAll: true });
    updateStats();
}

/* ============================================================
   STATS
   ============================================================ */

function updateStats() {
    const totalEl = document.getElementById("gamesTotalCount");
    const resultsEl = document.getElementById("gamesResultsCount");
    const emptyState = document.getElementById("gamesEmptyState");

    if (totalEl) {
        totalEl.textContent = CCG_ALL_GAMES.length.toString();
    }

    if (resultsEl) {
        resultsEl.textContent = CCG_FILTERED_GAMES.length.toString();
    }

    if (emptyState) {
        emptyState.hidden = CCG_FILTERED_GAMES.length > 0;
    }
}

/* ============================================================
   GROUPING HELPERS
   ============================================================ */

function getGameLetter(game) {
    const title = (game.title || "").trim();
    if (!title) return "#";

    const first = title[0].toUpperCase();
    if (first >= "A" && first <= "Z") return first;

    return "#";
}

function buildGroupedGames() {
    const groups = {};

    CCG_FILTERED_GAMES.forEach(game => {
        const letter = getGameLetter(game);
        if (!groups[letter]) groups[letter] = [];
        groups[letter].push(game);
    });

    // Sort each group's games by title
    Object.keys(groups).forEach(letter => {
        groups[letter].sort((a, b) => {
            const ta = (a.title || "").toLowerCase();
            const tb = (b.title || "").toLowerCase();
            return ta.localeCompare(tb);
        });
    });

    return groups;
}

/* ============================================================
   ALPHABET STRIP
   ============================================================ */

function renderAlphabetStrip() {
    const strip = document.getElementById("gamesAlphaStrip");
    if (!strip) return;

    const letters = [
        "#",
        "A","B","C","D","E","F","G","H","I","J","K","L","M",
        "N","O","P","Q","R","S","T","U","V","W","X","Y","Z"
    ];

    strip.innerHTML = letters.map(letter => `
        <button type="button"
                class="games-alpha__btn"
                data-alpha-jump="${letter}">
            ${letter}
        </button>
    `).join("");

    strip.addEventListener("click", (e) => {
        const btn = e.target.closest(".games-alpha__btn");
        if (!btn) return;

        const letter = btn.getAttribute("data-alpha-jump");
        if (!letter) return;

        const section = document.querySelector(
            `.games-accordion__section[data-letter="${letter}"]`
        );
        if (!section) return;

        // Open it if closed
        section.classList.add("games-accordion__section--open");

        const rect = section.getBoundingClientRect();
        window.scrollTo({
            top: window.scrollY + rect.top - 100,
            behavior: "smooth"
        });
    });
}

/* ============================================================
   RENDER — ACCORDION
   ============================================================ */

function renderGamesAccordion(options = {}) {
    const { expandAll = false } = options;
    const accordion = document.getElementById("gamesAccordion");
    if (!accordion) return;

    const groups = buildGroupedGames();

    const lettersOrder = [
        "#",
        "A","B","C","D","E","F","G","H","I","J","K","L","M",
        "N","O","P","Q","R","S","T","U","V","W","X","Y","Z"
    ];

    let html = "";

    lettersOrder.forEach(letter => {
        const games = groups[letter];
        if (!games || games.length === 0) return;

        const openClass = expandAll ? " games-accordion__section--open" : "";
        const count = games.length;

        const cardsHtml = games.map(g => renderGameCard(g)).join("");

        html += `
            <div class="games-accordion__section${openClass}" data-letter="${letter}">
                <div class="games-accordion__header">
                    <div class="games-accordion__left">
                        <div class="games-accordion__letter">${letter}</div>
                        <div class="games-accordion__count">
                            <span>${count}</span> game${count !== 1 ? "s" : ""}
                        </div>
                    </div>
                    <div class="games-accordion__chevron">▶</div>
                </div>
                <div class="games-accordion__body">
                    <div class="games-grid">
                        ${cardsHtml}
                    </div>
                </div>
            </div>
        `;
    });

    accordion.innerHTML = html;

    // If nothing exists, clear (handled by empty state separately)
    if (!html) {
        accordion.innerHTML = "";
    }
}

/* ============================================================
   CARD RENDERER — Reuses Omega card system
   ============================================================ */

function resolveGameThumbForIndex(rawThumb) {
    if (!rawThumb) {
        // Safe fallback thumbnail (existing known-good path)
        return "../resources/images/thumbnails/all/1942.jpg";
    }

    let t = String(rawThumb).trim();

    // strip any leading slash
    if (t.startsWith("/")) {
        t = t.replace(/^\/+/, "");
    }

    // If JSON is already "resources/images/..." then prefix for /games/ depth
    if (t.startsWith("resources/")) {
        return `../${t}`;
    }

    // If it’s just a filename, target the main thumbnails folder
    return `../resources/images/thumbnails/all/${t}`;
}

function buildGameMetaLine(game) {
    const parts = [
        game.year || "",
        game.system || "",
        game.developer || ""
    ].filter(Boolean);

    return parts.join(" · ");
}

function renderGameCard(game) {
    const thumb = resolveGameThumbForIndex(game.thumbnail || game.thumb || game.cover);
    const meta = buildGameMetaLine(game);

    return `
        <a href="game.html?id=${game.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img src="${thumb}" alt="${game.title || "Game artwork"}">
            </div>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title || "Unknown Game"}</h3>
                <div class="ccg-game-card__meta">${meta}</div>
            </div>
        </a>
    `;
}
