/* ============================================================
   GAMES LIBRARY — OMEGA STABLE + DISCOVERABILITY (PHASE B2)
   ------------------------------------------------------------
   • Accordion layout (A–Z)
   • Search & filter support
   • Lazy-loaded thumbnails
   • NEW: Session-based accordion state memory
============================================================ */

let CCG_ALL_GAMES = [];
const ACCORDION_STATE_KEY = "ccgAccordionState";

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("games.json");
        const games = await response.json();

        CCG_ALL_GAMES = Array.isArray(games) ? games : [];

        buildGamesAccordion(CCG_ALL_GAMES);
        restoreAccordionState();

        wireSearchFilter();

    } catch (err) {
        console.error("[CCG] Failed to load games.json:", err);
    }
});

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

    if (isOpen) {
        state.add(letter);
    } else {
        state.delete(letter);
    }

    saveAccordionState([...state]);
}

function restoreAccordionState() {
    const state = getAccordionState();

    state.forEach(letter => {
        const group = document.querySelector(
            `.games-accordion__group[data-letter="${letter}"]`
        );
        if (group) {
            group.classList.add("is-open");
        }
    });
}

/* ============================================================
   BUILD ACCORDION
============================================================ */

function buildGamesAccordion(games) {
    const container = document.getElementById("gamesAccordion");
    if (!container) return;

    container.innerHTML = "";

    const groups = {};

    games.forEach(game => {
        const firstLetter = (game.title || "#")[0].toUpperCase();
        if (!groups[firstLetter]) groups[firstLetter] = [];
        groups[firstLetter].push(game);
    });

    Object.keys(groups)
        .sort()
        .forEach(letter => {
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
   GAME CARD RENDERER (PRESERVED)
============================================================ */

function renderGameCard(game) {
    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

    return `
        <a href="game.html?id=${game.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img
                    src="${thumb}"
                    alt="${game.title}"
                    loading="lazy"
                    decoding="async"
                >
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

/* ============================================================
   THUMBNAIL RESOLVER (PRESERVED)
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
   SEARCH / FILTER (PRESERVED)
============================================================ */

function wireSearchFilter() {
    const input = document.getElementById("gamesSearch");
    if (!input) return;

    input.addEventListener("input", () => {
        const term = input.value.toLowerCase();

        document.querySelectorAll(".games-accordion__group").forEach(group => {
            const cards = group.querySelectorAll(".ccg-game-card");
            let anyVisible = false;

            cards.forEach(card => {
                const title = card
                    .querySelector(".ccg-game-card__title")
                    .textContent.toLowerCase();

                const visible = title.includes(term);
                card.style.display = visible ? "" : "none";
                if (visible) anyVisible = true;
            });

            group.style.display = anyVisible ? "" : "none";
        });
    });
}
