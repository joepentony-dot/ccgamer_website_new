/* ============================================================
   CCG GAMES LIBRARY — OMEGA WOW INDEX
   W7.5 — LOGIC LOCK (SAFE)
   ------------------------------------------------------------
   • Numeric titles grouped under '#'
   • Spine shows LETTERS ONLY (no counts)
   • TRUE toggle accordion (open / close)
   • Single-open section enforcement
   • Close = return to top
   • Active spine sync
   • HARD JS collapse/expand (no reliance on CSS)
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

        // Restore after first build
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

    // After rebuild (e.g., search), try to restore if possible
    restoreAccordionState(true);
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

        // ALL numeric titles → '#'
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

function getSortedLetters(groups) {
    return Object.keys(groups).sort((a, b) => {
        if (a === "#") return -1;
        if (b === "#") return 1;
        return a.localeCompare(b);
    });
}

/* ============================================================
   ALPHA SPINE (LETTERS ONLY)
============================================================ */

function buildAlphaSpine(groups) {
    const strip = document.getElementById("gamesAlphaStrip");
    if (!strip) return;

    strip.innerHTML = "";

    const letters = getSortedLetters(groups);

    letters.forEach(letter => {
        const btn = document.createElement("button");
        btn.className = "games-alpha__btn";
        btn.textContent = letter;
        btn.dataset.letter = letter;

        btn.addEventListener("click", () => {
            toggleAccordion(letter, { scroll: true });
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

    const letters = getSortedLetters(groups);

    letters.forEach(letter => {
        const section = document.createElement("section");
        section.className = "games-accordion__section";
        section.dataset.letter = letter;

        section.innerHTML = `
            <button class="games-accordion__header" data-letter="${letter}" aria-expanded="false">
                <span class="games-accordion__letter">${letter}</span>
            </button>
            <div class="games-accordion__content" style="display:none;">
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
   ACCORDION INTERACTION (LOCKED)
============================================================ */

function attachAccordionEvents() {
    const headers = document.querySelectorAll(".games-accordion__header");

    headers.forEach(header => {
        header.addEventListener("click", () => {
            toggleAccordion(header.dataset.letter, { scroll: false });
        });
    });
}

/**
 * Toggle logic:
 * - If target is closed => open it, close others
 * - If target is open   => close all + return to top
 */
function toggleAccordion(letter, opts = {}) {
    const { scroll = false, silent = false } = opts;

    const sections = document.querySelectorAll(".games-accordion__section");
    if (!sections.length) return;

    const target = document.querySelector(`.games-accordion__section[data-letter="${letter}"]`);
    const targetIsOpen = !!(target && target.classList.contains("is-open"));

    if (!target) {
        // Stored letter no longer exists after filtering
        clearAccordionState();
        syncAlphaActive(null);
        return;
    }

    if (targetIsOpen) {
        // CLOSE ALL
        closeAllSections();
        clearAccordionState();
        syncAlphaActive(null);

        if (!silent) scrollToTop();
        return;
    }

    // OPEN TARGET + CLOSE OTHERS
    sections.forEach(section => {
        const isTarget = section.dataset.letter === letter;
        setSectionOpen(section, isTarget);
    });

    saveAccordionState(letter);
    syncAlphaActive(letter);

    if (!silent && scroll) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function closeAllSections() {
    const sections = document.querySelectorAll(".games-accordion__section");
    sections.forEach(section => setSectionOpen(section, false));
}

function setSectionOpen(section, open) {
    section.classList.toggle("is-open", open);

    const header = section.querySelector(".games-accordion__header");
    const content = section.querySelector(".games-accordion__content");

    if (header) header.setAttribute("aria-expanded", open ? "true" : "false");
    if (content) content.style.display = open ? "" : "none";
}

function syncAlphaActive(letterOrNull) {
    const spineButtons = document.querySelectorAll("#gamesAlphaStrip button");
    spineButtons.forEach(btn => {
        btn.classList.toggle("active", !!letterOrNull && btn.dataset.letter === letterOrNull);
    });
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

/**
 * restoreAfterRebuild:
 * - if true, only restore if the stored letter exists in the newly built DOM
 * - avoids opening random letters after filtering
 */
function restoreAccordionState(restoreAfterRebuild = false) {
    const letter = sessionStorage.getItem(ACCORDION_STATE_KEY);
    if (!letter) return;

    const exists = document.querySelector(`.games-accordion__section[data-letter="${letter}"]`);
    if (!exists) {
        clearAccordionState();
        syncAlphaActive(null);
        return;
    }

    // Silent open (no scroll jump during rebuild / load)
    toggleAccordion(letter, { scroll: false, silent: restoreAfterRebuild });
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
   SEARCH (UNCHANGED MECHANICS)
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
