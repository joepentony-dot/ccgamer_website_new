/* ============================================================
   GAMES LIBRARY — OMEGA UX POLISH (INDEX ONLY)
   ------------------------------------------------------------
   • Preserves existing path-safe thumbnail logic
   • Preserves session-based accordion memory
   • Adds TRUE accordion behaviour (open / close)
   • Alphabet strip now OPENS + SCROLLS to letter
   • Search results auto-open relevant letters
   • ZERO CSS changes
============================================================ */

let CCG_ALL_GAMES = [];
const ACCORDION_STATE_KEY = "ccgAccordionState";
const THUMB_BASE_PATH = "../resources/images/thumbnails/all/";

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("../games/games.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load games.json");

        const games = await res.json();
        CCG_ALL_GAMES = Array.isArray(games) ? games : [];

        buildGamesAccordion(CCG_ALL_GAMES);
        buildAlphaStrip(CCG_ALL_GAMES);
        restoreAccordionState();

        const totalEl = document.getElementById("gamesTotalCount");
        if (totalEl) totalEl.textContent = CCG_ALL_GAMES.length;

        wireSearch();

    } catch (err) {
        console.error("[CCG] Games Index failed:", err);
    }
});

/* ============================================================
   ACCORDION BUILD
============================================================ */

function buildGamesAccordion(games) {
    const container = document.getElementById("gamesAccordion");
    if (!container) return;

    container.innerHTML = "";

    const groups = {};

    games.forEach(game => {
        const title = (game.title || "").trim();
        const letter = title ? title[0].toUpperCase() : "#";

        if (!groups[letter]) {
            groups[letter] = [];
        }
        groups[letter].push(game);
    });

    Object.keys(groups).sort().forEach(letter => {
        const group = document.createElement("div");
        group.className = "games-accordion__group";
        group.dataset.letter = letter;

        group.innerHTML = `
            <button class="games-accordion__header" type="button" aria-expanded="false">
                <span>${letter}</span>
                <span>${groups[letter].length}</span>
            </button>
            <div class="games-accordion__content" hidden>
                <div class="games-grid">
                    ${groups[letter].map(renderGameCard).join("")}
                </div>
            </div>
        `;

        const header = group.querySelector(".games-accordion__header");
        const content = group.querySelector(".games-accordion__content");

        header.addEventListener("click", () => {
            const isOpen = group.classList.toggle("is-open");
            header.setAttribute("aria-expanded", isOpen);
            content.hidden = !isOpen;
            toggleAccordionState(letter, isOpen);
        });

        container.appendChild(group);
    });
}

/* ============================================================
   ALPHABET STRIP
============================================================ */

function buildAlphaStrip(games) {
    const strip = document.getElementById("gamesAlphaStrip");
    if (!strip) return;

    strip.innerHTML = "";

    const letters = new Set();
    games.forEach(g => {
        const t = (g.title || "").trim();
        letters.add(t ? t[0].toUpperCase() : "#");
    });

    const ordered = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];

    ordered.forEach(letter => {
        const exists = letters.has(letter);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "games-alpha__letter";
        btn.textContent = letter;
        btn.disabled = !exists;

        if (exists) {
            btn.addEventListener("click", () => openAndScrollToLetter(letter));
        }

        strip.appendChild(btn);
    });
}

function openAndScrollToLetter(letter) {
    const group = document.querySelector(
        `.games-accordion__group[data-letter="${letter}"]`
    );
    if (!group) return;

    const header = group.querySelector(".games-accordion__header");
    const content = group.querySelector(".games-accordion__content");

    if (!group.classList.contains("is-open")) {
        group.classList.add("is-open");
        header.setAttribute("aria-expanded", "true");
        content.hidden = false;
        toggleAccordionState(letter, true);
    }

    group.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ============================================================
   SEARCH
============================================================ */

function wireSearch() {
    const input = document.getElementById("gamesSearchInput");
    const clearBtn = document.getElementById("gamesSearchClear");
    if (!input) return;

    input.addEventListener("input", () => applySearch(input.value));
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            input.value = "";
            applySearch("");
        });
    }
}

function applySearch(query) {
    const term = query.trim().toLowerCase();
    const groups = document.querySelectorAll(".games-accordion__group");

    let matches = 0;
    const openLetters = new Set();

    groups.forEach(group => {
        const cards = group.querySelectorAll(".ccg-game-card");
        let groupHasMatch = false;

        cards.forEach(card => {
            const hit = !term || card.textContent.toLowerCase().includes(term);
            card.style.display = hit ? "" : "none";
            if (hit) {
                matches++;
                groupHasMatch = true;
            }
        });

        const header = group.querySelector(".games-accordion__header");
        const content = group.querySelector(".games-accordion__content");

        if (groupHasMatch) {
            group.classList.add("is-open");
            header.setAttribute("aria-expanded", "true");
            content.hidden = false;
            openLetters.add(group.dataset.letter);
        } else {
            group.classList.remove("is-open");
            header.setAttribute("aria-expanded", "false");
            content.hidden = true;
        }
    });

    sessionStorage.setItem(
        ACCORDION_STATE_KEY,
        JSON.stringify([...openLetters])
    );

    const resultsEl = document.getElementById("gamesResultsCount");
    if (resultsEl) resultsEl.textContent = matches;

    const empty = document.getElementById("gamesEmptyState");
    if (empty) empty.hidden = matches > 0;
}

/* ============================================================
   GAME CARD
============================================================ */

function renderGameCard(game) {
    const id = encodeURIComponent(game.id || "");
    const thumbSrc = resolveGameThumb(
        game.thumbnail || game.thumb || game.cover
    );

    return `
        <a href="game.html?id=${id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                ${thumbSrc ? `
                    <img src="${thumbSrc}"
                         alt="${game.title}"
                         loading="lazy"
                         decoding="async"
                         onerror="this.remove()">
                ` : ``}
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
   THUMB RESOLUTION
============================================================ */

function resolveGameThumb(raw) {
    if (!raw) return "";
    const filename = String(raw).replace(/^.*[\\/]/, "").trim();
    return filename ? THUMB_BASE_PATH + filename : "";
}

/* ============================================================
   ACCORDION STATE
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
    sessionStorage.setItem(
        ACCORDION_STATE_KEY,
        JSON.stringify([...state])
    );
}

function restoreAccordionState() {
    getAccordionState().forEach(letter => {
        const g = document.querySelector(
            `.games-accordion__group[data-letter="${letter}"]`
        );
        if (!g) return;

        const header = g.querySelector(".games-accordion__header");
        const content = g.querySelector(".games-accordion__content");

        g.classList.add("is-open");
        header.setAttribute("aria-expanded", "true");
        content.hidden = false;
    });
}
