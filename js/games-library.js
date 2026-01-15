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
let CCG_ACTIVE_SYSTEM_FILTER = "all";
let CCG_YEAR_MIN = null;
let CCG_YEAR_MAX = null;
let CCG_ACTIVE_YEAR_MIN = null;
let CCG_ACTIVE_YEAR_MAX = null;

const ACCORDION_STATE_KEY = "ccgAccordionState";
const SYSTEM_FILTER_STORAGE_KEY = "ccgGamesSystemFilter";
const THUMB_BASE_PATH = "../resources/images/thumbnails/all/";
const THUMB_PLACEHOLDER =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
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

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("../games/games.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load games.json");

        CCG_ALL_GAMES = await res.json();
        CCG_GAMES_TOTAL = CCG_ALL_GAMES.length;

        const masterGroups = groupGamesByLetter(CCG_ALL_GAMES);
        CCG_ALL_LETTERS = sortLetters(Object.keys(masterGroups));

        setupSearch();
        setupSystemFilter();
        setupYearFilter();
        applyActiveFilters({ preserveScroll: true });

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
            <button class="games-accordion__header" data-letter="${letter}" type="button" id="${headerId}" aria-controls="${contentId}">
                <span class="games-accordion__letter">${letter}${hintMarkup}</span>
                <span class="games-accordion__meta">${gamesForLetter.length.toLocaleString("en-US")} titles</span>
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
    initCardLazyRender();
    initThumbLazyLoad();
}

function renderSystemBiasHint(system) {
    if (!system) return "";
    const label = system === "C64" ? "C64 only" : "Amiga only";
    return `<span class="games-accordion__hint">${label}</span>`;
}

function renderGameShells(games, gameIndexRef) {
    return games.map(game => {
        const key = getGameKey(game, gameIndexRef.value++);
        CCG_GAME_CACHE.set(key, game);
        return renderGameCardShell(key);
    }).join("");
}

function renderAccordionContent({ gamesForLetter, systemBuckets, hasMixedSystems, gameIndexRef }) {
    if (CCG_ACTIVE_SYSTEM_FILTER === "all" && hasMixedSystems) {
        return `
            ${renderSystemGroup("Commodore 64", systemBuckets.C64, gameIndexRef)}
            ${renderSystemGroup("Amiga", systemBuckets.AMIGA, gameIndexRef)}
        `;
    }

    return `
        <div class="games-grid">
            ${renderGameShells(gamesForLetter, gameIndexRef)}
        </div>
    `;
}

function renderSystemGroup(label, games, gameIndexRef) {
    if (!games.length) return "";
    return `
        <div class="games-system-group">
            <div class="games-system-group__title">${label}</div>
            <div class="games-grid">
                ${renderGameShells(games, gameIndexRef)}
            </div>
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

    const behavior = isMobileLikeViewport() ? "auto" : "smooth";
    anchor.scrollIntoView({ behavior, block: "start" });
}

/* ============================================================
   SEARCH (REBUILD SAFE)
============================================================ */

function setupSearch() {
    const input = document.getElementById("gamesSearchInput");
    const clearBtn = document.getElementById("gamesSearchClear");
    if (!input) return;

    input.addEventListener("input", () => {
        CCG_ACTIVE_QUERY = input.value.toLowerCase();
        applyActiveFilters({ preserveScroll: true });
    });

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            input.value = "";
            CCG_ACTIVE_QUERY = "";
            applyActiveFilters({ preserveScroll: true });
        });
    }
}

function setupSystemFilter() {
    const buttons = document.querySelectorAll("[data-system-filter]");
    const hint = document.getElementById("gamesBrowseHint");
    if (!buttons.length) return;

    const initial = getInitialSystemFilter();
    setSystemFilter(initial, { persist: true, updateButtons: true, hintEl: hint });

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const system = btn.dataset.systemFilter || "all";
            setSystemFilter(system, { persist: true, updateButtons: true, hintEl: hint });
            applyActiveFilters({ preserveScroll: true });
        });
    });
}

function setupYearFilter() {
    const minInput = document.getElementById("gamesYearMin");
    const maxInput = document.getElementById("gamesYearMax");
    const valueEl = document.getElementById("gamesYearValue");
    if (!minInput || !maxInput) return;

    const years = CCG_ALL_GAMES
        .map(game => parseGameYear(game.year))
        .filter(year => Number.isFinite(year));

    CCG_YEAR_MIN = years.length ? Math.min(...years) : 1980;
    CCG_YEAR_MAX = years.length ? Math.max(...years) : 1995;
    CCG_ACTIVE_YEAR_MIN = CCG_YEAR_MIN;
    CCG_ACTIVE_YEAR_MAX = CCG_YEAR_MAX;

    minInput.min = String(CCG_YEAR_MIN);
    minInput.max = String(CCG_YEAR_MAX);
    maxInput.min = String(CCG_YEAR_MIN);
    maxInput.max = String(CCG_YEAR_MAX);
    minInput.value = String(CCG_ACTIVE_YEAR_MIN);
    maxInput.value = String(CCG_ACTIVE_YEAR_MAX);

    const updateRange = (source) => {
        const nextMin = Math.min(parseInt(minInput.value, 10), parseInt(maxInput.value, 10));
        const nextMax = Math.max(parseInt(minInput.value, 10), parseInt(maxInput.value, 10));

        if (source === "min") {
            minInput.value = String(nextMin);
        } else if (source === "max") {
            maxInput.value = String(nextMax);
        }

        CCG_ACTIVE_YEAR_MIN = nextMin;
        CCG_ACTIVE_YEAR_MAX = nextMax;
        updateYearRangeLabel(valueEl);
        applyActiveFilters({ preserveScroll: true });
    };

    minInput.addEventListener("input", () => updateRange("min"));
    maxInput.addEventListener("input", () => updateRange("max"));
    updateYearRangeLabel(valueEl);
}

function getInitialSystemFilter() {
    const stored = localStorage.getItem(SYSTEM_FILTER_STORAGE_KEY);
    if (isValidSystemFilter(stored)) return stored;

    const inferred = inferSystemFromReferrer();
    if (inferred) return inferred;

    const modeHint = document.body?.dataset?.ccgMode || document.body?.dataset?.mode || "";
    if (modeHint.toLowerCase() === "amiga") return "amiga";
    if (modeHint.toLowerCase() === "c64") return "c64";

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

    if (opts.hintEl) {
        opts.hintEl.textContent = `Browsing: ${getSystemFilterLabel(CCG_ACTIVE_SYSTEM_FILTER)}`;
    }
}

function applyActiveFilters({ preserveScroll } = {}) {
    const scrollY = preserveScroll ? window.scrollY : null;
    const filtered = getFilteredGames();

    buildGamesIndex(filtered);
    updateFocusPanel(filtered.length);

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
    const systemFilter = CCG_ACTIVE_SYSTEM_FILTER;

    return CCG_ALL_GAMES.filter(game => {
        const title = (game.title || "").toLowerCase();
        const matchesQuery = !query || title.includes(query);
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

    const query = CCG_ACTIVE_QUERY.trim();
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

    return `
        <div class="${classNames.join(" ")}"${keyAttr}>
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
    const slug = String(game?.slug || "").trim();
    if (slug) return `${slug}/`;

    const id = String(game?.id || "").trim();
    if (id) return `game.html?id=${encodeURIComponent(id)}`;

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
