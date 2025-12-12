/* ============================================================
   GAMES LIBRARY — OMEGA STABLE + PERFORMANCE (PHASE C4)
   ------------------------------------------------------------
   • Accordion layout (A–Z)
   • Search & filter support
   • Session-based accordion state memory
   • Image decode & LCP hardening
   • IntersectionObserver preload tuning
   • NEW: Runtime optimisation (cached DOM + cached titles + rAF input)
============================================================ */

let CCG_ALL_GAMES = [];
const ACCORDION_STATE_KEY = "ccgAccordionState";

let thumbObserver = null;

/* Cached runtime structures (Phase C4) */
let CCG_GROUP_CACHE = []; // [{ groupEl, cards: [{ el, titleLower }] }]

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("games.json");
        const games = await response.json();

        CCG_ALL_GAMES = Array.isArray(games) ? games : [];

        initThumbnailObserver();
        buildGamesAccordion(CCG_ALL_GAMES);
        restoreAccordionState();
        wireSearchFilter();

    } catch (err) {
        console.error("[CCG] Failed to load games.json:", err);
    }
});

/* ============================================================
   INTERSECTION OBSERVER — THUMBNAILS
============================================================ */

function initThumbnailObserver() {
    if (!("IntersectionObserver" in window)) return;

    thumbObserver = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                const img = entry.target;
                thumbObserver.unobserve(img);

                // Encourage earlier decode once near viewport
                img.loading = "eager";
                img.decoding = "async";

                if (img.decode) {
                    img.decode().catch(() => {});
                }
            });
        },
        {
            root: null,
            rootMargin: "300px 0px",
            threshold: 0.01
        }
    );
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
        const group = document.querySelector(
            `.games-accordion__group[data-letter="${letter}"]`
        );
        if (group) group.classList.add("is-open");
    });
}

/* ============================================================
   BUILD ACCORDION
============================================================ */

function buildGamesAccordion(games) {
    const container = document.getElementById("gamesAccordion");
    if (!container) return;

    container.innerHTML = "";
    CCG_GROUP_CACHE = [];

    const groups = {};

    games.forEach(game => {
        const firstLetter = (game.title || "#")[0].toUpperCase();
        if (!groups[firstLetter]) groups[firstLetter] = [];
        groups[firstLetter].push(game);
    });

    Object.keys(groups)
        .sort()
        .forEach(letter => {
            const groupEl = document.createElement("div");
            groupEl.className = "games-accordion__group";
            groupEl.dataset.letter = letter;

            groupEl.innerHTML = `
                <button class="games-accordion__header" type="button">
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
                toggleAccordionState(letter, isOpen);
            });
        });

    observeThumbnails(container);
    buildGroupCache(container);
}

/* ============================================================
   RUNTIME CACHE (Phase C4)
============================================================ */

function buildGroupCache(container) {
    // Cache group elements and per-card titleLower once.
    const groups = container.querySelectorAll(".games-accordion__group");

    CCG_GROUP_CACHE = Array.from(groups).map(groupEl => {
        const cards = Array.from(groupEl.querySelectorAll(".ccg-game-card")).map(el => {
            const titleEl = el.querySelector(".ccg-game-card__title");
            const titleLower = (titleEl ? titleEl.textContent : "").toLowerCase();
            return { el, titleLower };
        });

        return { groupEl, cards };
    });
}

/* ============================================================
   THUMBNAIL OBSERVATION
============================================================ */

function observeThumbnails(root) {
    if (!thumbObserver) return;

    root.querySelectorAll("img[loading='lazy']").forEach(img => {
        thumbObserver.observe(img);
    });
}

/* ============================================================
   GAME CARD RENDERER — PERFORMANCE HARDENED
============================================================ */

function renderGameCard(game) {
    const thumb = resolveGameThumb(game.thumbnail || game.thumb || game.cover);

    return `
        <a href="game.html?id=${game.id}" class="ccg-game-card">
            <div class="ccg-game-card__thumb">
                <img
                    src="${thumb}"
                    alt="${game.title}"
                    loading="lazy"
                    decoding="async"
                    fetchpriority="low"
                >
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
   THUMBNAIL RESOLVER (PRESERVED)
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
   SEARCH / FILTER — RUNTIME OPTIMISED (Phase C4)
============================================================ */

function wireSearchFilter() {
    const input = document.getElementById("gamesSearch");
    if (!input) return;

    let rafPending = false;
    let lastTerm = "";

    function applyFilter(term) {
        // Uses cached cards + cached lowercased titles.
        CCG_GROUP_CACHE.forEach(({ groupEl, cards }) => {
            let anyVisible = false;

            cards.forEach(({ el, titleLower }) => {
                const visible = titleLower.includes(term);
                el.style.display = visible ? "" : "none";
                if (visible) anyVisible = true;
            });

            groupEl.style.display = anyVisible ? "" : "none";
        });
    }

    input.addEventListener("input", () => {
        lastTerm = (input.value || "").toLowerCase();

        // rAF throttle keeps typing smooth on huge libraries.
        if (rafPending) return;
        rafPending = true;

        requestAnimationFrame(() => {
            rafPending = false;
            applyFilter(lastTerm);
        });
    });
}
