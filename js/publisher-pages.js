/* ============================================================
   CCG PUBLISHER PAGE ENHANCEMENTS
   ------------------------------------------------------------
   Progressive enhancement only:
   all publisher and game links remain present in static HTML.
============================================================ */

(function () {
    "use strict";

    function normalize(value) {
        return String(value || "").trim().toLowerCase();
    }

    function setPressed(buttons, activeValue, attributeName) {
        buttons.forEach((button) => {
            const isActive = normalize(button.getAttribute(attributeName)) === activeValue;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    function readInitialSystem(allowed) {
        try {
            const value = normalize(new URLSearchParams(window.location.search).get("system"));
            return allowed.includes(value) ? value : "all";
        } catch (error) {
            return "all";
        }
    }

    function updateSystemQuery(system) {
        try {
            const url = new URL(window.location.href);
            if (!system || system === "all") {
                url.searchParams.delete("system");
            } else {
                url.searchParams.set("system", system);
            }
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        } catch (error) {}
    }

    function initPublisherIndex() {
        const grid = document.getElementById("publisherGrid");
        if (!grid) return;

        const search = document.getElementById("publisherSearchInput");
        const count = document.getElementById("publisherVisibleCount");
        const empty = document.getElementById("publisherEmptyState");
        const cards = Array.from(grid.querySelectorAll("[data-publisher-card]"));
        const buttons = Array.from(document.querySelectorAll("[data-publisher-system]"));
        const featuredHeading = document.getElementById("featured-publishers-title");
        const featuredSection = featuredHeading?.closest(".ccg-publishers-section");
        const archiveSection = grid.closest(".ccg-publishers-section");
        const archiveHeading = archiveSection?.querySelector("#all-publishers-title");
        const archiveKicker = archiveSection?.querySelector(".ccg-publishers-section__kicker");
        const defaultArchiveHeading = archiveHeading?.textContent || "All Publishers";
        const defaultArchiveKicker = archiveKicker?.textContent || "Full archive";
        let system = readInitialSystem(["all", "c64", "amiga"]);

        function updateSearchPriority(query) {
            const hasSearch = Boolean(query);

            if (featuredSection) {
                featuredSection.hidden = hasSearch;
                featuredSection.setAttribute("aria-hidden", hasSearch ? "true" : "false");
            }

            if (archiveHeading) {
                archiveHeading.textContent = hasSearch ? "Search Results" : defaultArchiveHeading;
            }

            if (archiveKicker) {
                archiveKicker.textContent = hasSearch ? "Matching publishers" : defaultArchiveKicker;
            }

            archiveSection?.classList.toggle("ccg-publishers-section--search-results", hasSearch);
        }

        function applyFilters() {
            const query = normalize(search?.value);
            let visible = 0;

            cards.forEach((card) => {
                const name = normalize(card.dataset.publisherName);
                const nameMatches = !query || name.includes(query);
                const c64Count = Number(card.dataset.c64Count || 0);
                const amigaCount = Number(card.dataset.amigaCount || 0);

                const systemMatches =
                    system === "all" ||
                    (system === "c64" && c64Count > 0) ||
                    (system === "amiga" && amigaCount > 0);

                const show = nameMatches && systemMatches;
                card.hidden = !show;
                if (show) visible += 1;
            });

            updateSearchPriority(query);
            if (count) count.textContent = String(visible);
            if (empty) empty.hidden = visible !== 0;
            setPressed(buttons, system, "data-publisher-system");
        }

        search?.addEventListener("input", applyFilters);
        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                system = normalize(button.dataset.publisherSystem) || "all";
                updateSystemQuery(system);
                applyFilters();
            });
        });

        applyFilters();
    }

    function initPublisherGames() {
        const grid = document.getElementById("publisherGameGrid");
        if (!grid) return;

        const search = document.getElementById("publisherGameSearchInput");
        const count = document.getElementById("publisherGameVisibleCount");
        const empty = document.getElementById("publisherGameEmptyState");
        const cards = Array.from(grid.querySelectorAll("[data-publisher-game]"));
        const buttons = Array.from(document.querySelectorAll("[data-publisher-game-system]"));
        let system = readInitialSystem(["all", "c64", "amiga"]);

        function applyFilters() {
            const query = normalize(search?.value);
            let visible = 0;

            cards.forEach((card) => {
                const title = normalize(card.dataset.gameTitle);
                const gameSystem = normalize(card.dataset.system);
                const nameMatches = !query || title.includes(query);
                const systemMatches =
                    system === "all" ||
                    (system === "c64" && (gameSystem === "c64" || gameSystem.includes("commodore 64"))) ||
                    (system === "amiga" && gameSystem.includes("amiga"));

                const show = nameMatches && systemMatches;
                card.hidden = !show;
                if (show) visible += 1;
            });

            if (count) count.textContent = String(visible);
            if (empty) empty.hidden = visible !== 0;
            setPressed(buttons, system, "data-publisher-game-system");
        }

        search?.addEventListener("input", applyFilters);
        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                system = normalize(button.dataset.publisherGameSystem) || "all";
                updateSystemQuery(system);
                applyFilters();
            });
        });

        applyFilters();
    }

    function init() {
        initPublisherIndex();
        initPublisherGames();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
