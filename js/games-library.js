/* ============================================================
   GAMES LIBRARY — STABLE RESTORE + SMART THUMB CHECK
   - No games.json edits
   - No repo structure changes
   - Fallback only when truly missing
============================================================ */

let CCG_ALL_GAMES = [];
const ACCORDION_STATE_KEY = "ccgAccordionState";
const FALLBACK_THUMB = "../resources/images/thumbnails/all/1942.jpg";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("games.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load games.json");

        const games = await res.json();
        CCG_ALL_GAMES = Array.isArray(games) ? games : [];

        buildGamesAccordion(CCG_ALL_GAMES);
        restoreAccordionState();

        const totalEl = document.getElementById("gamesTotalCount");
        if (totalEl) totalEl.textContent = CCG_ALL_GAMES.length;

    } catch (err) {
        console.error("[CCG] Games Index failed:", err);
    }
});

/* ============================================================
   BUILD ACCORDION
============================================================ */

function buildGamesAccordion(games) {
    const container = document.getElementById("gamesAccordion");
    if (!container) return;

    container.innerHTML = "";

    const groups = {};

    games.forEach(game => {
        const title = (game.title || "").trim();
        const letter = title ? title[0].toUpperCase() : "#";
        (groups[letter] ||= []).push(game);
    });

    Object.keys(groups).sort().forEach(letter => {
        const group = document.createElement("div");
        group.className = "games-accordion__group";
        group.dataset.letter = letter;

        group.innerHTML = `
            <button class="games-accordion__header" type="button">
                <span>${letter}</span>
                <span>${groups[letter].length}</span>
            </button>
            <div class="games-accordion__content">
                <div class="games-grid">
                    ${groups[letter].map(renderGameCard).join("")}
                </div>
            </div>
        `;

        group.querySelector(".games-accordion__header")
            .addEventListener("click", () => {
                const open = group.classList.toggle("is-open");
                toggleAccordionState(letter, open);
            });

        container.appendChild(group);
    });
}

/* ============================================================
   RENDER GAME CARD (SMART THUMB)
============================================================ */

function renderGameCard(game) {
    const id = encodeURIComponent(game.id);
    const rawThumb = game.thumbnail || game.thumb || game.cover || "";
    const thumbPath = buildThumbPath(rawThumb);
    const title = game.title || "Untitled Game";

    return `
        <a href="game.html?id=${id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img
                    data-src="${thumbPath}"
                    alt="${title}"
                    loading="lazy"
                    decoding="async"
                    src="${FALLBACK_THUMB}"
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
   THUMB PATH BUILDER
============================================================ */

function buildThumbPath(raw) {
    if (!raw) return FALLBACK_THUMB;
    const clean = String(raw).replace(/^\/+/, "");
    return `../resources/images/thumbnails/all/${clean}`;
}

/* ============================================================
   ACCORDION STATE (SESSION ONLY)
============================================================ */

function getAccordionState() {
    try {
        return JSON.parse(sessionStorage.getItem(ACCORDION_STATE_KEY)) || [];
    } catch {
        return [];
    }
}

function toggleAccordionState(letter, open) {
    const state = new Set(getAccordionState());
    open ? state.add(letter) : state.delete(letter);
    sessionStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify([...state]));
}

function restoreAccordionState() {
    getAccordionState().forEach(letter => {
        const g = document.querySelector(
            `.games-accordion__group[data-letter="${letter}"]`
        );
        if (g) g.classList.add("is-open");
    });
}
