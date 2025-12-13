/* ============================================================
   GAMES LIBRARY — STABLE RESTORE (DETERMINISTIC)
   ------------------------------------------------------------
   • Accordion layout (A–Z)
   • Alphabet strip (matches existing HTML)
   • Search & filter support
   • Session accordion state memory
   • SINGLE, CORRECT games.json path
============================================================ */

let CCG_ALL_GAMES = [];
const ACCORDION_STATE_KEY = "ccgAccordionState";

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("games.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`games.json failed: ${res.status}`);
        const games = await res.json();

        if (!Array.isArray(games)) {
            throw new Error("games.json is not an array");
        }

        CCG_ALL_GAMES = games;

        console.log(`[CCG] Games loaded: ${CCG_ALL_GAMES.length}`);

        const build = buildGamesAccordion(CCG_ALL_GAMES);
        if (!build) return;

        restoreAccordionState();
        wireSearchFilter();

        const totalEl = document.getElementById("gamesTotalCount");
        if (totalEl) totalEl.textContent = String(CCG_ALL_GAMES.length);

        ensureOneGroupVisible(build.container);

    } catch (err) {
        console.error("[CCG] Games Index failed:", err);
    }
});

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

function saveAccordionState(state) {
    sessionStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify(state));
}

function toggleAccordionState(letter, open) {
    const set = new Set(getAccordionState());
    open ? set.add(letter) : set.delete(letter);
    saveAccordionState([...set]);
}

function restoreAccordionState() {
    getAccordionState().forEach(letter => {
        const g = document.querySelector(`.games-accordion__group[data-letter="${letter}"]`);
        if (g) g.classList.add("is-open");
    });
}

/* ============================================================
   BUILD ACCORDION + ALPHABET
============================================================ */

function buildGamesAccordion(games) {
    const container = document.getElementById("gamesAccordion");
    if (!container) {
        console.error("[CCG] #gamesAccordion not found");
        return null;
    }

    container.innerHTML = "";

    const groups = {};

    games.forEach(game => {
        const title = (game.title || "").trim();
        const letter = title ? title[0].toUpperCase() : "#";
        if (!groups[letter]) groups[letter] = [];
        groups[letter].push(game);
    });

    const letters = Object.keys(groups).sort();

    letters.forEach(letter => {
        const group = document.createElement("div");
        group.className = "games-accordion__group";
        group.dataset.letter = letter;

        group.innerHTML = `
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

        const header = group.querySelector(".games-accordion__header");
        header.addEventListener("click", () => {
            const open = group.classList.toggle("is-open");
            header.setAttribute("aria-expanded", open ? "true" : "false");
            toggleAccordionState(letter, open);
        });

        container.appendChild(group);
    });

    buildAlphabetStrip(letters, container);
    return { container, letters };
}

function buildAlphabetStrip(letters, accordion) {
    const strip = document.getElementById("gamesAlphaStrip");
    if (!strip) {
        console.warn("[CCG] #gamesAlphaStrip not found");
        return;
    }

    strip.innerHTML = "";

    letters.forEach(letter => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "games-alpha__btn";
        btn.textContent = letter;

        btn.addEventListener("click", () => {
            const group = accordion.querySelector(
                `.games-accordion__group[data-letter="${letter}"]`
            );
            if (!group) return;

            group.classList.add("is-open");
            toggleAccordionState(letter, true);

            const header = group.querySelector(".games-accordion__header");
            if (header) header.setAttribute("aria-expanded", "true");

            group.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        strip.appendChild(btn);
    });
}

/* ============================================================
   VISIBILITY SAFETY
============================================================ */

function ensureOneGroupVisible(container) {
    if (container.querySelector(".games-accordion__group.is-open")) return;

    const first = container.querySelector(".games-accordion__group");
    if (!first) return;

    first.classList.add("is-open");
    toggleAccordionState(first.dataset.letter, true);

    const header = first.querySelector(".games-accordion__header");
    if (header) header.setAttribute("aria-expanded", "true");
}

/* ============================================================
   CARD RENDERING
============================================================ */

function renderGameCard(game) {
    const thumb = resolveGameThumb(game.thumbnail);
    const title = game.title || "Unknown";

    return `
        <a href="game.html?id=${game.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img src="${thumb}" alt="${title}">
            </div>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${title}</h3>
                <div class="ccg-game-card__meta">
                    ${game.year || ""} · ${game.system || ""}
                </div>
            </div>
        </a>
    `;
}

function resolveGameThumb(raw) {
    if (!raw) return "../resources/images/thumbnails/all/1942.jpg";
    return `../${raw.replace(/^\/+/, "")}`;
}

/* ============================================================
   SEARCH / FILTER
============================================================ */

function wireSearchFilter() {
    const input = document.getElementById("gamesSearchInput");
    if (!input) return;

    input.addEventListener("input", () => {
        const term = input.value.toLowerCase();
        const groups = document.querySelectorAll(".games-accordion__group");

        groups.forEach(group => {
            let anyVisible = false;

            group.querySelectorAll(".ccg-game-card").forEach(card => {
                const title = card.querySelector(".ccg-game-card__title")?.textContent.toLowerCase() || "";
                const visible = title.includes(term);
                card.style.display = visible ? "" : "none";
                if (visible) anyVisible = true;
            });

            group.style.display = anyVisible ? "" : "none";
        });
    });
}
