/* ============================================================
   CCG GLOBAL SEARCH
   ------------------------------------------------------------
   Searches the existing CCG game and content indexes without
   changing any source data or generated page routes.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_GLOBAL_SEARCH_READY) return;
    window.CCG_GLOBAL_SEARCH_READY = true;

    const SEARCH_CSS = "/resources/css/ccg-global-search.css";
    const GAME_INDEX = "/games/games-search.json";
    const RETRO_INDEX = "/data/retro-specials.json";
    const VIDEO_INDEX = "/videos/video-index.json";
    const DEMO_MUSIC_INDEX = "/data/amiga-demo-music.json";
    const RETRO_EVENTS_INDEX = "/data/retro-events.json";
    const MIN_QUERY_LENGTH = 2;
    const MAX_GROUP_RESULTS = 8;

    const COLLECTIONS = [
        { title: "Cartridge Games", href: "/games/collections/cartridge-games.html", meta: "Curated collection" },
        { title: "Licensed Games", href: "/games/collections/licensed-games.html", meta: "Curated collection" },
        { title: "BPjS / BPjM Indexed Games", href: "/games/collections/bpjs-indexed-games.html", meta: "Curated collection" },
        { title: "Top Picks", href: "/games/collections/top-picks.html", meta: "CCG favourites" },
        { title: "Amiga Demo Music", href: "/games/collections/amiga-demo-music.html", meta: "Amiga collection" },
        { title: "Retro Events", href: "/games/collections/retro-events.html", meta: "Event archive" },
        { title: "Retro Specials", href: "/games/collections/retro-specials.html", meta: "Video features" }
    ];

    const SITE_SECTIONS = [
        { title: "Browse All Games", href: "/games/", meta: "Complete C64 and Amiga game archive", searchText: "games a to z archive commodore 64 amiga" },
        { title: "Browse by Genre", href: "/games/genres/", meta: "Explore every game genre", searchText: "genres platform shooting adventure puzzle sports strategy" },
        { title: "Publishers", href: "/games/publishers/", meta: "Publisher histories and game catalogues", searchText: "publishers companies software labels history" },
        { title: "Collections", href: "/games/collections/", meta: "Curated CCG game and video collections", searchText: "collections cartridge licensed bpjs top picks retro specials" },
        { title: "Music Hub", href: "/music/", meta: "Composers, game music and Amiga demo music", searchText: "music composers sid mod soundtrack musicians" },
        { title: "Video Library", href: "/videos/", meta: "C64, Amiga and Retro Special videos", searchText: "videos youtube game reviews retro specials" },
        { title: "Zzap!64 Reviews & Awards", href: "/zzap64/", meta: "Sizzlers, Gold Medals and magazine reviews", searchText: "zzap reviews awards sizzlers gold silver medals magazine" },
        { title: "Find Me a Game", href: "/games/discover/", meta: "Choose a system, year, genre or publisher", searchText: "find discover recommend random game" },
        { title: "CCG Quiz", href: "/quiz/quiz.html", meta: "Commodore and retro gaming trivia", searchText: "quiz questions trivia" },
        { title: "Emulation Guide", href: "/emulation.html", meta: "Help playing C64 and Amiga games", searchText: "emulation emulator vice winuae guide help" },
        { title: "About Cheeky Commodore Gamer", href: "/about.html", meta: "About the CCG archive and channel", searchText: "about cheeky commodore gamer channel" },
        { title: "Contact CCG", href: "/contact.html", meta: "Contact Cheeky Commodore Gamer", searchText: "contact email message" }
    ];

    const GENRE_ROUTES = new Map([
        ["action adventure", "action-adventure-games.html"],
        ["adventure", "adventure-games.html"],
        ["arcade", "arcade-games.html"],
        ["casino", "casino-games.html"],
        ["fighting", "fighting-games.html"],
        ["horror", "horror-games.html"],
        ["miscellaneous", "miscellaneous.html"],
        ["platform", "platform-games.html"],
        ["puzzle", "puzzle-games.html"],
        ["quiz", "quiz-games.html"],
        ["racing", "racing-games.html"],
        ["role playing", "role-playing-games.html"],
        ["rpg", "role-playing-games.html"],
        ["shooting", "shooting-games.html"],
        ["sports", "sports-games.html"],
        ["strategy", "strategy-games.html"]
    ]);

    const state = {
        ready: false,
        loading: false,
        games: [],
        publishers: [],
        composers: [],
        genres: [],
        collections: COLLECTIONS,
        sections: SITE_SECTIONS,
        specials: [],
        videos: [],
        demoMusic: [],
        events: [],
        modal: null,
        input: null,
        results: null,
        status: null,
        trigger: null,
        previousFocus: null
    };

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[’']/g, "")
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9\s]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function slugify(value) {
        return normalize(value)
            .replace(/\band\b/g, "and")
            .replace(/\s+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function titleCase(value) {
        return String(value || "")
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => word.length <= 3 && word === word.toUpperCase()
                ? word
                : word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    function toArray(value) {
        if (Array.isArray(value)) return value;
        return value ? [value] : [];
    }

    function ensureCss() {
        if (document.querySelector(`link[href="${SEARCH_CSS}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = SEARCH_CSS;
        document.head.appendChild(link);
    }

    function buildUniqueItems(games, key, mapper) {
        const items = new Map();
        games.forEach((game) => {
            toArray(game[key]).forEach((raw) => {
                const value = String(raw || "").trim();
                const normalized = normalize(value);
                if (!normalized || items.has(normalized)) return;
                items.set(normalized, mapper(value, normalized));
            });
        });
        return Array.from(items.values()).sort((a, b) => a.title.localeCompare(b.title));
    }

    function genreHref(value) {
        const normalized = normalize(value);
        const route = GENRE_ROUTES.get(normalized) || `${slugify(value)}-games.html`;
        return `/games/genres/${route}`;
    }

    async function loadIndex() {
        if (state.ready || state.loading) return;
        state.loading = true;
        renderLoading();

        try {
            const [gamesResponse, specialsResponse, videosResponse, demoMusicResponse, eventsResponse] = await Promise.allSettled([
                fetch(GAME_INDEX, { cache: "no-store" }).then((response) => {
                    if (!response.ok) throw new Error(`Game index HTTP ${response.status}`);
                    return response.json();
                }),
                fetch(RETRO_INDEX, { cache: "no-store" }).then((response) => {
                    if (!response.ok) throw new Error(`Retro index HTTP ${response.status}`);
                    return response.json();
                }),
                fetch(VIDEO_INDEX, { cache: "no-store" }).then((response) => {
                    if (!response.ok) throw new Error(`Video index HTTP ${response.status}`);
                    return response.json();
                }),
                fetch(DEMO_MUSIC_INDEX, { cache: "no-store" }).then((response) => {
                    if (!response.ok) throw new Error(`Demo music index HTTP ${response.status}`);
                    return response.json();
                }),
                fetch(RETRO_EVENTS_INDEX, { cache: "no-store" }).then((response) => {
                    if (!response.ok) throw new Error(`Retro events index HTTP ${response.status}`);
                    return response.json();
                })
            ]);

            if (gamesResponse.status !== "fulfilled" || !Array.isArray(gamesResponse.value)) {
                throw new Error("The game search index could not be loaded.");
            }

            state.games = gamesResponse.value.map((game) => ({
                title: String(game.title || "Untitled game"),
                href: `/games/${String(game.slug || "").replace(/^\/+|\/+$/g, "")}/`,
                meta: [game.year, ...toArray(game.publisher).slice(0, 2)].filter(Boolean).join(" · "),
                searchText: [
                    game.title,
                    game.slug,
                    game.year,
                    ...toArray(game.publisher),
                    ...toArray(game.genres || game.genre),
                    ...toArray(game.composer)
                ].filter(Boolean).join(" ")
            }));

            state.publishers = buildUniqueItems(gamesResponse.value, "publisher", (value) => ({
                title: value,
                href: `/games/publishers/${slugify(value)}/`,
                meta: "Publisher archive",
                searchText: value
            }));

            state.composers = buildUniqueItems(gamesResponse.value, "composer", (value) => ({
                title: value,
                href: `/music/${slugify(value)}/`,
                meta: "Composer archive",
                searchText: value
            }));

            const genreSource = gamesResponse.value.map((game) => ({
                genre: game.genres || game.genre
            }));
            state.genres = buildUniqueItems(genreSource, "genre", (value) => ({
                title: titleCase(value),
                href: genreHref(value),
                meta: "Game genre",
                searchText: value
            }));

            if (specialsResponse.status === "fulfilled" && Array.isArray(specialsResponse.value)) {
                state.specials = specialsResponse.value.map((item) => ({
                    title: String(item.title || "Retro Special"),
                    href: `/retro-specials/${String(item.slug || item.id || "").replace(/^\/+|\/+$/g, "")}/`,
                    meta: String(item.summary || "CCG Retro Special"),
                    searchText: [item.title, item.summary, item.description].filter(Boolean).join(" ")
                }));
            }

            if (videosResponse.status === "fulfilled" && Array.isArray(videosResponse.value?.items)) {
                state.videos = videosResponse.value.items.map((item) => ({
                    title: String(item.title || "CCG video"),
                    href: String(item.url || "/videos/"),
                    meta: [item.badge, item.platform, item.year].filter(Boolean).join(" · "),
                    searchText: [item.title, item.description, item.platform, item.publisher, item.collectionLabel].filter(Boolean).join(" ")
                }));
            }

            if (demoMusicResponse.status === "fulfilled" && Array.isArray(demoMusicResponse.value)) {
                state.demoMusic = demoMusicResponse.value.map((item) => ({
                    title: String(item.title || "Amiga demo music"),
                    href: `/amiga-demo-music/${String(item.slug || item.id || "").replace(/^\/+|\/+$/g, "")}/`,
                    meta: [item.composer, item.demo_group, item.year].filter(Boolean).join(" · "),
                    searchText: [item.title, item.summary, item.description, item.composer, item.demo_group, item.year, item.format].filter(Boolean).join(" ")
                }));
            }

            if (eventsResponse.status === "fulfilled" && Array.isArray(eventsResponse.value)) {
                state.events = eventsResponse.value.map((item) => ({
                    title: String(item.title || "Retro event"),
                    href: `/retro-events/${String(item.slug || item.id || "").replace(/^\/+|\/+$/g, "")}/`,
                    meta: "CCG Retro Event",
                    searchText: [item.title, item.summary, item.description].filter(Boolean).join(" ")
                }));
            }

            state.ready = true;
            state.loading = false;
            renderForCurrentQuery();
        } catch (error) {
            state.loading = false;
            renderError(error);
        }
    }

    function scoreItem(item, query) {
        const title = normalize(item.title);
        const haystack = normalize(`${item.title} ${item.searchText || ""} ${item.meta || ""}`);
        if (title === query) return 0;
        if (title.startsWith(query)) return 10;
        if (title.includes(query)) return 20;
        if (haystack.includes(query)) return 30;
        return Number.POSITIVE_INFINITY;
    }

    function findMatches(items, query) {
        return items
            .map((item) => ({ item, score: scoreItem(item, query) }))
            .filter((entry) => Number.isFinite(entry.score))
            .sort((a, b) => a.score - b.score || a.item.title.localeCompare(b.item.title))
            .map((entry) => entry.item);
    }

    function createResultLink(item, type) {
        const link = document.createElement("a");
        link.className = "ccg-global-search__result";
        link.href = item.href;

        const main = document.createElement("span");
        main.className = "ccg-global-search__result-main";

        const title = document.createElement("span");
        title.className = "ccg-global-search__result-title";
        title.textContent = item.title;
        main.appendChild(title);

        if (item.meta) {
            const meta = document.createElement("span");
            meta.className = "ccg-global-search__result-meta";
            meta.textContent = item.meta;
            main.appendChild(meta);
        }

        const badge = document.createElement("span");
        badge.className = "ccg-global-search__result-type";
        badge.textContent = type;

        link.append(main, badge);
        return link;
    }

    function appendGroup(fragment, title, type, matches) {
        if (!matches.length) return 0;

        const section = document.createElement("section");
        section.className = "ccg-global-search__group";

        const heading = document.createElement("h3");
        heading.className = "ccg-global-search__group-title";
        heading.append(document.createTextNode(title));

        const count = document.createElement("span");
        count.className = "ccg-global-search__group-count";
        count.textContent = String(matches.length);
        heading.appendChild(count);

        const list = document.createElement("ul");
        list.className = "ccg-global-search__list";

        matches.slice(0, MAX_GROUP_RESULTS).forEach((item) => {
            const li = document.createElement("li");
            li.appendChild(createResultLink(item, type));
            list.appendChild(li);
        });

        section.append(heading, list);
        fragment.appendChild(section);
        return matches.length;
    }

    function renderForCurrentQuery() {
        if (!state.results || !state.input) return;
        const raw = state.input.value.trim();
        const query = normalize(raw);
        state.results.textContent = "";

        if (query.length < MIN_QUERY_LENGTH) {
            const message = document.createElement("div");
            message.className = "ccg-global-search__empty";
            message.textContent = "Type at least two characters to search games, publishers, composers, genres, videos, music, events and the main CCG sections.";
            state.results.appendChild(message);
            if (state.status) state.status.textContent = "Search every major part of the CCG website.";
            return;
        }

        if (!state.ready) {
            loadIndex();
            return;
        }

        const groups = [
            ["Website Sections", "Section", findMatches(state.sections, query)],
            ["Games", "Game", findMatches(state.games, query)],
            ["Videos", "Video", findMatches(state.videos, query)],
            ["Publishers", "Publisher", findMatches(state.publishers, query)],
            ["Composers", "Composer", findMatches(state.composers, query)],
            ["Genres", "Genre", findMatches(state.genres, query)],
            ["Collections", "Collection", findMatches(state.collections, query)],
            ["Retro Specials", "Special", findMatches(state.specials, query)],
            ["Amiga Demo Music", "Music", findMatches(state.demoMusic, query)],
            ["Retro Events", "Event", findMatches(state.events, query)]
        ];

        const fragment = document.createDocumentFragment();
        let total = 0;
        groups.forEach(([title, type, matches]) => {
            total += appendGroup(fragment, title, type, matches);
        });

        if (!total) {
            const message = document.createElement("div");
            message.className = "ccg-global-search__empty";
            message.textContent = `No archive results were found for “${raw}”.`;
            fragment.appendChild(message);
        }

        state.results.appendChild(fragment);
        if (state.status) {
            state.status.textContent = total
                ? `${total.toLocaleString("en-GB")} matching archive entries.`
                : "No matching archive entries.";
        }
    }

    function renderLoading() {
        if (!state.results) return;
        state.results.textContent = "";
        const message = document.createElement("div");
        message.className = "ccg-global-search__loading";
        message.textContent = "Loading the CCG archive…";
        state.results.appendChild(message);
        if (state.status) state.status.textContent = "Loading search data.";
    }

    function renderError(error) {
        if (!state.results) return;
        state.results.textContent = "";
        const message = document.createElement("div");
        message.className = "ccg-global-search__empty";
        message.textContent = "The archive search could not be loaded. Please refresh the page and try again.";
        state.results.appendChild(message);
        if (state.status) state.status.textContent = String(error?.message || "Search unavailable.");
    }

    function openSearch() {
        if (!state.modal) return;
        state.previousFocus = document.activeElement;
        state.modal.hidden = false;
        state.modal.setAttribute("aria-hidden", "false");
        document.documentElement.classList.add("ccg-global-search-open");
        requestAnimationFrame(() => state.input?.focus());
        if (!state.ready && !state.loading) loadIndex();
    }

    function closeSearch() {
        if (!state.modal || state.modal.hidden) return;
        state.modal.hidden = true;
        state.modal.setAttribute("aria-hidden", "true");
        document.documentElement.classList.remove("ccg-global-search-open");
        if (state.previousFocus instanceof HTMLElement) state.previousFocus.focus();
    }

    function createModal() {
        const modal = document.createElement("div");
        modal.className = "ccg-global-search";
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");

        modal.innerHTML = `
            <div class="ccg-global-search__backdrop" data-ccg-global-search-close></div>
            <section class="ccg-global-search__dialog" role="dialog" aria-modal="true" aria-labelledby="ccg-global-search-title">
                <header class="ccg-global-search__header">
                    <div>
                        <p class="ccg-global-search__eyebrow">CCG archive search</p>
                        <h2 class="ccg-global-search__title" id="ccg-global-search-title">Search the Entire Website</h2>
                    </div>
                    <button class="ccg-global-search__close" type="button" aria-label="Close search" data-ccg-global-search-close>×</button>
                </header>
                <div class="ccg-global-search__form">
                    <label class="visually-hidden" for="ccgGlobalSearchInput">Search the CCG website</label>
                    <input class="ccg-global-search__input" id="ccgGlobalSearchInput" type="search" autocomplete="off" placeholder="Search games, publishers, composers, videos, music…">
                    <p class="ccg-global-search__help">Search across the CCG website. Press Escape to close.</p>
                    <p class="ccg-global-search__status" id="ccgGlobalSearchStatus" aria-live="polite">Search every major part of the CCG website.</p>
                </div>
                <div class="ccg-global-search__results" id="ccgGlobalSearchResults"></div>
            </section>
        `;

        document.body.appendChild(modal);
        state.modal = modal;
        state.input = modal.querySelector("#ccgGlobalSearchInput");
        state.results = modal.querySelector("#ccgGlobalSearchResults");
        state.status = modal.querySelector("#ccgGlobalSearchStatus");

        modal.querySelectorAll("[data-ccg-global-search-close]").forEach((button) => {
            button.addEventListener("click", closeSearch);
        });

        state.input?.addEventListener("input", renderForCurrentQuery);
        modal.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeSearch();
            }
        });

        renderForCurrentQuery();
    }

    function createTrigger() {
        const actions = document.querySelector(".ccg-header-actions");
        const main = document.querySelector("main.ccg-main, .ccg-main");
        const homeMain = document.querySelector('html[data-ccg-page="home"] .ccg-main--home');
        const commandMain = homeMain || main;
        if ((!actions && !commandMain) || document.querySelector("[data-ccg-global-search-trigger]")) return;

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "ccg-global-search-trigger";
        trigger.setAttribute("data-ccg-global-search-trigger", "true");
        trigger.setAttribute("aria-label", "Search the entire Cheeky Commodore Gamer website");
        trigger.innerHTML = `
            <span class="ccg-global-search-trigger__icon" aria-hidden="true"></span>
            <span class="ccg-global-search-trigger__copy">
                <span class="ccg-global-search-trigger__eyebrow">Search anything on CCG</span>
                <span class="ccg-global-search-trigger__label">
                    <span class="ccg-global-search-trigger__label-short">Search</span>
                    <span class="ccg-global-search-trigger__label-full">Search the Entire CCG Website</span>
                </span>
                <span class="ccg-global-search-trigger__scope">Games · publishers · composers · videos · music · events &amp; more</span>
            </span>
            <span class="ccg-global-search-trigger__shortcut" aria-hidden="true">Ctrl K</span>
        `;
        trigger.addEventListener("click", openSearch);

        if (commandMain) {
            let command = commandMain.querySelector(":scope > .ccg-home-search-command");
            if (!(command instanceof HTMLElement)) {
                command = document.createElement("div");
                command.className = "ccg-home-search-command";
                command.setAttribute("role", "search");
                command.setAttribute("aria-label", "Search the CCG website");
            }
            trigger.classList.add("ccg-global-search-trigger--home");
            command.appendChild(trigger);
            if (commandMain.firstElementChild !== command) commandMain.insertBefore(command, commandMain.firstChild);
        } else {
            const socialLinks = actions.querySelector(".ccg-header-socials");
            actions.insertBefore(trigger, socialLinks || actions.firstChild);
        }
        state.trigger = trigger;
    }

    function handleGlobalShortcut(event) {
        const target = event.target;
        const editable = target instanceof HTMLElement && (
            target.matches("input, textarea, select, [contenteditable='true']") ||
            Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
        );

        const commandSearch = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
        const slashSearch = event.key === "/" && !editable && !event.ctrlKey && !event.metaKey && !event.altKey;

        if (commandSearch || slashSearch) {
            event.preventDefault();
            openSearch();
        }
    }

    function init() {
        ensureCss();
        createModal();
        createTrigger();
        document.addEventListener("keydown", handleGlobalShortcut);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
