/* ============================================================
   GAMES LIBRARY — STABLE RESTORE + URL SAFE IDS
============================================================ */

let CCG_ALL_GAMES = [];
const ACCORDION_STATE_KEY = "ccgAccordionState";

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

        const header = group.querySelector(".games-accordion__header");
        header.addEventListener("click", () => {
            const open = group.classList.toggle("is-open");
            toggleAccordionState(letter, open);
        });

        container.appendChild(group);
    });
}

function renderGameCard(game) {
    const id = encodeURIComponent(game.id);
    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

    return `
        <a href="game.html?id=${id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img src="${thumb}" alt="${game.title}">
            </div>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>
                <div class="ccg-game-card__meta">
                    ${(game.year || "")} · ${(game.system || "")}
                </div>
            </div>
        </a>
    `;
}

function resolveGameThumb(raw) {
    if (!raw) return "../resources/images/thumbnails/all/1942.jpg";
    let t = String(raw).replace(/^\/+/, "");
    return `../resources/images/thumbnails/all/${t}`;
}

/* ===== Accordion state ===== */

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
        const g = document.querySelector(`.games-accordion__group[data-letter="${letter}"]`);
        if (g) g.classList.add("is-open");
    });
}
