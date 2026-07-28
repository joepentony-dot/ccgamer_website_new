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
        const sections = Array.from(document.querySelectorAll("[data-download-section]"));
        const letterLinks = Array.from(document.querySelectorAll("[data-download-letter-link]"));

        if (!archive || !searchInput || !visibleCount || !cards.length) return;

        let activeSystem = "all";

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

        function applyFilters() {
            const query = normalize(searchInput.value);
            let shown = 0;

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

                const countLabel = section.querySelector(".ccg-downloads-letter__heading span");
                if (countLabel) {
                    countLabel.textContent = `${visibleSectionCards.length} ${visibleSectionCards.length === 1 ? "game" : "games"}`;
                }
            });

            visibleCount.textContent = String(shown);
            if (emptyState) emptyState.hidden = shown !== 0;
            archive.hidden = shown === 0;
            updateLetterLinks();
        }

        searchInput.addEventListener("input", applyFilters);

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

                applyFilters();
            });
        });

        letterLinks.forEach((link) => {
            link.addEventListener("click", function (event) {
                if (link.classList.contains("is-unavailable")) {
                    event.preventDefault();
                    return;
                }

                const targetId = link.getAttribute("href");
                const target = targetId ? document.querySelector(targetId) : null;
                if (!target || target.hidden) return;

                event.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
                window.history.replaceState(null, "", targetId);
            });
        });

        applyFilters();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initDownloadsArchive, { once: true });
    } else {
        initDownloadsArchive();
    }
})();
