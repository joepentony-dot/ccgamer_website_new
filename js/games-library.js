/* ============================================================
   GAMES LIBRARY — STABLE RESTORE + ALPHABET RESILIENCE
   ------------------------------------------------------------
   • Accordion layout (A–Z)
   • Alphabet strip (robust target detection)
   • Search & filter support
   • Session accordion state memory
   • Robust games.json path resolution
   • No runtime caching / observers / rAF optimisation
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

        const buildResult = buildGamesAccordion(CCG_ALL_GAMES);
        if (!buildResult) return;

        restoreAccordionState();
        wireSearchFilter();

        // Optional total count display
        const totalEl = document.getElementById("gamesTotalCount");
        if (totalEl) totalEl.textContent = String(CCG_ALL_GAMES.length);

        // If nothing is open, open the first group so the page doesn't feel "empty"
        ensureOneGroupVisible(buildResult.container);

    } catch (err) {
        console.error("[CCG] Games Index failed to initialise:", err);
    }
});

/* ============================================================
   ROBUST LOADER — games.json
============================================================ */

async function loadGamesJsonRobust() {
    // For /games/index.html the correct path is typically "games.json"
    const candidates = [
        "games.json",
        "../games/games.json",
        "../games.json"
    ];

    let lastErr = null;

    for (const url of candidates) {
        try {
            const res = await fetch(url, { cache: "no-store" });

            if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);

            const data = await res.json();
            if (!Array.isArray(data)) throw new Error(`Loaded but not an array from ${url}`);

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
        const group = document.querySelector(`.games-accordion__group[data-letter="${letter}"]`);
        if (group) group.classList.add("is-open");
    });
}

/* ============================================================
   FIND TARGETS (RESILIENT)
============================================================ */

function findAccordionContainer() {
    // Primary expected ID
    let el = document.getElementById("gamesAccordion");
    if (el) return el;

    // Common alternates / legacy fallbacks
    el = document.getElementById("gamesGrid");
    if (el) return el;

    el = document.querySelector(".games-accordion");
    if (el) return el;

    el = document.querySelector("[data-ccg-accordion]");
    if (el) return el;

    console.error("[CCG] No accordion container found (expected #gamesAccordion or similar).");
    return null;
}

function findAlphabetContainer() {
    const ids = ["gamesAlphabet", "alphabetStrip", "alphabetIndex", "alphaStrip", "gamesAlpha", "jumpLetters"];
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el) return el;
    }

    // If no explicit alphabet container, try to create one near the "Jump to letter" UI.
    // We look for an element that contains "Jump to letter" text and insert after it.
    const jumpLabel = Array.from(document.querySelectorAll("*"))
        .find(node => node.childNodes && node.childNodes.length === 1
            && node.textContent && node.textContent.trim().toLowerCase() === "jump to letter:");

    if (jumpLabel && jumpLabel.parentElement) {
        const wrap = document.createElement("div");
        wrap.id = "gamesAlphabet";
        jumpLabel.parentElement.appendChild(wrap);
        return wrap;
    }

    // Last resort: create at top of main content
    const main = document.querySelector("main") || document.body;
    const wrap = document.createElement("div");
    wrap.id = "gamesAlphabet";
    main.insertBefore(wrap, main.firstChild);
    return wrap;
}

/* ============================================================
   BUILD ACCORDION + ALPHABET
============================================================ */

function buildGamesAccordion(games) {
    const container = findAccordionContainer();
    if (!container) return null;

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
        return null;
    }

    letters.forEach(letter => {
        const groupEl = document.createElement("div");
        groupEl.className = "games-accordion__group";
        groupEl.dataset.letter = letter;

        groupEl.innerHTML = `
            <button class="games-accordion__header" type="button" aria-expanded="false">
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
            header.setAttribute("aria-expanded", isOpen ? "true" : "false");
            toggleAccordionState(letter, isOpen);
        });
    });

    buildAlphabetStrip(letters, container);

    return { container, letters };
}

function buildAlphabetStrip(letters, accordionContainer) {
    const alpha = findAlphabetContainer();
    if (!alpha) return;

    alpha.innerHTML = "";

    letters.forEach(letter => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "games-alpha__btn";
        btn.textContent = letter;

        btn.addEventListener("click", () => {
            const group = accordionContainer.querySelector(`.games-accordion__group[data-letter="${letter}"]`);
            if (!group) return;

            group.classList.add("is-open");
            toggleAccordionState(letter, true);

            const header = group.querySelector(".games-accordion__header");
            if (header) header.setAttribute("aria-expanded", "true");

            group.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        alpha.appendChild(btn);
    });

    console.log(`[CCG] Alphabet built: ${letters.length} letters`);
}

function ensureOneGroupVisible(container) {
    const anyOpen = container.querySelector(".games-accordion__group.is-open");
    if (anyOpen) return;

    const first = container.querySelector(".games-accordion__group");
    if (!first) return;

    first.classList.add("is-open");
    const letter = first.dataset.letter;
    if (letter) toggleAccordionState(letter, true);

    const header = first.querySelector(".games-accordion__header");
    if (header) header.setAttribute("aria-expanded", "true");
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
