/* ============================================================
   CCG GAMES LIBRARY — OMEGA WOW INDEX
   Phase W7.8 — FINAL LOGIC LOCK
   ------------------------------------------------------------
   • A–Z accordion with numeric (#) bucket
   • TRUE open / close behaviour
   • Single section open at a time
   • Clicking open section closes it
   • Spine + accordion always in sync
   • Search rebuilds accordion safely
   • ZERO impact on other pages
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
        console.error("[CCG] Games index failed:", err);
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

        let letter = title.charAt(0).toUpperCase();
        if (letter >= "0" && letter <= "9") letter = "#";

        if (!groups[letter]) groups[letter] = [];
        groups[letter].push(game);
    });

    Object.keys(groups).forEach(letter => {
        groups[letter].sort((a, b) =>
            (a.sorttitle || a.title).localeCompare(b.sorttitle || b.title)
        );
    });

    return groups;
}

/* ============================================================
   ALPHA SPINE (LETTERS ONLY)
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

        btn.addEventListener("click", () => toggleAccordion(letter));
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
   ACCORDION INTERACTION (FINAL LOCK)
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
    const spineBtns = document.querySelectorAll(".games-alpha__btn");

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

    spineBtns.forEach(btn => {
        btn.classList.toggle("active", opened && btn.dataset.letter === letter);
    });

    if (opened) {
        sessionStorage.setItem(ACCORDION_STATE_KEY, letter);
        document
            .querySelector(`.games-accordion__section[data-letter="${letter}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
        sessionStorage.removeItem(ACCORDION_STATE_KEY);
        scrollToTop();
    }
}

/* ============================================================
   STATE RESTORE
============================================================ */

function restoreAccordionState() {
    const letter = sessionStorage.getItem(ACCORDION_STATE_KEY);
    if (letter) toggleAccordion(letter);
}

/* ============================================================
   SEARCH (SAFE REBUILD)
============================================================ */

function setupSearch(allGames) {
    const input = document.getElementById("gamesSearchInput");
    const clearBtn = document.getElementById("gamesSearchClear");

    if (!input) return;

    input.addEventListener("input", () => {
        const q = input.value.toLowerCase();
        const filtered = allGames.filter(g =>
            (g.title || "").toLowerCase().includes(q)
        );
        buildGamesIndex(filtered);
    });

    clearBtn?.addEventListener("click", () => {
        input.value = "";
        buildGamesIndex(allGames);
    });
}

/* ============================================================
   SCROLL CONTROL
============================================================ */

function scrollToTop() {
    document
        .querySelector(".games-tools")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ============================================================
   CARD RENDER (THUMB SAFE)
============================================================ */

function renderGameCard(game) {
    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

    return `
        <a href="game.html?id=${encodeURIComponent(game.id)}"
           class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img src="${thumb}" alt="${game.title}" loading="lazy">
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
