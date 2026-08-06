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

    function parsePublisherCounts(source) {
        const datasetC64 = Number(source?.c64Count);
        const datasetAmiga = Number(source?.amigaCount);
        const statsText = String(source?.statsText || "");
        const c64Match = statsText.match(/(\d+)\s+C64\b/i);
        const amigaMatch = statsText.match(/(\d+)\s+Amiga\b/i);

        return {
            c64Count: Number.isFinite(datasetC64) && datasetC64 >= 0
                ? datasetC64
                : Number(c64Match?.[1] || 0),
            amigaCount: Number.isFinite(datasetAmiga) && datasetAmiga >= 0
                ? datasetAmiga
                : Number(amigaMatch?.[1] || 0)
        };
    }

    function publisherDataMatches(item, query, system) {
        const name = normalize(item?.name);
        const normalizedQuery = normalize(query);
        const normalizedSystem = normalize(system) || "all";
        const counts = parsePublisherCounts(item);
        const nameMatches = !normalizedQuery || name.includes(normalizedQuery);
        const systemMatches =
            normalizedSystem === "all" ||
            (normalizedSystem === "c64" && counts.c64Count > 0) ||
            (normalizedSystem === "amiga" && counts.amigaCount > 0) ||
            (normalizedSystem === "both" && counts.c64Count > 0 && counts.amigaCount > 0);

        return nameMatches && systemMatches;
    }

    function getPublisherCardData(card) {
        const stats = card?.querySelector?.(".ccg-publisher-card__stats");

        return {
            name: card?.dataset?.publisherName || card?.querySelector?.(".ccg-publisher-card__title")?.textContent || "",
            c64Count: card?.dataset?.c64Count,
            amigaCount: card?.dataset?.amigaCount,
            statsText: stats?.textContent || ""
        };
    }

    function publisherCardMatches(card, query, system) {
        return publisherDataMatches(getPublisherCardData(card), query, system);
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

    function createSearchResultCard(card) {
        const clone = card.cloneNode(true);
        clone.hidden = false;
        clone.dataset.publisherSearchResult = "true";
        clone.classList.remove("ccg-publisher-card--featured");
        clone.querySelector(".ccg-publisher-card__eyebrow")?.remove();
        return clone;
    }

    function initPublisherIndex() {
        const grid = document.getElementById("publisherGrid");
        if (!grid) return;

        const search = document.getElementById("publisherSearchInput");
        const count = document.getElementById("publisherVisibleCount");
        const empty = document.getElementById("publisherEmptyState");
        const archiveCards = Array.from(grid.querySelectorAll("[data-publisher-card]"));
        const buttons = Array.from(document.querySelectorAll("[data-publisher-system]"));
        const featuredHeading = document.getElementById("featured-publishers-title");
        const featuredSection = featuredHeading?.closest(".ccg-publishers-section");
        const featuredGrid = featuredSection?.querySelector(".ccg-publisher-grid--featured");
        const featuredCards = Array.from(featuredGrid?.querySelectorAll("[data-publisher-card]") || []);
        const allCards = [...featuredCards, ...archiveCards];
        const archiveSection = grid.closest(".ccg-publishers-section");
        const archiveHeading = archiveSection?.querySelector("#all-publishers-title");
        const archiveKicker = archiveSection?.querySelector(".ccg-publishers-section__kicker");
        const defaultArchiveHeading = archiveHeading?.textContent || "All Publishers";
        const defaultArchiveKicker = archiveKicker?.textContent || "Full directory";
        let system = readInitialSystem(["all", "c64", "amiga", "both"]);

        function clearSearchResults() {
            grid.querySelectorAll("[data-publisher-search-result]").forEach((card) => card.remove());
        }

        function updateSearchPriority(query) {
            const hasSearch = Boolean(query);

            if (archiveHeading) {
                archiveHeading.textContent = hasSearch ? "Search Results" : defaultArchiveHeading;
            }

            if (archiveKicker) {
                archiveKicker.textContent = hasSearch ? "Matching publishers" : defaultArchiveKicker;
            }

            archiveSection?.classList.toggle("ccg-publishers-section--search-results", hasSearch);
        }

        function renderSearchResults(query) {
            const matches = allCards
                .filter((card) => publisherCardMatches(card, query, system))
                .sort((a, b) => normalize(getPublisherCardData(a).name).localeCompare(
                    normalize(getPublisherCardData(b).name),
                    "en",
                    { sensitivity: "base" }
                ));

            archiveCards.forEach((card) => {
                card.hidden = true;
            });

            featuredCards.forEach((card) => {
                card.hidden = true;
            });

            if (featuredSection) {
                featuredSection.hidden = true;
                featuredSection.setAttribute("aria-hidden", "true");
            }

            const fragment = document.createDocumentFragment();
            matches.forEach((card) => fragment.appendChild(createSearchResultCard(card)));
            grid.prepend(fragment);

            return matches.length;
        }

        function renderDirectory() {
            let visible = 0;
            let featuredVisible = 0;

            featuredCards.forEach((card) => {
                const show = publisherCardMatches(card, "", system);
                card.hidden = !show;
                if (show) {
                    featuredVisible += 1;
                    visible += 1;
                }
            });

            archiveCards.forEach((card) => {
                const show = publisherCardMatches(card, "", system);
                card.hidden = !show;
                if (show) visible += 1;
            });

            if (featuredSection) {
                featuredSection.hidden = featuredVisible === 0;
                featuredSection.setAttribute("aria-hidden", featuredVisible === 0 ? "true" : "false");
            }

            return visible;
        }

        function applyFilters() {
            const query = normalize(search?.value);
            clearSearchResults();
            const visible = query ? renderSearchResults(query) : renderDirectory();

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

    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            normalize,
            parsePublisherCounts,
            publisherDataMatches
        };
    }

    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init, { once: true });
        } else {
            init();
        }
    }
})();
