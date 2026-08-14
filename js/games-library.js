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
let CCG_GAME_CACHE = new Map();
let CCG_ALL_LETTERS = [];
let CCG_ACTIVE_QUERY = "";
let CCG_ACTIVE_QUERY_RAW = "";
let CCG_ACTIVE_SYSTEM_FILTER = "all";
let CCG_YEAR_MIN = null;
let CCG_YEAR_MAX = null;
let CCG_ACTIVE_YEAR_MIN = null;
let CCG_ACTIVE_YEAR_MAX = null;
let CCG_ACTIVE_YEAR_FOCUS = null;
let CCG_ACTIVE_YEAR_SPAN = "all";
let CCG_LIBRARY_INITIALIZED = false;
let CCG_GAMES_LOAD_PROMISE = null;
let CCG_YEAR_FILTER_ELEMENTS = null;
let CCG_SEARCH_CACHE = new WeakMap();
let CCG_GRID_BATCH_STATE = new Map();

const ACCORDION_STATE_KEY = "ccgAccordionState";
const SYSTEM_FILTER_STORAGE_KEY = "ccgGamesSystemFilter";
const THUMB_BASE_PATH = "../resources/images/thumbnails/all/";
const THUMB_PLACEHOLDER =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const CCG_GAMES_INITIAL_BATCH = 12;
const CCG_GAMES_BATCH_SIZE = 18;
const CCG_PREFERS_REDUCED_MOTION = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);
const CCG_MOBILE_QUERY = window.matchMedia?.("(max-width: 820px)");
const CCG_COARSE_QUERY = window.matchMedia?.("(pointer: coarse)");

function isMobileLikeViewport() {
    if (typeof window.ccgIsMobileLike === "function") {
        return window.ccgIsMobileLike();
    }
    if (CCG_MOBILE_QUERY?.matches) return true;
    return Boolean(CCG_COARSE_QUERY?.matches || window.innerWidth <= 820);
}

document.addEventListener("DOMContentLoaded", () => {
    initGamesLibrary();
});

async function initGamesLibrary() {
    if (CCG_LIBRARY_INITIALIZED) return;
    CCG_LIBRARY_INITIALIZED = true;

    try {
        await loadGamesOnce();

        const masterGroups = groupGamesByLetter(CCG_ALL_GAMES);
        CCG_ALL_LETTERS = sortLetters(Object.keys(masterGroups));

        setupSearch();
        setupSystemFilter();
        setupYearFilter();
        applyActiveFilters({ preserveScroll: true });

        // Restore without scroll jump
        restoreAccordionState({ silent: true });

        const staticFallback = document.getElementById("gamesStaticFallback");
        if (staticFallback && CCG_ALL_GAMES.length > 120) {
            staticFallback.hidden = true;
        }

    } catch (err) {
        console.error("[CCG] Games index load failed:", err);
    }
}

function normalizeGame(game) {
    const entry = (game && typeof game === "object") ? game : {};
    return {
        ...entry,
        genres: Array.isArray(entry.genres) ? entry.genres : [],
        collections: Array.isArray(entry.collections) ? entry.collections : [],
        disk: Array.isArray(entry.disk) ? entry.disk : (entry.disk ? [entry.disk] : []),
        lemon: Array.isArray(entry.lemon) ? entry.lemon : (entry.lemon ? [entry.lemon] : []),
        music: Array.isArray(entry.music) ? entry.music : (entry.music ? [entry.music] : []),
    };
}

function mapSearchEntryToGame(entry) {
    const item = (entry && typeof entry === "object") ? entry : {};
    return normalizeGame({
        ...item,
        genres: Array.isArray(item.genres)
            ? item.genres
            : (Array.isArray(item.genre) ? item.genre : (item.genre ? [item.genre] : [])),
        composer: Array.isArray(item.composer) ? item.composer : (item.composer ? [item.composer] : []),
        music: Array.isArray(item.music) ? item.music : (item.music ? [item.music] : []),
        publisher: Array.isArray(item.publisher) ? item.publisher : (item.publisher ? [item.publisher] : []),
    });
}


function extractFallbackGamesFromHtml() {
    const fallbackList = document.querySelectorAll('#gamesStaticFallback a[href]');
    if (!fallbackList.length) return [];

    const mapped = [];
    fallbackList.forEach((link) => {
        const href = link.getAttribute('href') || '';
        const parts = href.split('/').filter(Boolean);
        const slug = parts[parts.length - 1] || '';
        if (!slug) return;
        mapped.push(normalizeGame({
            id: slug,
            slug,
            title: link.textContent.trim(),
            sorttitle: link.textContent.trim(),
            system: link.dataset.system || 'C64',
            year: link.dataset.year || '',
            genres: [],
            collections: []
        }));
    });
    return mapped;
}

async function fetchGamesDataset(root) {
    const candidates = [
        {
            label: "games.json",
            url: `${root}games/games.json`,
            mapper: (data) => Array.isArray(data) ? data.map(normalizeGame) : [],
        },
        {
            label: "games-search.json",
            url: `${root}games/games-search.json`,
            mapper: (data) => Array.isArray(data) ? data.map(mapSearchEntryToGame) : [],
        },
    ];

    const failures = [];

    for (const candidate of candidates) {
        try {
            const res = await fetch(candidate.url, { cache: "no-store" });
            if (!res.ok) {
                failures.push(`${candidate.label} HTTP ${res.status}`);
                continue;
            }

            const data = await res.json();
            const mapped = candidate.mapper(data).filter(Boolean);
            if (mapped.length > 0) {
                console.info(`[CCG] Games library loaded via ${candidate.label}: ${mapped.length} entries`);
                return mapped;
            }

            failures.push(`${candidate.label} returned 0 entries`);
        } catch (error) {
            failures.push(`${candidate.label} ${error.message}`);
        }
    }

    const fallback = extractFallbackGamesFromHtml();
    if (fallback.length) {
        console.warn(`[CCG] Using static fallback games list (${fallback.length}) because dataset fetch failed. ${failures.join("; ")}`);
        return fallback;
    }

    throw new Error(`Failed to load game datasets. ${failures.join("; ")}`);
}

function loadGamesOnce() {
    if (CCG_GAMES_LOAD_PROMISE) return CCG_GAMES_LOAD_PROMISE;

    CCG_GAMES_LOAD_PROMISE = (async () => {
        resetGamesState();
        const root = window.ccgGetSiteRoot ? window.ccgGetSiteRoot() : "/";
        const incoming = await fetchGamesDataset(root);
        CCG_ALL_GAMES = dedupeGames(incoming);
        CCG_GAMES_TOTAL = CCG_ALL_GAMES.length;
    })();

    return CCG_GAMES_LOAD_PROMISE;
}

function resetGamesState() {
    CCG_ALL_GAMES = [];
    CCG_GAMES_TOTAL = 0;
    CCG_GAME_CACHE = new Map();
    CCG_ALL_LETTERS = [];
    CCG_SEARCH_CACHE = new WeakMap();
}

function dedupeGames(games) {
    const seen = new Set();
    return games.filter((game, index) => {
        const key = buildGameDedupKey(game, index);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function buildGameDedupKey(game, index) {
    const system = String(game?.system || "").trim().toUpperCase();
    const slug = String(game?.slug || "").trim().toLowerCase();
    if (slug) return `slug:${slug}|system:${system || "UNKNOWN"}`;

    const id = String(game?.id || "").trim().toLowerCase();
    if (id) return `id:${id}|system:${system || "UNKNOWN"}`;

    const title = String(game?.title || "").trim().toLowerCase();
    const year = String(game?.year || "").trim();
    if (title) return `title:${title}|system:${system || "UNKNOWN"}|year:${year}`;

    return `index:${index}`;
}

/* ============================================================
   CORE BUILD
============================================================ */

function buildGamesIndex(games) {
    const grouped = groupGamesByLetter(games);
    buildAlphaSpine(grouped);
    buildAccordion(grouped);

    setEmptyState(!games.length);
    updateCounts(games.length);

    if (CCG_ACTIVE_QUERY && games.length) {
        expandAccordionsForSearchResults();
        clearAccordionState();
    } else {
        // After a rebuild (search), re-apply state if it still exists
        restoreAccordionState({ silent: true, validatePresence: true });
    }
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

function sortLetters(letters) {
    return letters.sort((a, b) => {
        if (a === "#") return -1;
        if (b === "#") return 1;
        return a.localeCompare(b);
    });
}

function normalizeSystemValue(raw) {
    const value = String(raw || "").trim().toUpperCase();
    if (value === "C64") return "C64";
    if (value === "AMIGA") return "AMIGA";
    return value || "UNKNOWN";
}

function getSystemFilterLabel(filter) {
    switch (filter) {
        case "c64":
            return "Commodore 64 only";
        case "amiga":
            return "Amiga only";
        default:
            return "All Games (C64 + Amiga)";
    }
}

/* ============================================================
   A–Z SPINE (LETTERS ONLY)
============================================================ */

function buildAlphaSpine(groups) {
    const strip = document.getElementById("gamesAlphaStrip");
    if (!strip) return;

    strip.innerHTML = "";

    const letters = CCG_ALL_LETTERS.length
        ? [...CCG_ALL_LETTERS]
        : sortLetters(Object.keys(groups));

    const counts = letters.map(letter => groups[letter]?.length || 0);
    const maxCount = Math.max(0, ...counts);
    const highThreshold = Math.max(8, Math.round(maxCount * 0.6));

    letters.forEach(letter => {
        const btn = document.createElement("button");
        btn.className = "games-alpha__btn";
        btn.textContent = letter;
        btn.dataset.letter = letter;
        const hasResults = Boolean(groups[letter]?.length);
        const count = groups[letter]?.length || 0;
        btn.dataset.count = String(count);
        btn.disabled = !hasResults;
        btn.classList.toggle("is-disabled", !hasResults);
        btn.classList.toggle("is-muted", !hasResults);
        btn.classList.toggle("is-busy", hasResults && count >= highThreshold);
        btn.setAttribute("aria-disabled", String(!hasResults));

        btn.addEventListener("click", () => {
            if (btn.disabled) return;
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
    CCG_GAME_CACHE = new Map();
    CCG_GRID_BATCH_STATE = new Map();
    let gameIndex = 0;

    const letters = sortLetters(Object.keys(groups));

    letters.forEach(letter => {
        const gamesForLetter = groups[letter] || [];
        const systemBuckets = {
            C64: gamesForLetter.filter(game => normalizeSystemValue(game.system) === "C64"),
            AMIGA: gamesForLetter.filter(game => normalizeSystemValue(game.system) === "AMIGA"),
        };
        const hasC64 = systemBuckets.C64.length > 0;
        const hasAmiga = systemBuckets.AMIGA.length > 0;
        const hasMixedSystems = hasC64 && hasAmiga;
        const systemSummary = hasMixedSystems
            ? `${systemBuckets.C64.length} C64 · ${systemBuckets.AMIGA.length} Amiga`
            : (hasC64 ? "Commodore 64" : "Amiga");

        const hintMarkup =
            CCG_ACTIVE_SYSTEM_FILTER === "all" && !hasMixedSystems
                ? renderSystemBiasHint(hasC64 ? "C64" : hasAmiga ? "AMIGA" : null)
                : "";

        const section = document.createElement("section");
        section.className = "games-accordion__section";
        section.dataset.letter = letter;

        const letterSlug = letter === "#" ? "num" : letter.toLowerCase();
        const headerId = `games-accordion-header-${letterSlug}`;
        const contentId = `games-accordion-panel-${letterSlug}`;

        section.innerHTML = `
            <button class="ccg-btn ccg-btn--ghost games-accordion__header" data-letter="${letter}" type="button" id="${headerId}" aria-controls="${contentId}">
                <span class="games-accordion__letter"><span class="games-accordion__letter-mark">${letter}</span>${hintMarkup}</span>
                <span class="games-accordion__meta"><strong>${gamesForLetter.length.toLocaleString("en-US")}</strong> titles <small>${systemSummary}</small></span>
                <span class="games-accordion__action" aria-hidden="true">View titles</span>
                <span class="games-accordion__chevron">⌄</span>
            </button>
            <div class="games-accordion__content" id="${contentId}" role="region" aria-labelledby="${headerId}" hidden>
                ${renderAccordionContent({
                    gamesForLetter,
                    systemBuckets,
                    hasMixedSystems,
                    gameIndexRef: { value: gameIndex }
                })}
            </div>
        `;

        gameIndex = CCG_GAME_CACHE.size;
        container.appendChild(section);
    });

    attachAccordionEvents();
    attachLoadMoreEvents();
    initCardLazyRender();
    initThumbLazyLoad();
}

function renderSystemBiasHint(system) {
    if (!system) return "";
    const label = system === "C64" ? "C64 only" : "Amiga only";
    return `<span class="games-accordion__hint">${label}</span>`;
}

function registerBatchState(batchId, keys, initialCount = CCG_GAMES_INITIAL_BATCH) {
    const total = keys.length;
    const shown = Math.min(initialCount, total);
    CCG_GRID_BATCH_STATE.set(batchId, {
        keys,
        total,
        shown,
    });
    return keys.slice(0, shown);
}

function renderBatchedGridMarkup(batchId, games, gameIndexRef) {
    const keys = games.map(game => {
        const key = getGameKey(game, gameIndexRef.value++);
        CCG_GAME_CACHE.set(key, game);
        return key;
    });

    const initialKeys = registerBatchState(batchId, keys);
    const remaining = Math.max(0, keys.length - initialKeys.length);
    const buttonMarkup = remaining > 0
        ? `
            <div class="games-grid__more-wrap">
                <button class="ccg-btn ccg-btn--secondary games-grid__more-btn"
                        type="button"
                        data-games-load-more="${batchId}">
                    Load More (${remaining} remaining)
                </button>
            </div>
        `
        : "";

    return `
        <div class="games-grid" data-games-batch-grid="${batchId}">
            ${initialKeys.map(renderGameCardShell).join("")}
        </div>
        ${buttonMarkup}
    `;
}

function renderAccordionContent({ gamesForLetter, systemBuckets, hasMixedSystems, gameIndexRef }) {
    if (CCG_ACTIVE_SYSTEM_FILTER === "all" && hasMixedSystems) {
        return `
            ${renderSystemGroup("Commodore 64", systemBuckets.C64, gameIndexRef, "c64")}
            ${renderSystemGroup("Amiga", systemBuckets.AMIGA, gameIndexRef, "amiga")}
        `;
    }

    const batchId = `letter:${gameIndexRef.value}`;
    return `
        ${renderBatchedGridMarkup(batchId, gamesForLetter, gameIndexRef)}
    `;
}

function renderSystemGroup(label, games, gameIndexRef, suffix) {
    if (!games.length) return "";
    const batchId = `${suffix}:${gameIndexRef.value}`;
    return `
        <div class="games-system-group">
            <div class="games-system-group__title">${label}</div>
            ${renderBatchedGridMarkup(batchId, games, gameIndexRef)}
        </div>
    `;
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

function attachLoadMoreEvents() {
    document.querySelectorAll("[data-games-load-more]").forEach(btn => {
        if (btn.dataset.ccgBound === "true") return;
        btn.dataset.ccgBound = "true";
        btn.addEventListener("click", () => {
            loadMoreCardsForBatch(btn);
        });
    });
}

function loadMoreCardsForBatch(buttonEl) {
    const batchId = buttonEl?.dataset?.gamesLoadMore;
    if (!batchId) return;

    const state = CCG_GRID_BATCH_STATE.get(batchId);
    if (!state) return;

    const grid = document.querySelector(`[data-games-batch-grid="${batchId}"]`);
    if (!grid) return;

    const nextEnd = Math.min(state.shown + CCG_GAMES_BATCH_SIZE, state.total);
    if (nextEnd <= state.shown) return;

    const nextKeys = state.keys.slice(state.shown, nextEnd);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = nextKeys.map(renderGameCardShell).join("");
    const cards = Array.from(wrapper.children);

    cards.forEach(card => {
        grid.appendChild(card);
    });

    state.shown = nextEnd;
    CCG_GRID_BATCH_STATE.set(batchId, state);
    updateLoadMoreButtonState(buttonEl, state);
    observeNewGameCards(cards);
}

function updateLoadMoreButtonState(buttonEl, state) {
    if (!buttonEl || !state) return;
    const remaining = Math.max(0, state.total - state.shown);
    if (remaining === 0) {
        const wrap = buttonEl.closest(".games-grid__more-wrap");
        if (wrap) wrap.remove();
        return;
    }
    buttonEl.textContent = `Load More (${remaining} remaining)`;
}

function observeNewGameCards(cards) {
    if (!Array.isArray(cards) || !cards.length) return;
    if (isMobileLikeViewport()) {
        cards.forEach(renderGameCardNow);
        return;
    }

    if (cardObserver && "IntersectionObserver" in window) {
        cards.forEach(card => {
            if (card.classList.contains("rendered")) return;
            cardObserver.observe(card);
        });
        return;
    }

    cards.forEach(renderGameCardNow);
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
            const behavior = isMobileLikeViewport() ? "auto" : "smooth";
            target.scrollIntoView({ behavior, block: "start" });
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
    const isMobileLike = isMobileLikeViewport();

    // Reset any running animations
    content.removeEventListener("transitionend", content._ccgMotionHandler);
    if (content._ccgHeightTimer) {
        clearTimeout(content._ccgHeightTimer);
        content._ccgHeightTimer = null;
    }
    content.style.height = "";

    if (prefersReduced || isMobileLike) {
        content.hidden = !isOpening;
        content.classList.toggle("is-visible", isOpening);
        content.setAttribute("aria-hidden", String(!isOpening));
        content.style.height = isOpening ? "auto" : "0px";
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
    if (CCG_ACTIVE_QUERY) {
        setSpineActive(null);
        return;
    }

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

function expandAccordionsForSearchResults() {
    const sections = document.querySelectorAll(".games-accordion__section");
    if (!sections.length) return;

    sections.forEach(section => {
        updateSectionState(section, true);
    });

    setSpineActive(null);
}

/* ============================================================
   SCROLL CONTROL
============================================================ */

function scrollToTop() {
    const anchor =
        document.querySelector(".games-tools") ||
        document.querySelector(".games-hero") ||
        document.body;

    const behavior = isMobileLikeViewport() ? "auto" : "smooth";
    anchor.scrollIntoView({ behavior, block: "start" });
}

/* ============================================================
   SEARCH (REBUILD SAFE)
============================================================ */

function setupSearch() {
    const input = document.getElementById("gamesSearchInput");
    const clearBtn = document.getElementById("gamesSearchClear");
    if (!input || input.dataset.ccgBound === "true") return;
    input.dataset.ccgBound = "true";

    input.addEventListener("input", () => {
        const raw = input.value.trim();
        CCG_ACTIVE_QUERY_RAW = raw;
        CCG_ACTIVE_QUERY = normalizeSearchText(raw);
        if (raw) {
            clearAccordionState();
            setSpineActive(null);
            setYearFilterSpan("all", { silent: true });
        }
        applyActiveFilters({ preserveScroll: true });
    });

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            input.value = "";
            CCG_ACTIVE_QUERY_RAW = "";
            CCG_ACTIVE_QUERY = "";
            applyActiveFilters({ preserveScroll: true });
        });
    }
}

function setupSystemFilter() {
    const buttons = document.querySelectorAll("[data-system-filter]");
    const hint = document.getElementById("gamesBrowseHint");
    if (!buttons.length) return;
    if (buttons[0].dataset.ccgBound === "true") return;

    const initial = getInitialSystemFilter();
    setSystemFilter(initial, { persist: true, updateButtons: true, hintEl: hint });

    buttons.forEach(btn => {
        btn.dataset.ccgBound = "true";
        btn.addEventListener("click", () => {
            const system = btn.dataset.systemFilter || "all";
            setSystemFilter(system, { persist: true, updateButtons: true, hintEl: hint });
            applyActiveFilters({ preserveScroll: true });
        });
    });
}

function setupYearFilter() {
    const slider = document.getElementById("gamesYearSlider");
    const yearInput = document.getElementById("gamesYearInput");
    const valueEl = document.getElementById("gamesYearValue");
    const spanButtons = Array.from(document.querySelectorAll("[data-year-span]"));
    if (!slider || !yearInput || slider.dataset.ccgBound === "true") return;
    slider.dataset.ccgBound = "true";

    CCG_YEAR_FILTER_ELEMENTS = {
        slider,
        yearInput,
        valueEl,
        spanButtons,
        rangePanel: document.querySelector("[data-games-year-filter]")
    };

    const years = CCG_ALL_GAMES
        .map(game => parseGameYear(game.year))
        .filter(year => Number.isFinite(year));

    CCG_YEAR_MIN = years.length ? Math.min(...years) : 1980;
    CCG_YEAR_MAX = years.length ? Math.max(...years) : 1995;
    CCG_ACTIVE_YEAR_MIN = CCG_YEAR_MIN;
    CCG_ACTIVE_YEAR_MAX = CCG_YEAR_MAX;
    CCG_ACTIVE_YEAR_FOCUS = CCG_YEAR_MAX;
    CCG_ACTIVE_YEAR_SPAN = "all";

    slider.min = String(CCG_YEAR_MIN);
    slider.max = String(CCG_YEAR_MAX);
    slider.value = String(CCG_ACTIVE_YEAR_FOCUS);

    yearInput.min = String(CCG_YEAR_MIN);
    yearInput.max = String(CCG_YEAR_MAX);
    yearInput.value = "";
    yearInput.placeholder = "Any";

    const clampYear = (value) => {
        if (!Number.isFinite(value)) return CCG_YEAR_MAX;
        return Math.min(Math.max(value, CCG_YEAR_MIN), CCG_YEAR_MAX);
    };

    const applyYearChange = () => {
        syncActiveYearRange();
        updateYearFilterUI();
        applyActiveFilters({ preserveScroll: true });
    };

    const setFocusYear = (value) => {
        const next = clampYear(Number.parseInt(value, 10));
        CCG_ACTIVE_YEAR_FOCUS = next;
        slider.value = String(next);
        yearInput.value = String(next);
        if (CCG_ACTIVE_YEAR_SPAN === "all") {
            CCG_ACTIVE_YEAR_SPAN = "0";
        }
        applyYearChange();
    };

    const setSpan = (nextSpan) => {
        setYearFilterSpan(nextSpan);
    };

    slider.addEventListener("input", () => setFocusYear(slider.value));
    yearInput.addEventListener("input", () => {
        if (!yearInput.value) return;
        setFocusYear(yearInput.value);
    });

    spanButtons.forEach(btn => {
        btn.dataset.ccgBound = "true";
        btn.addEventListener("click", () => {
            const span = btn.dataset.yearSpan || "all";
            setSpan(span);
        });
    });

    updateYearFilterUI();
}

function getInitialSystemFilter() {
    return "all";
}

function inferSystemFromReferrer() {
    const referrer = document.referrer || "";
    if (!referrer) return null;
    if (!/\/games\/(genres|collections)\//i.test(referrer)) return null;

    if (/amiga/i.test(referrer)) return "amiga";
    if (/c64/i.test(referrer)) return "c64";

    return null;
}

function isValidSystemFilter(value) {
    return ["all", "c64", "amiga"].includes(String(value || "").toLowerCase());
}

function setSystemFilter(filter, opts = {}) {
    const next = String(filter || "all").toLowerCase();
    CCG_ACTIVE_SYSTEM_FILTER = isValidSystemFilter(next) ? next : "all";

    if (opts.persist) {
        localStorage.setItem(SYSTEM_FILTER_STORAGE_KEY, CCG_ACTIVE_SYSTEM_FILTER);
    }

    if (opts.updateButtons) {
        document.querySelectorAll("[data-system-filter]").forEach(btn => {
            const isActive = btn.dataset.systemFilter === CCG_ACTIVE_SYSTEM_FILTER;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-pressed", String(isActive));
        });
    }

    updateBrowseHint(opts.hintEl);
}

function applyActiveFilters({ preserveScroll } = {}) {
    const scrollY = preserveScroll ? window.scrollY : null;
    const filtered = getFilteredGames();

    buildGamesIndex(filtered);
    updateFocusPanel(filtered.length);
    updateSingleResultLayout(filtered.length);
    updateBrowseHint();

    if (!filtered.length) {
        setSpineActive(null);
    }

    if (preserveScroll && scrollY !== null) {
        requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY, behavior: "auto" });
        });
    }

    // If user searches or filters, we should not force scroll jumps
    // (state will reapply silently if possible)
}

function getFilteredGames() {
    const query = CCG_ACTIVE_QUERY.trim();
    const queryData = getSearchQueryData(query);
    const systemFilter = CCG_ACTIVE_SYSTEM_FILTER;
    return CCG_ALL_GAMES.filter(game => {
        const matchesQuery = matchesSearchQuery(game, queryData);
        const matchesSystem =
            systemFilter === "all" ||
            normalizeSystemValue(game.system) === systemFilter.toUpperCase();
        const matchesYear = matchesYearRange(game.year);
        return matchesQuery && matchesSystem && matchesYear;
    });
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

function updateYearRangeLabel(labelEl) {
    if (!labelEl) return;
    if (CCG_YEAR_MIN === null || CCG_YEAR_MAX === null) {
        labelEl.textContent = "All years";
        return;
    }

    const isFullRange =
        CCG_ACTIVE_YEAR_MIN === CCG_YEAR_MIN && CCG_ACTIVE_YEAR_MAX === CCG_YEAR_MAX;

    if (isFullRange) {
        labelEl.textContent = "All years";
        return;
    }

    if (CCG_ACTIVE_YEAR_MIN === CCG_ACTIVE_YEAR_MAX) {
        labelEl.textContent = `${CCG_ACTIVE_YEAR_MIN}`;
        return;
    }

    labelEl.textContent = `${CCG_ACTIVE_YEAR_MIN}–${CCG_ACTIVE_YEAR_MAX}`;
}

function normalizeSearchText(text) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[’']/g, "")
        .replace(/[-_]+/g, " ")
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getSearchQueryData(query) {
    const normalized = normalizeSearchText(query);
    const tokens = normalized ? normalized.split(" ") : [];
    const condensed = tokens.join("");
    return { normalized, tokens, condensed };
}

function getGameSearchData(game) {
    if (!game || typeof game !== "object") {
        return { combined: "", condensedCombined: "", tokenSet: new Set() };
    }
    if (CCG_SEARCH_CACHE.has(game)) {
        return CCG_SEARCH_CACHE.get(game);
    }

    const publisherValues = Array.isArray(game.publisher)
        ? game.publisher
        : (Array.isArray(game?.credits?.publisher)
            ? game.credits.publisher
            : (game.publisher ? [game.publisher] : (game?.credits?.publisher ? [game.credits.publisher] : [])));
    const genreValues = Array.isArray(game.genres) ? game.genres : (game.genre ? [game.genre] : []);
    const musicValues = Array.isArray(game.music) ? game.music : (game.music ? [game.music] : []);
    const composerValues = Array.isArray(game.composer)
        ? game.composer
        : (game.composer ? [game.composer] : (Array.isArray(game?.credits?.musician)
            ? game.credits.musician
            : (game?.credits?.musician ? [game.credits.musician] : [])));

    const searchFields = [
        String(game.title || ""),
        String(game.sorttitle || ""),
        String(game.id || ""),
        String(game.slug || ""),
        ...publisherValues.map((value) => String(value || "")),
        ...genreValues.map((value) => String(value || "")),
        ...musicValues.map((value) => String(value || "")),
        ...composerValues.map((value) => String(value || ""))
    ].map(normalizeSearchText).filter(Boolean);

    const combined = searchFields.join(" ");
    const combinedTokens = combined ? combined.split(" ") : [];
    const condensedCombined = combinedTokens.join("");
    const tokenSet = new Set(combinedTokens);
    const data = { combined, condensedCombined, tokenSet };
    CCG_SEARCH_CACHE.set(game, data);
    return data;
}

function matchesSearchQuery(game, queryData) {
    if (!queryData.normalized) return true;
    const { combined, condensedCombined, tokenSet } = getGameSearchData(game);
    const condensedQuery = queryData.condensed;

    if (queryData.normalized && combined.includes(queryData.normalized)) {
        return true;
    }

    if (condensedQuery && condensedCombined.includes(condensedQuery)) {
        return true;
    }

    return queryData.tokens.every(token => Array.from(tokenSet).some(fieldToken => fieldToken.includes(token)));
}

function parseGameYear(year) {
    const parsed = parseInt(year, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function matchesYearRange(yearValue) {
    if (CCG_YEAR_MIN === null || CCG_YEAR_MAX === null) return true;
    if (CCG_ACTIVE_YEAR_MIN === null || CCG_ACTIVE_YEAR_MAX === null) return true;
    if (CCG_ACTIVE_YEAR_MIN === CCG_YEAR_MIN && CCG_ACTIVE_YEAR_MAX === CCG_YEAR_MAX) {
        return true;
    }

    const year = parseGameYear(yearValue);
    if (!Number.isFinite(year)) return false;
    return year >= CCG_ACTIVE_YEAR_MIN && year <= CCG_ACTIVE_YEAR_MAX;
}

function getSystemFocusLabel() {
    switch (CCG_ACTIVE_SYSTEM_FILTER) {
        case "c64":
            return "C64";
        case "amiga":
            return "AMIGA";
        default:
            return "C64 & AMIGA";
    }
}

function getYearFocusLabel() {
    if (CCG_YEAR_MIN === null || CCG_YEAR_MAX === null) return "";
    if (CCG_ACTIVE_YEAR_MIN === CCG_YEAR_MIN && CCG_ACTIVE_YEAR_MAX === CCG_YEAR_MAX) {
        return "";
    }
    if (CCG_ACTIVE_YEAR_MIN === CCG_ACTIVE_YEAR_MAX) {
        return `${CCG_ACTIVE_YEAR_MIN}`;
    }
    return `${CCG_ACTIVE_YEAR_MIN}–${CCG_ACTIVE_YEAR_MAX}`;
}

function updateFocusPanel(filteredCount) {
    const panel = document.getElementById("gamesFocusPanel");
    if (!panel) return;

    const labelEl = panel.querySelector(".games-focus-panel__label");
    const countEl = panel.querySelector(".games-focus-panel__count");
    if (!labelEl || !countEl) return;

    const query = CCG_ACTIVE_QUERY_RAW.trim();
    const systemLabel = getSystemFocusLabel();
    const yearLabel = getYearFocusLabel();
    const parts = [];

    if (query) {
        parts.push(`SEARCH RESULTS: "${query.toUpperCase()}"`);
        parts.push(systemLabel);
        if (yearLabel) parts.push(yearLabel);
        labelEl.textContent = parts.join(" · ");
        countEl.textContent = `${filteredCount.toLocaleString("en-US")} matches`;
        return;
    }

    if (CCG_ACTIVE_SYSTEM_FILTER === "all" && !yearLabel) {
        labelEl.textContent = "ALL GAMES";
        countEl.textContent = `${CCG_GAMES_TOTAL.toLocaleString("en-US")} total`;
        return;
    }

    const browseParts = [systemLabel];
    if (yearLabel) browseParts.push(yearLabel);
    labelEl.textContent = `BROWSING: ${browseParts.join(" · ")}`;
    countEl.textContent = `${filteredCount.toLocaleString("en-US")} games`;
}

function setEmptyState(isEmpty) {
    const empty = document.getElementById("gamesEmptyState");
    if (!empty) return;
    empty.hidden = !isEmpty;
}

function updateSingleResultLayout(filteredCount) {
    const library = document.querySelector(".games-library");
    if (!library) return;
    library.classList.toggle("games-library--single-result", filteredCount === 1);
}

function syncActiveYearRange() {
    if (CCG_ACTIVE_YEAR_SPAN === "all") {
        CCG_ACTIVE_YEAR_MIN = CCG_YEAR_MIN;
        CCG_ACTIVE_YEAR_MAX = CCG_YEAR_MAX;
        return;
    }

    const span = Number.parseInt(CCG_ACTIVE_YEAR_SPAN, 10);
    const focus = Number.isFinite(CCG_ACTIVE_YEAR_FOCUS)
        ? CCG_ACTIVE_YEAR_FOCUS
        : CCG_YEAR_MAX;
    const clampedFocus = Math.min(Math.max(focus, CCG_YEAR_MIN), CCG_YEAR_MAX);
    CCG_ACTIVE_YEAR_MIN = Math.min(Math.max(clampedFocus - span, CCG_YEAR_MIN), CCG_YEAR_MAX);
    CCG_ACTIVE_YEAR_MAX = Math.min(Math.max(clampedFocus + span, CCG_YEAR_MIN), CCG_YEAR_MAX);
}

function updateYearFilterUI() {
    const elements = CCG_YEAR_FILTER_ELEMENTS;
    if (!elements) return;

    elements.spanButtons.forEach(btn => {
        const isActive = btn.dataset.yearSpan === String(CCG_ACTIVE_YEAR_SPAN);
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-pressed", String(isActive));
    });

    const isAllYears = CCG_ACTIVE_YEAR_SPAN === "all";
    if (elements.rangePanel) {
        elements.rangePanel.classList.toggle("is-active", !isAllYears);
        elements.rangePanel.classList.toggle("is-idle", isAllYears);
    }

    if (elements.yearInput) {
        if (isAllYears) {
            elements.yearInput.value = "";
            elements.yearInput.placeholder = "Any";
        } else {
            elements.yearInput.value = String(CCG_ACTIVE_YEAR_FOCUS ?? CCG_YEAR_MAX);
        }
    }

    updateYearRangeLabel(elements.valueEl);
    updateBrowseHint();
}

function setYearFilterSpan(nextSpan, { silent } = {}) {
    if (!CCG_YEAR_FILTER_ELEMENTS) return;
    const next = nextSpan === undefined ? "all" : String(nextSpan);
    if (next === "all") {
        CCG_ACTIVE_YEAR_SPAN = "all";
        syncActiveYearRange();
        updateYearFilterUI();
        if (!silent) applyActiveFilters({ preserveScroll: true });
        return;
    }

    const spanValue = Number.parseInt(next, 10);
    if (!Number.isFinite(spanValue)) return;
    CCG_ACTIVE_YEAR_SPAN = String(spanValue);
    syncActiveYearRange();
    updateYearFilterUI();
    if (!silent) applyActiveFilters({ preserveScroll: true });
}

function updateBrowseHint(hintEl) {
    const hint = hintEl || document.getElementById("gamesBrowseHint");
    if (!hint) return;
    const systemLabel = getSystemFilterLabel(CCG_ACTIVE_SYSTEM_FILTER);
    const yearLabel = getYearFocusLabel() || "All years";
    const query = CCG_ACTIVE_QUERY_RAW.trim();

    if (query) {
        hint.textContent = `Search: “${query}” · ${systemLabel} · Year: ${yearLabel}`;
        return;
    }

    hint.textContent = `Browsing: ${systemLabel} · Year: ${yearLabel}`;
}

/* ============================================================
   CARD RENDER (UNCHANGED)
============================================================ */

function renderGameCard(game) {
    return renderGameCardMarkup(game);
}

function getGameKey(game, index) {
    const slug = String(game?.slug || "").trim();
    if (slug) return `slug:${slug}`;

    const id = String(game?.id || "").trim();
    if (id) return `id:${id}`;

    return `idx:${index}`;
}

function renderGameCardMarkup(game, opts = {}) {
    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

    const gameUrl = resolveGameUrl(game);
    const keyAttr = opts.key ? ` data-game-key="${opts.key}"` : "";
    const classNames = ["ccg-game-card"];
    if (opts.rendered) classNames.push("rendered");
    const ratingMarkup = typeof window.ccgBuildRatingMarkup === "function"
        ? window.ccgBuildRatingMarkup(game, {
            label: "CCG Rating",
            className: "ccg-rating--card"
        })
        : "";

    return `
        <div class="${classNames.join(" ")}"${keyAttr}>
            <a href="${gameUrl}"
               class="ccg-game-card__thumb">
                <img src="${THUMB_PLACEHOLDER}"
                     data-src="${thumb}"
                     data-srcset="${thumb} 320w"
                     data-sizes="(max-width: 720px) 48vw, 320px"
                     alt="${game.title}"
                     data-game-thumb
                     loading="lazy"
                     decoding="async"
                     width="320"
                     height="180">
                ${ratingMarkup}
            </a>
            <div class="ccg-game-card__body">
                <div class="game-title-wrapper">
                    <h3 class="ccg-game-card__title">${game.title}</h3>
                    <div class="ccg-game-card__meta">
                        ${(game.year || "")} · ${(game.system || "")}
                    </div>
                </div>
                <div class="ccg-game-card__actions">
                    <a href="${gameUrl}"
                       class="ccg-btn ccg-btn--primary ccg-game-card__btn"
                       aria-label="View ${game.title}">
                       View ${game.title}
                    </a>
                </div>
            </div>
        </div>
    `;
}

function renderGameCardShell(key) {
    return `
        <div class="ccg-game-card ccg-game-card--shell" data-game-key="${key}"></div>
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

function resolveGameUrl(game) {
    let slug = String(game?.slug || "").trim();
    if (slug === "smash-t-5" || slug === "smash-t-v") slug = "smash-tv";
    if (slug) return `${slug}/`;

    const id = String(game?.id || "").trim();
    if (id) {
        const fallbackSlug = id.toLowerCase().replace(/_+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
        if (fallbackSlug) return `${fallbackSlug}/`;
    }

    return "#";
}

/* ============================================================
   THUMBNAIL LAZY LOAD (ROBUST / RESILIENT)
============================================================ */

let thumbObserver;

function initThumbLazyLoad() {
    if (thumbObserver) thumbObserver.disconnect();

    if (isMobileLikeViewport()) {
        document.querySelectorAll("[data-game-thumb]").forEach(registerThumbForLazyLoad);
        return;
    }

    if ("IntersectionObserver" in window) {
        thumbObserver = new IntersectionObserver(handleThumbIntersections, {
            rootMargin: "400px 0px",
            threshold: 0.01,
        });

        document.querySelectorAll("[data-game-thumb]").forEach(registerThumbForLazyLoad);
    } else {
        // Fallback: no IO support, set all immediately
        document.querySelectorAll("[data-game-thumb]").forEach(registerThumbForLazyLoad);
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

    const srcset = img.dataset.srcset;
    if (srcset) {
        img.srcset = srcset;
    }

    const sizes = img.dataset.sizes;
    if (sizes) {
        img.sizes = sizes;
    }

    img.dataset.loaded = "true";
}

/* ============================================================
   CARD LAZY RENDER (DESKTOP) + MOBILE FORCE RENDER
============================================================ */

let cardObserver;

function initCardLazyRender() {
    if (cardObserver) cardObserver.disconnect();

    const cards = Array.from(document.querySelectorAll(".ccg-game-card"));
    if (!cards.length) return;

    if (isMobileLikeViewport()) {
        renderAllGameCards(cards);
        return;
    }

    if ("IntersectionObserver" in window) {
        cardObserver = new IntersectionObserver(handleCardIntersections, {
            rootMargin: "400px 0px",
            threshold: 0.01,
        });

        cards.forEach(card => {
            if (card.classList.contains("rendered")) return;
            cardObserver.observe(card);
        });
    } else {
        renderAllGameCards(cards);
    }
}

function handleCardIntersections(entries) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        renderGameCardNow(card);
        cardObserver?.unobserve(card);
    });
}

function renderAllGameCards(cards) {
    const render = () => cards.forEach(renderGameCardNow);

    if ("requestIdleCallback" in window) {
        requestIdleCallback(render, { timeout: 200 });
    } else {
        setTimeout(render, 0);
    }
}

function renderGameCardNow(card) {
    if (!card || card.classList.contains("rendered")) return;

    const key = card.dataset.gameKey;
    if (!key) return;

    const game = CCG_GAME_CACHE.get(key);
    if (!game) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = renderGameCardMarkup(game, { key, rendered: true }).trim();
    const renderedCard = wrapper.firstElementChild;
    if (!renderedCard) return;

    card.replaceWith(renderedCard);

    const thumb = renderedCard.querySelector("[data-game-thumb]");
    if (thumb) {
        registerThumbForLazyLoad(thumb);
    }
}

function registerThumbForLazyLoad(img) {
    if (!img || img.dataset.loaded === "true") return;

    img.addEventListener("error", () => {
        img.src = `${THUMB_BASE_PATH}1942.jpg`;
    }, { once: true });

    if (isMobileLikeViewport()) {
        loadThumbNow(img);
        return;
    }

    if ("IntersectionObserver" in window) {
        if (!thumbObserver) {
            thumbObserver = new IntersectionObserver(handleThumbIntersections, {
                rootMargin: "400px 0px",
                threshold: 0.01,
            });
        }
        thumbObserver.observe(img);
        return;
    }

    loadThumbNow(img);
}
