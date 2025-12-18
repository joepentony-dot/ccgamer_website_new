/* ============================================================
   CCG GAMES LIBRARY — W7 ACCORDION LOGIC FIX (FINAL)
   ------------------------------------------------------------
   • True toggle accordion (open / close)
   • Single section open at a time
   • Clicking open section closes it
   • Spine + accordion fully synced
   • Close returns scroll to top
   • Search-safe rebuild logic
   • ZERO visual or card impact
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
        restoreAccordionState();

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

        if (firstChar >= "0" && firstChar <= "9") {
            firstChar = "#";
        }

        if (!groups[firstChar]) groups[firstChar] = [];
        groups[firstChar].push(game);
    });

    Object.keys(groups).forEach(letter => {
        groups[letter].sort((a, b) =>
            (a.sorttitle || a.title).localeCompare(b.sorttitle || b.title)
        );
    });

    return groups;
}

/* ============================================================
   A–Z SPINE (LETTERS ONLY)
============================================================ */

function buildAlphaSpine(groups) {
    const strip = document.getElementById("gamesAlphaStrip");
    if (!strip) return;

    strip.innerHTML = "";

    const letters = Object.keys(groups).sort((a, b) => {
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
            toggleAccordion(letter);
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

    const letters = Object.keys(groups).sort((a, b) => {
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
   ACCORDION INTERACTION — FINAL LOGIC
============================================================ */

function attachAccordionEvents() {
    document.querySelectorAll(".games-accordion__header").forEach(header => {
        header.addEventListener("click", () => {
            toggleAccordion(header.dataset.letter);
        });
    });
}

function toggleAccordion(letter) {
    const sections = document.querySelectorAll(".games-accordion__section");
    const spineButtons = document.querySelectorAll("#gamesAlphaStrip button");

    let opened = false;

    sections.forEach(section => {
        const isTarget = section.dataset.letter === letter;
        const isOpen = section.classList.contains("is-open");

        if (isTarget && !isOpen) {
            section.classList.add("is-open");
            opened = true;
        } else {
            section.classList.remove("is-open");
        }
    });

    spineButtons.forEach(btn => {
        btn.classList.toggle("active", opened && btn.dataset.letter === letter);
    });

    if (opened) {
        saveAccordionState(letter);

        const target = document.querySelector(
            `.games-accordion__section[data-letter="${letter}"]`
        );

        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }

    } else {
        clearAccordionState();
        scrollToTop();
    }
}

/* ============================================================
   STATE
============================================================ */

function saveAccordionState(letter) {
    sessionStorage.setItem(ACCORDION_STATE_KEY, letter);
}

function clearAccordionState() {
    sessionStorage.removeItem(ACCORDION_STATE_KEY);
}

function restoreAccordionState() {
    const letter = sessionStorage.getItem(ACCORDION_STATE_KEY);
    if (letter) toggleAccordion(letter);
}

/* ============================================================
   SCROLL CONTROL
============================================================ */

function scrollToTop() {
    const anchor =
        document.querySelector(".games-tools") ||
        document.querySelector(".games-hero") ||
        document.body;

    anchor.scrollIntoView({ behavior: "smooth", block: "start" });
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
    t = t
        .replace("resources/images/thumbnails/all/", "")
        .replace("resources/images/thumbnails/", "")
        .replace("resources/images/", "");

    return `${THUMB_BASE_PATH}${t}`;
}
