(function () {
    "use strict";

    function normalize(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function initDownloadsArchive() {
        const archive = document.getElementById("downloadArchive");
        const searchInput = document.getElementById("downloadSearchInput");
        const clearButton = document.getElementById("downloadSearchClear");
        const visibleCount = document.getElementById("downloadVisibleCount");
        const emptyState = document.getElementById("downloadEmptyState");
        const systemButtons = Array.from(document.querySelectorAll("[data-download-system]"));
        const cards = Array.from(document.querySelectorAll("[data-download-card]"));
        const sections = Array.from(document.querySelectorAll("details[data-download-section]"));
        const letterLinks = Array.from(document.querySelectorAll("[data-download-letter-link]"));

        if (!archive || !searchInput || !visibleCount || !cards.length || !sections.length) return;

        let activeSystem = "all";
        let applyingAccordionState = false;

        function loadSectionImages(section) {
            if (!section) return;
            section.querySelectorAll("img[data-src]").forEach((image) => {
                const source = image.dataset.src;
                if (!source) return;
                image.src = source;
                image.removeAttribute("data-src");
            });
        }

        function closeOtherSections(current) {
            if (applyingAccordionState) return;
            applyingAccordionState = true;
            sections.forEach((section) => {
                if (section !== current && section.open) section.open = false;
            });
            applyingAccordionState = false;
        }

        function openSection(section, options = {}) {
            if (!section || section.hidden) return;
            closeOtherSections(section);
            section.open = true;
            loadSectionImages(section);

            if (options.scroll) {
                requestAnimationFrame(() => {
                    section.scrollIntoView({ behavior: "smooth", block: "start" });
                });
            }
        }

        function updateLetterLinks() {
            const availableLetters = new Set(
                sections
                    .filter((section) => !section.hidden)
                    .map((section) => section.dataset.letter)
            );

            letterLinks.forEach((link) => {
                const available = availableLetters.has(link.dataset.downloadLetterLink);
                link.classList.toggle("is-unavailable", !available);
                link.setAttribute("aria-disabled", available ? "false" : "true");
                link.tabIndex = available ? 0 : -1;
            });
        }

        function applyFilters(options = {}) {
            const query = normalize(searchInput.value);
            const filtersActive = Boolean(query) || activeSystem !== "all";
            let shown = 0;
            let firstVisibleSection = null;

            cards.forEach((card) => {
                const cardSystem = normalize(card.dataset.system);
                const searchText = normalize(card.dataset.search);
                const matchesSystem = activeSystem === "all" || cardSystem === activeSystem;
                const matchesSearch = !query || searchText.includes(query);
                const visible = matchesSystem && matchesSearch;

                card.hidden = !visible;
                if (visible) shown += 1;
            });

            sections.forEach((section) => {
                const sectionCards = Array.from(section.querySelectorAll("[data-download-card]"));
                const visibleSectionCards = sectionCards.filter((card) => !card.hidden);
                section.hidden = visibleSectionCards.length === 0;

                const countLabel = section.querySelector(".ccg-downloads-letter__count");
                if (countLabel) {
                    countLabel.textContent = `${visibleSectionCards.length} ${visibleSectionCards.length === 1 ? "game" : "games"}`;
                }

                if (!section.hidden && !firstVisibleSection) firstVisibleSection = section;
            });

            visibleCount.textContent = String(shown);
            if (emptyState) emptyState.hidden = shown !== 0;
            archive.hidden = shown === 0;
            updateLetterLinks();

            if (filtersActive && firstVisibleSection) {
                openSection(firstVisibleSection, { scroll: options.scrollToResults === true });
            } else if (!filtersActive && options.preserveOpen !== true) {
                sections.forEach((section) => {
                    section.open = false;
                });
            }
        }

        sections.forEach((section) => {
            section.addEventListener("toggle", function () {
                if (!section.open || applyingAccordionState) return;
                closeOtherSections(section);
                loadSectionImages(section);
            });
        });

        searchInput.addEventListener("input", function () {
            applyFilters({ scrollToResults: false });
        });

        if (clearButton) {
            clearButton.addEventListener("click", function () {
                searchInput.value = "";
                searchInput.focus();
                applyFilters();
            });
        }

        systemButtons.forEach((button) => {
            button.addEventListener("click", function () {
                activeSystem = normalize(button.dataset.downloadSystem) || "all";

                systemButtons.forEach((candidate) => {
                    const active = candidate === button;
                    candidate.classList.toggle("is-active", active);
                    candidate.setAttribute("aria-pressed", active ? "true" : "false");
                });

                applyFilters({ scrollToResults: activeSystem !== "all" });
            });
        });

        letterLinks.forEach((link) => {
            link.addEventListener("click", function (event) {
                event.preventDefault();
                if (link.classList.contains("is-unavailable")) return;

                const targetId = link.getAttribute("href");
                const target = targetId ? document.querySelector(targetId) : null;
                if (!target || target.hidden) return;

                openSection(target, { scroll: true });
                window.history.replaceState(null, "", targetId);
            });
        });

        applyFilters({ preserveOpen: true });

        const initialHash = window.location.hash;
        const initialSection = initialHash ? document.querySelector(initialHash) : null;
        if (initialSection && initialSection.matches("details[data-download-section]")) {
            openSection(initialSection, { scroll: false });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initDownloadsArchive, { once: true });
    } else {
        initDownloadsArchive();
    }
})();
