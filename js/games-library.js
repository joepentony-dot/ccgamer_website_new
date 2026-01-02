/* ============================================================
   CCG GAMES LIBRARY — W7 ACCORDION LOGIC FIX (FINAL LOCK)
   ------------------------------------------------------------
   • True toggle accordion (open / close)
   • Single section open at a time
   • Clicking open section closes it
   • Spine + accordion fully synced
   • Close returns scroll to top
   • Search-safe rebuild (state preserved when possible)
   • Restore state without auto-scroll jump
   • ZERO visual or card impact
============================================================ */

let CCG_ALL_GAMES = [];
let CCG_GAMES_TOTAL = 0;

const ACCORDION_STATE_KEY = "ccgAccordionState";
const THUMB_BASE_PATH = "../resources/images/thumbnails/all/";
const THUMB_PLACEHOLDER =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const CCG_PREFERS_REDUCED_MOTION = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("../games/games.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load games.json");

        CCG_ALL_GAMES = await res.json();
        CCG_GAMES_TOTAL = CCG_ALL_GAMES.length;

        buildGamesIndex(CCG_ALL_GAMES);
        setupSearch(CCG_ALL_GAMES);

        updateCounts(CCG_ALL_GAMES.length);

        // Restore without scroll jump
        restoreAccordionState({ silent: true });

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

    setEmptyState(!games.length);
    updateCounts(games.length);

    // After a rebuild (search), re-apply state if it still exists
    restoreAccordionState({ silent: true, validatePresence: true });
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

        // Numeric titles -> '#'
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

        const letterSlug = letter === "#" ? "num" : letter.toLowerCase();
        const headerId = `games-accordion-header-${letterSlug}`;
        const contentId = `games-accordion-panel-${letterSlug}`;

        section.innerHTML = `
            <button class="games-accordion__header" data-letter="${letter}" type="button" id="${headerId}" aria-controls="${contentId}">
                <span class="games-accordion__letter">${letter}</span>
                <span class="games-accordion__chevron">⌄</span>
            </button>
            <div class="games-accordion__content" id="${contentId}" role="region" aria-labelledby="${headerId}" hidden>
                <div class="games-grid">
                    ${groups[letter].map(renderGameCard).join("")}
                </div>
            </div>
        `;

        container.appendChild(section);
    });

    attachAccordionEvents();
    initThumbLazyLoad();
}

/* ============================================================
   ACCORDION INTERACTION — FINAL LOCK
============================================================ */

function attachAccordionEvents() {
    document.querySelectorAll(".games-accordion__header").forEach(header => {
        header.setAttribute("aria-expanded", "false");
        header.addEventListener("click", () => {
            toggleAccordion(header.dataset.letter);
        });
    });
}

/**
 * Toggle an accordion section.
 * @param {string} letter
 * @param {{silent?: boolean}} opts
 */
function toggleAccordion(letter, opts = {}) {
    const sections = document.querySelectorAll(".games-accordion__section");
    if (!sections.length) return;

    const target = document.querySelector(`.games-accordion__section[data-letter="${letter}"]`);
    if (!target) {
        // If letter doesn't exist in current build (e.g. search filter)
        clearAccordionState();
        setSpineActive(null);
        if (!opts.silent) scrollToTop();
        return;
    }

    const wasOpen = target.classList.contains("is-open");
    const willOpen = !wasOpen;

    // Single-open enforcement
    sections.forEach(section => {
        updateSectionState(section, false);
    });

    if (willOpen) {
        updateSectionState(target, true);
        saveAccordionState(letter);
        setSpineActive(letter);

        if (!opts.silent) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    } else {
        // Closing current open section
        clearAccordionState();
        setSpineActive(null);
        updateSectionState(target, false);

        if (!opts.silent) {
            scrollToTop();
        }
    }
}

/**
 * Apply ARIA + motion state to a section.
 * @param {HTMLElement} section
 * @param {boolean} isOpen
 */
function updateSectionState(section, isOpen) {
    section.classList.toggle("is-open", isOpen);
    section.classList.toggle("is-energized", isOpen);

    const btn = section.querySelector(".games-accordion__header");
    const content = section.querySelector(".games-accordion__content");

    if (btn) btn.setAttribute("aria-expanded", String(isOpen));
    if (!content) return;

    animateAccordionContent(content, isOpen);
}

/**
 * Animate accordion panels while respecting reduced motion.
 * @param {HTMLElement} content
 * @param {boolean} isOpening
 */
function animateAccordionContent(content, isOpening) {
    const prefersReduced = CCG_PREFERS_REDUCED_MOTION.matches;
    const isVisible = content.classList.contains("is-visible");

    // Reset any running animations
    content.removeEventListener("transitionend", content._ccgMotionHandler);
    if (content._ccgHeightTimer) {
        clearTimeout(content._ccgHeightTimer);
        content._ccgHeightTimer = null;
    }
    content.style.height = "";

    if (prefersReduced) {
        content.hidden = !isOpening;
        content.classList.toggle("is-visible", isOpening);
        content.setAttribute("aria-hidden", String(!isOpening));
        return;
    }

    if (!isOpening && !isVisible) {
        content.hidden = true;
        return;
    }

    content.hidden = false;
    const targetHeight = content.scrollHeight;

    content.classList.toggle("is-visible", isOpening);
    content.setAttribute("aria-hidden", String(!isOpening));
    content.style.height = `${isOpening ? 0 : targetHeight}px`;

    requestAnimationFrame(() => {
        content.style.height = `${isOpening ? targetHeight : 0}px`;
    });

    const onTransitionEnd = () => {
        if (isOpening) {
            content.style.height = "auto";
        } else {
            content.hidden = true;
        }
        content._ccgMotionHandler = null;
    };

    content._ccgMotionHandler = onTransitionEnd;
    content.addEventListener("transitionend", onTransitionEnd, { once: true });

    if (isOpening) {
        content._ccgHeightTimer = setTimeout(() => {
            if (!content.hidden && content.classList.contains("is-visible")) {
                content.style.height = "auto";
            }
            content._ccgHeightTimer = null;
        }, 420);
    }
}

/* ============================================================
   SPINE ACTIVE SYNC
============================================================ */

function setSpineActive(letterOrNull) {
    document.querySelectorAll("#gamesAlphaStrip button").forEach(btn => {
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
 * Restore stored accordion state.
 * @param {{silent?: boolean, validatePresence?: boolean}} opts
 */
function restoreAccordionState(opts = {}) {
    const letter = sessionStorage.getItem(ACCORDION_STATE_KEY);
    if (!letter) {
        setSpineActive(null);
        return;
    }

    // If rebuilding from search, the stored letter might no longer exist
    if (opts.validatePresence) {
        const exists = document.querySelector(`.games-accordion__section[data-letter="${letter}"]`);
        if (!exists) {
            clearAccordionState();
            setSpineActive(null);
            return;
        }
    }

    toggleAccordion(letter, { silent: !!opts.silent });
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
   SEARCH (REBUILD SAFE)
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

    if (!filtered.length) {
        setSpineActive(null);
    }

    // If user searches, we should not force scroll jumps
    // (state will reapply silently if possible)
}

/* ============================================================
   COUNTS + EMPTY STATE
============================================================ */

function updateCounts(filteredCount) {
    const totalEl = document.getElementById("gamesTotalCount");
    const resultsEl = document.getElementById("gamesResultsCount");

    if (totalEl) totalEl.textContent = CCG_GAMES_TOTAL.toLocaleString("en-US");
    if (resultsEl) resultsEl.textContent = filteredCount.toLocaleString("en-US");
}

function setEmptyState(isEmpty) {
    const empty = document.getElementById("gamesEmptyState");
    if (!empty) return;
    empty.hidden = !isEmpty;
}

/* ============================================================
   CARD RENDER (UNCHANGED)
============================================================ */

function renderGameCard(game) {
    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

    const gameUrl = resolveGameUrl(game.id);

    return `
        <div class="ccg-game-card">
            <a href="${gameUrl}"
               class="ccg-game-card__thumb">
                <img src="${THUMB_PLACEHOLDER}"
                     data-src="${thumb}"
                     alt="${game.title}"
                     data-game-thumb
                     loading="lazy"
                     decoding="async">
            </a>
            <div class="ccg-game-card__body">
                <h3 class="ccg-game-card__title">${game.title}</h3>
                <div class="ccg-game-card__meta">
                    ${(game.year || "")} · ${(game.system || "")}
                </div>
                <div class="ccg-game-card__actions">
                    <a href="${gameUrl}"
                       class="ccg-btn ccg-btn--primary ccg-game-card__btn">
                       View Game
                    </a>
                </div>
            </div>
        </div>
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

function resolveGameUrl(gameId) {
    const slug = String(gameId || "").replace(/_/g, "-");
    if (slug) return `game.html?slug=${encodeURIComponent(slug)}`;

    return `game.html?id=${encodeURIComponent(gameId)}`;
}

/* ============================================================
   THUMBNAIL LAZY LOAD (ROBUST / RESILIENT)
============================================================ */

let thumbObserver;

function initThumbLazyLoad() {
    if (thumbObserver) thumbObserver.disconnect();

    if ("IntersectionObserver" in window) {
        thumbObserver = new IntersectionObserver(handleThumbIntersections, {
            rootMargin: "400px 0px",
            threshold: 0.01,
        });

        document.querySelectorAll("[data-game-thumb]").forEach(img => {
            if (img.dataset.loaded === "true") return;

            img.addEventListener("error", () => {
                img.src = `${THUMB_BASE_PATH}1942.jpg`;
            }, { once: true });

            thumbObserver.observe(img);
        });
    } else {
        // Fallback: no IO support, set all immediately
        document.querySelectorAll("[data-game-thumb]").forEach(loadThumbNow);
    }
}

function handleThumbIntersections(entries) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const img = entry.target;
        loadThumbNow(img);
        thumbObserver.unobserve(img);
    });
}

function loadThumbNow(img) {
    if (!img || img.dataset.loaded === "true") return;

    const src = img.dataset.src;
    if (!src) return;

    img.src = src;
    img.dataset.loaded = "true";
}
