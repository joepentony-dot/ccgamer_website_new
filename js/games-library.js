/* ============================================================
   CCG GAMES LIBRARY — OMEGA ACCORDION (STABLE + LAZY LOAD)
   ------------------------------------------------------------
   • Alphabet accordion
   • Search + filter
   • Progressive thumbnail loading
   • NO layout bleed
   • NO data mutation
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
        // Correct path: /games/index.html → /games/games.json
        const response = await fetch("games.json");
        const games = await response.json();

        CCG_ALL_GAMES = Array.isArray(games) ? games.slice() : [];

        runIntegrityChecks(CCG_ALL_GAMES);

        // Alphabetical sort
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
        console.error("[CCG] Failed to load games.json:", err);
    }
}

/* ============================================================
   INTEGRITY CHECKS (CONSOLE ONLY)
============================================================ */

function runIntegrityChecks(games) {
    const seenIds = new Set();

    games.forEach((game, index) => {

        if (!game.id && game.id !== 0) {
            console.warn(`[CCG DATA] Missing ID at index ${index}`, game);
            return;
        }

        const id = String(game.id);
        if (seenIds.has(id)) {
            console.warn(`[CCG DATA] Duplicate ID detected: ${id}`, game);
        }
        seenIds.add(id);

        if (!game.title || !String(game.title).trim()) {
            console.warn(`[CCG DATA] Missing title (ID ${id})`, game);
        }
    });
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
            applySearchFilter(searchInput.value);
        });
    }

    if (clearBtn && searchInput) {
        clearBtn.addEventListener("click", () => {
            searchInput.value = "";
            applySearchFilter("");
            searchInput.focus();
        });
    }

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

function applySearchFilter(rawTerm = "") {
    const term = rawTerm.toLowerCase().trim();

    if (!term) {
        CCG_FILTERED_GAMES = CCG_ALL_GAMES.slice();
        renderGamesAccordion({ expandAll: false });
        updateStats();
        return;
    }

    CCG_FILTERED_GAMES = CCG_ALL_GAMES.filter(g => {
        return (
            (g.title || "").toLowerCase().includes(term) ||
            (g.system || "").toLowerCase().includes(term) ||
            (g.developer || "").toLowerCase().includes(term)
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

    if (totalEl) totalEl.textContent = CCG_ALL_GAMES.length;
    if (resultsEl) resultsEl.textContent = CCG_FILTERED_GAMES.length;

    if (emptyState) {
        emptyState.hidden = CCG_FILTERED_GAMES.length > 0;
    }
}

/* ============================================================
   GROUPING
============================================================ */

function getGameLetter(game) {
    const title = (game.title || "").trim();
    if (!title) return "#";

    const ch = title[0].toUpperCase();
    return ch >= "A" && ch <= "Z" ? ch : "#";
}

function buildGroupedGames() {
    const groups = {};

    CCG_FILTERED_GAMES.forEach(game => {
        const letter = getGameLetter(game);
        if (!groups[letter]) groups[letter] = [];
        groups[letter].push(game);
    });

    Object.values(groups).forEach(group => {
        group.sort((a, b) => {
            return (a.title || "").localeCompare(b.title || "");
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

    const letters = ["#","A","B","C","D","E","F","G","H","I","J","K","L","M",
                     "N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];

    strip.innerHTML = letters.map(l => `
        <button class="games-alpha__btn" data-alpha="${l}">${l}</button>
    `).join("");

    strip.addEventListener("click", e => {
        const btn = e.target.closest(".games-alpha__btn");
        if (!btn) return;

        const letter = btn.dataset.alpha;
        const section = document.querySelector(
            `.games-accordion__section[data-letter="${letter}"]`
        );

        if (section) {
            section.classList.add("games-accordion__section--open");
            section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
}

/* ============================================================
   RENDER ACCORDION
============================================================ */

function renderGamesAccordion({ expandAll = false } = {}) {
    const accordion = document.getElementById("gamesAccordion");
    if (!accordion) return;

    const groups = buildGroupedGames();
    const order = ["#","A","B","C","D","E","F","G","H","I","J","K","L","M",
                   "N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];

    accordion.innerHTML = order.map(letter => {
        const games = groups[letter];
        if (!games || !games.length) return "";

        const open = expandAll ? " games-accordion__section--open" : "";

        return `
            <div class="games-accordion__section${open}" data-letter="${letter}">
                <div class="games-accordion__header">
                    <div class="games-accordion__left">
                        <div class="games-accordion__letter">${letter}</div>
                        <div class="games-accordion__count">${games.length} games</div>
                    </div>
                    <div class="games-accordion__chevron">▶</div>
                </div>
                <div class="games-accordion__body">
                    <div class="games-grid">
                        ${games.map(renderGameCard).join("")}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

/* ============================================================
   CARD RENDER — LAZY LOAD FIX (CRITICAL)
============================================================ */

function resolveGameThumb(raw) {
    const fallback = "../resources/images/thumbnails/all/1942.jpg";
    if (!raw) return fallback;

    let t = String(raw).replace(/^\/+/, "");
    if (!t.includes("/")) {
        return `../resources/images/thumbnails/all/${t}`;
    }
    if (t.startsWith("resources/")) {
        return `../${t}`;
    }
    return fallback;
}

function renderGameCard(game) {
    if (!game.id && game.id !== 0) return "";

    const thumb = resolveGameThumb(
        game.thumbnail || game.thumb || game.cover
    );

    const meta = [game.year, game.system, game.developer]
        .filter(Boolean)
        .join(" · ");

    return `
        <a href="game.html?id=${game.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img
                    src="${thumb}"
                    alt="${game.title || "Game artwork"}"
                    loading="lazy"
                    decoding="async"
                    referrerpolicy="no-referrer"
                >
            </div>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title || "Unknown Game"}</h3>
                <div class="ccg-game-card__meta">${meta}</div>
            </div>
        </a>
    `;
}
