/* ============================================================
   GAMES LIBRARY — STABLE RESTORE (BACKBONE FIX)
   ------------------------------------------------------------
   • Accordion layout (A–Z)
   • Search & filter support
   • Session-based accordion state memory
   • NO runtime caching
   • NO IntersectionObserver tuning
   • NO rAF optimisation
   • CRITICAL: Robust games.json path resolution
============================================================ */

let CCG_ALL_GAMES = [];
const ACCORDION_STATE_KEY = "ccgAccordionState";

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const games = await loadGamesJsonRobust();

        CCG_ALL_GAMES = Array.isArray(games) ? games : [];

        console.log(`[CCG] Games loaded: ${CCG_ALL_GAMES.length}`);

        buildGamesAccordion(CCG_ALL_GAMES);
        restoreAccordionState();
        wireSearchFilter();

        const totalEl = document.getElementById("gamesTotalCount");
        if (totalEl) totalEl.textContent = String(CCG_ALL_GAMES.length);

    } catch (err) {
        console.error("[CCG] Games Index failed to initialise:", err);
    }
});

/* ============================================================
   ROBUST LOADER — games.json
============================================================ */

async function loadGamesJsonRobust() {
    const candidates = [
        "games.json",
        "../games/games.json",
        "../games.json"
    ];

    let lastErr = null;

    for (const url of candidates) {
        try {
            const res = await fetch(url, { cache: "no-store" });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status} on ${url}`);
            }

            const data = await res.json();

            if (!Array.isArray(data)) {
                throw new Error(`Loaded but not an array from ${url}`);
            }

            console.log(`[CCG] Loaded games.json from: ${url}`);
            return data;

        } catch (e) {
            lastErr = e;
            console.warn(`[CCG] Failed loading ${url}:`, e);
        }
    }

    throw lastErr || new Error("Unknown error loading games.json");
}

/* ============================================================
   ACCORDION STATE (SESSION)
============================================================ */

function getAccordionState() {
    try {
        const raw = sessionStorage.getItem(ACCORDION_STATE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveAccordionState(state) {
    sessionStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify(state));
}

function toggleAccordionState(letter, isOpen) {
    const state = new Set(getAccordionState());
    if (isOpen) state.add(letter);
    else state.delete(letter);
    saveAccordionState([...state]);
}

function restoreAccordionState() {
    const state = getAccordionState();

    state.forEach(letter => {
        const group = document.querySelector(
            `.games-accordion__group[data-letter="${letter}"]`
        );
        if (group) group.classList.add("is-open");
    });
}

/* ============================================================
   BUILD ACCORDION
============================================================ */

function buildGamesAccordion(games) {
    const container = document.getElementById("gamesAccordion");
    if (!container) {
        console.error("[CCG] Missing #gamesAccordion in games/index.html");
        return;
    }

    container.innerHTML = "";

    const groups = {};

    games.forEach(game => {
        const title = (game.title || "").toString().trim();
        const firstLetter = (title ? title[0] : "#").toUpperCase();

        if (!groups[firstLetter]) groups[firstLetter] = [];
        groups[firstLetter].push(game);
    });

    const letters = Object.keys(groups).sort();

    if (letters.length === 0) {
        console.warn("[CCG] No games grouped — check games.json contents");
        return;
    }

    letters.forEach(letter => {
        const groupEl = document.createElement("div");
        groupEl.className = "games-accordion__group";
        groupEl.dataset.letter = letter;

        groupEl.innerHTML = `
            <button class="games-accordion__header" type="button">
                <span class="games-accordion__letter">${letter}</span>
                <span class="games-accordion__count">${groups[letter].length}</span>
            </button>
            <div class="games-accordion__content">
                <div class="games-grid">
                    ${groups[letter].map(renderGameCard).join("")}
                </div>
            </div>
        `;

        container.appendChild(groupEl);

        const header = groupEl.querySelector(".games-accordion__header");
        header.addEventListener("click", () => {
            const isOpen = groupEl.classList.toggle("is-open");
            toggleAccordionState(letter, isOpen);
        });
    });
}

/* ============================================================
   GAME CARD RENDERER
============================================================ */

function renderGameCard(game) {
    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);
    const title = (game.title || "Unknown").toString();

    return `
        <a href="game.html?id=${game.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img
                    src="${thumb}"
                    alt="${title}"
                    loading="lazy"
                    decoding="async"
                >
            </div>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${title}</h3>
                <div class="ccg-game-card__meta">
                    ${(game.year || "")} · ${(game.system || "")}
                </div>
            </div>
        </a>
    `;
}

/* ============================================================
   THUMBNAIL RESOLVER
============================================================ */

function resolveGameThumb(raw) {
    if (!raw) return "../resources/images/thumbnails/all/1942.jpg";

    let t = String(raw).trim().replace(/^\/+/, "");
    t = t.replace("resources/images/thumbnails/all/", "")
         .replace("resources/images/thumbnails/", "")
         .replace("resources/images/", "");

    return `../resources/images/thumbnails/all/${t || "1942.jpg"}`;
}

/* ============================================================
   SEARCH / FILTER
============================================================ */

function wireSearchFilter() {
    const input = document.getElementById("gamesSearch");
    if (!input) return;

    input.addEventListener("input", () => {
        const term = (input.value || "").toLowerCase();
        const groups = document.querySelectorAll(".games-accordion__group");

        groups.forEach(group => {
            let anyVisible = false;

            group.querySelectorAll(".ccg-game-card").forEach(card => {
                const titleEl = card.querySelector(".ccg-game-card__title");
                const title = (titleEl ? titleEl.textContent : "").toLowerCase();

                const visible = title.includes(term);
                card.style.display = visible ? "" : "none";
                if (visible) anyVisible = true;
            });

            group.style.display = anyVisible ? "" : "none";
        });
    });
}
