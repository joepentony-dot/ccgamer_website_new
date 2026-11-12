/* ============================================================
   CCG DEVELOPER PAGE ENHANCEMENTS
   ------------------------------------------------------------
   Progressive enhancement only. Developer and game links remain
   present in static HTML when JavaScript is unavailable.
============================================================ */

(function () {
    "use strict";

    function normalize(value) {
        return String(value || "").trim().toLowerCase();
    }

    function developerCountSuffix(count, hasSearch) {
        const noun = count === 1 ? "developer" : "developers";
        return hasSearch ? ` ${noun} found` : ` ${noun} available`;
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

    function initDeveloperIndex() {
        const grid = document.getElementById("developerGrid");
        if (!grid) return;

        const search = document.getElementById("developerSearchInput");
        const count = document.getElementById("developerVisibleCount");
        const empty = document.getElementById("developerEmptyState");
        const directory = grid.closest("[data-developer-directory-disclosure]");
        const summary = directory?.querySelector("summary");
        const originalSummary = summary?.textContent || "";
        const heading = document.getElementById("all-developers-title");
        const originalHeading = heading?.textContent || "Other Developers";
        const featuredSection = document.querySelector('[aria-labelledby="represented-developers-title"]');
        const featuredCards = Array.from(featuredSection?.querySelectorAll("[data-developer-card]") || []);
        const directoryCards = Array.from(grid.querySelectorAll("[data-developer-card]"));
        const allCards = [...featuredCards, ...directoryCards];
        const buttons = Array.from(document.querySelectorAll("[data-developer-system]"));
        let system = readInitialSystem(["all", "c64", "amiga"]);
        let manuallyExpanded = false;

        function matches(card, query) {
            const name = normalize(card.dataset.developerName);
            const c64Count = Number(card.dataset.c64Count || 0);
            const amigaCount = Number(card.dataset.amigaCount || 0);
            return (!query || name.includes(query)) && (
                system === "all" ||
                (system === "c64" && c64Count > 0) ||
                (system === "amiga" && amigaCount > 0)
            );
        }

        summary?.addEventListener("click", (event) => {
            // Active results must not disappear inside a closed disclosure.
            if (normalize(search?.value) || system !== "all") {
                event.preventDefault();
                return;
            }
            manuallyExpanded = !directory.open;
        });

        function applyFilters() {
            const query = normalize(search?.value);
            const hasSearch = Boolean(query);
            let visible = 0;

            grid.querySelectorAll("[data-developer-search-result]").forEach((card) => card.remove());

            if (hasSearch) {
                // Show one alphabetic result per credit, including featured developers.
                if (featuredSection) featuredSection.hidden = true;
                directoryCards.forEach((card) => { card.hidden = true; });

                const matchesAll = allCards.filter((card) => matches(card, query))
                    .sort((a, b) => normalize(a.dataset.developerName).localeCompare(
                        normalize(b.dataset.developerName), "en", { sensitivity: "base" }
                    ));
                const results = document.createDocumentFragment();
                matchesAll.forEach((card) => {
                    const copy = card.cloneNode(true);
                    copy.hidden = false;
                    copy.dataset.developerSearchResult = "true";
                    results.appendChild(copy);
                });
                grid.prepend(results);
                visible = matchesAll.length;
            } else {
                if (featuredSection) featuredSection.hidden = false;
                featuredCards.forEach((card) => {
                    const show = matches(card, "");
                    card.hidden = !show;
                    if (show) visible += 1;
                });
                directoryCards.forEach((card) => {
                    const show = matches(card, "");
                    card.hidden = !show;
                    if (show) visible += 1;
                });
            }

            if (directory) directory.open = hasSearch || system !== "all" || manuallyExpanded;
            if (summary) summary.textContent = hasSearch ? "Search Results" : originalSummary;
            if (heading) heading.textContent = hasSearch ? "Matching Developers" : originalHeading;
            if (count) count.textContent = String(visible);
            if (count?.parentElement?.lastChild?.nodeType === 3) {
                count.parentElement.lastChild.nodeValue = developerCountSuffix(visible, hasSearch);
            }
            if (empty) empty.hidden = visible !== 0;
            setPressed(buttons, system, "data-developer-system");
        }

        search?.addEventListener("input", applyFilters);
        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                system = normalize(button.dataset.developerSystem) || "all";
                updateSystemQuery(system);
                applyFilters();
            });
        });

        applyFilters();
    }

    function initDeveloperGames() {
        const grid = document.getElementById("developerGameGrid");
        if (!grid) return;

        const search = document.getElementById("developerGameSearchInput");
        const count = document.getElementById("developerGameVisibleCount");
        const empty = document.getElementById("developerGameEmptyState");
        const cards = Array.from(grid.querySelectorAll("[data-developer-game]"));
        const buttons = Array.from(document.querySelectorAll("[data-developer-game-system]"));
        let system = readInitialSystem(["all", "c64", "amiga"]);

        function applyFilters() {
            const query = normalize(search?.value);
            let visible = 0;

            cards.forEach((card) => {
                const title = normalize(card.dataset.gameTitle);
                const gameSystem = normalize(card.dataset.system);
                const titleMatches = !query || title.includes(query);
                const systemMatches =
                    system === "all" ||
                    (system === "c64" && (gameSystem === "c64" || gameSystem.includes("commodore 64"))) ||
                    (system === "amiga" && gameSystem.includes("amiga"));
                const show = titleMatches && systemMatches;

                card.hidden = !show;
                if (show) visible += 1;
            });

            if (count) count.textContent = String(visible);
            if (count?.parentElement?.lastChild?.nodeType === 3) {
                count.parentElement.lastChild.nodeValue = visible === 1 ? " game shown" : " games shown";
            }
            if (empty) empty.hidden = visible !== 0;
            setPressed(buttons, system, "data-developer-game-system");
        }

        search?.addEventListener("input", applyFilters);
        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                system = normalize(button.dataset.developerGameSystem) || "all";
                updateSystemQuery(system);
                applyFilters();
            });
        });

        applyFilters();
    }

    function init() {
        initDeveloperIndex();
        initDeveloperGames();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
