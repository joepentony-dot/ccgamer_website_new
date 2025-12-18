/* ============================================================
   CCG GAMES LIBRARY — OMEGA WOW INDEX
   Phase W7.2-A — LOGIC REFINEMENT (SAFE)
   ------------------------------------------------------------
   • Numeric titles grouped under '#'
   • Removes numeric letter sections (1,2,7...)
   • Spine shows LETTERS ONLY (no counts)
   • ZERO visual logic, ZERO card changes
============================================================ */

let CCG_ALL_GAMES = [];

const ACCORDION_STATE_KEY = "ccgAccordionState";
const THUMB_BASE_PATH = "../resources/images/thumbnails/all/";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("../games/games.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load games.json");

        CCG_ALL_GAMES = await res.json();
        buildGamesIndex(CCG_ALL_GAMES);
        setupSearch(CCG_ALL_GAMES);

    } catch (err) {
        console.error("[CCG] Games index load failed:", err);
    }
});

/* ============================================================
   CORE BUILD
============================================================ */

function buildGamesIndex(games) {
    const grouped = groupGamesByLetter(games);

    buildAlphaSpine(grouped);
    buildAccordion(grouped);
}

/* ============================================================
   GROUPING LOGIC (A–Z + #)
============================================================ */

function groupGamesByLetter(games) {
    const groups = {};

    games.forEach(game => {
        const title = (game.sorttitle || game.title || "").trim();
        if (!title) return;

        let firstChar = title.charAt(0).toUpperCase();

        // 🔧 ALL numeric titles go under '#'
        if (firstChar >= "0" && firstChar <= "9") {
            firstChar = "#";
        }

        if (!groups[firstChar]) {
            groups[firstChar] = [];
        }

        groups[firstChar].push(game);
    });

    // Sort games within each group
    Object.keys(groups).forEach(letter => {
        groups[letter].sort((a, b) =>
            (a.sorttitle || a.title).localeCompare(b.sorttitle || b.title)
        );
    });

    return groups;
}

/* ============================================================
   ALPHA SPINE (LETTERS ONLY — NO COUNTS)
============================================================ */

function buildAlphaSpine(groups) {
    const strip = document.getElementById("gamesAlphaStrip");
    if (!strip) return;

    strip.innerHTML = "";

    const letters = Object.keys(groups)
        .sort((a, b) => {
            if (a === "#") return -1;
            if (b === "#") return 1;
            return a.localeCompare(b);
        });

    letters.forEach(letter => {
        const btn = document.createElement("button");
        btn.className = "games-alpha__btn";
        btn.textContent = letter;
        btn.dataset.letter = letter;

        btn.addEventListener("click", () => {
            openAccordionSection(letter);
        });

        strip.appendChild(btn);
    });
}

/* ============================================================
   ACCORDION BUILD
============================================================ */

function buildAccordion(groups) {
    const container = document.getElementById("gamesAccordion");
    if (!container) return;

    container.innerHTML = "";

    const letters = Object.keys(groups)
        .sort((a, b) => {
            if (a === "#") return -1;
            if (b === "#") return 1;
            return a.localeCompare(b);
        });

    letters.forEach(letter => {
        const section = document.createElement("section");
        section.className = "games-accordion__section";
        section.dataset.letter = letter;

        section.innerHTML = `
            <button class="games-accordion__header" data-letter="${letter}">
                <span class="games-accordion__letter">${letter}</span>
            </button>
            <div class="games-accordion__content">
                <div class="games-grid">
                    ${groups[letter].map(renderGameCard).join("")}
                </div>
            </div>
        `;

        container.appendChild(section);
    });

    attachAccordionEvents();
}

/* ============================================================
   ACCORDION INTERACTION
============================================================ */

function attachAccordionEvents() {
    const headers = document.querySelectorAll(".games-accordion__header");

    headers.forEach(header => {
        header.addEventListener("click", () => {
            const letter = header.dataset.letter;
            toggleAccordion(letter);
        });
    });
}

function toggleAccordion(letter) {
    const sections = document.querySelectorAll(".games-accordion__section");

    sections.forEach(section => {
        const isTarget = section.dataset.letter === letter;
        section.classList.toggle("is-open", isTarget);
    });

    saveAccordionState(letter);
}

function openAccordionSection(letter) {
    toggleAccordion(letter);

    const section = document.querySelector(
        `.games-accordion__section[data-letter="${letter}"]`
    );

    if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function saveAccordionState(letter) {
    sessionStorage.setItem(ACCORDION_STATE_KEY, letter);
}

/* ============================================================
   SEARCH (UNCHANGED)
============================================================ */

function setupSearch(allGames) {
    const input = document.getElementById("gamesSearchInput");
    const clearBtn = document.getElementById("gamesSearchClear");

    if (!input) return;

    input.addEventListener("input", () => {
        const query = input.value.toLowerCase();
        filterGames(query, allGames);
    });

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            input.value = "";
            filterGames("", allGames);
        });
    }
}

function filterGames(query, allGames) {
    const filtered = allGames.filter(game =>
        (game.title || "").toLowerCase().includes(query)
    );

    buildGamesIndex(filtered);
}

/* ============================================================
   CARD RENDER (UNCHANGED)
============================================================ */

function renderGameCard(game) {
    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

    return `
        <a href="game.html?id=${encodeURIComponent(game.id)}"
           class="ccg-game-card">
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
    if (!raw) return `${THUMB_BASE_PATH}1942.jpg`;

    let t = String(raw).replace(/^\/+/, "");
    t = t.replace("resources/images/thumbnails/all/", "")
         .replace("resources/images/thumbnails/", "")
         .replace("resources/images/", "");

    return `${THUMB_BASE_PATH}${t}`;
}
