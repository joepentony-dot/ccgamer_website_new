/* ============================================================
   CCG GAMES LIBRARY — OMEGA ACCORDION EDITION (INTEGRITY HARDENED + LAZYLOAD)
   ------------------------------------------------------------
   • All original behaviour preserved
   • Added: ID validation, duplicate detection, safe linking
   • Added: lazy-load + decoding async for thumbnails (injected images)
   • Added: safe onerror fallback to stop broken-thumb spam
   • Console-only diagnostics (no UI impact)
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
        // Correct depth: /games/index.html → /games/games.json
        const response = await fetch("games.json");
        const games = await response.json();

        CCG_ALL_GAMES = Array.isArray(games) ? games.slice() : [];

        runIntegrityChecks(CCG_ALL_GAMES);

        // Sort master list for consistent alphabetical grouping
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
        console.error("[CCG] Error loading games.json:", err);
    }
}

/* ============================================================
   INTEGRITY CHECKS (CONSOLE ONLY)
   (kept lightweight — won’t spam unless there’s real data issues)
   ============================================================ */

function runIntegrityChecks(games) {
    const seenIds = new Set();

    games.forEach((game, index) => {

        // ID checks
        if (game.id === undefined || game.id === null || game.id === "") {
            console.warn(`[CCG DATA WARNING] Game missing ID at index ${index}:`, game);
        } else {
            const idStr = String(game.id);
            if (seenIds.has(idStr)) {
                console.warn(`[CCG DATA WARNING] Duplicate game ID detected: ${idStr}`, game);
            }
            seenIds.add(idStr);
        }

        // Title check
        if (!game.title || !String(game.title).trim()) {
            console.warn(`[CCG DATA WARNING] Game missing title (ID: ${game.id})`, game);
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

    if (totalEl) totalEl.textContent = CCG_ALL_GAMES.length.toString();
    if (resultsEl) resultsEl.textContent = CCG_FILTERED_GAMES.length.toString();

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
    return first >= "A" && first <= "Z" ? first : "#";
}

function buildGroupedGames() {
    const groups = {};

    CCG_FILTERED_GAMES.forEach(game => {
        const letter = getGameLetter(game);
        if (!groups[letter]) groups[letter] = [];
        groups[letter].push(game);
    });

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
}

/* ============================================================
   CARD GENERATION — SAFE LINKING + LAZYLOAD
   ============================================================ */

function resolveGameThumbForIndex(rawThumb) {
    const FALLBACK = "../resources/images/thumbnails/all/1942.jpg";
    if (!rawThumb) return FALLBACK;

    let t = String(rawThumb).trim().replace(/^\/+/, "");

    // If JSON already contains "resources/..." keep it but fix depth from /games/
    if (t.startsWith("resources/")) return `../${t}`;

    // If only filename
    if (!t.includes("/")) return `../resources/images/thumbnails/all/${t}`;

    return FALLBACK;
}

function buildGameMetaLine(game) {
    return [game.year, game.system, game.developer]
        .filter(Boolean)
        .join(" · ");
}

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Prevent console spam + ensure broken images don’t keep retrying
function buildImgOnErrorFallback() {
    // Inline handler kept tiny + safe (no dependency on globals)
    // It sets a known fallback and disables itself.
    return "this.onerror=null;this.src='../resources/images/thumbnails/all/1942.jpg';";
}

function renderGameCard(game) {
    if (game.id === undefined || game.id === null || game.id === "") {
        return "";
    }

    const thumb = resolveGameThumbForIndex(
        game.thumbnail || game.thumb || game.cover
    );

    const meta = buildGameMetaLine(game);
    const safeTitle = escapeHtml(game.title || "Unknown Game");
    const safeMeta = escapeHtml(meta);

    return `
        <a href="game.html?id=${encodeURIComponent(String(game.id))}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img src="${thumb}"
                     alt="${safeTitle}"
                     loading="lazy"
                     decoding="async"
                     fetchpriority="low"
                     onerror="${buildImgOnErrorFallback()}">
            </div>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${safeTitle}</h3>
                <div class="ccg-game-card__meta">${safeMeta}</div>
            </div>
        </a>
    `;
}
