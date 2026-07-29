(function () {
    "use strict";

    function initArchiveFilters() {
        var cards = Array.prototype.slice.call(document.querySelectorAll("[data-archive-game]"));
        if (!cards.length) return;

        var search = document.querySelector("[data-archive-search]");
        var yearSelect = document.querySelector("[data-archive-year]");
        var systemButtons = Array.prototype.slice.call(document.querySelectorAll("[data-archive-system]"));
        var count = document.querySelector("[data-archive-visible-count]");
        var empty = document.querySelector("[data-archive-empty]");
        var activeSystem = "all";

        function applyFilters() {
            var query = search ? search.value.trim().toLowerCase() : "";
            var activeYear = yearSelect ? yearSelect.value : "all";
            var visible = 0;

            cards.forEach(function (card) {
                var matchesSearch = !query || (card.getAttribute("data-game-title") || "").indexOf(query) !== -1;
                var matchesSystem = activeSystem === "all" || card.getAttribute("data-game-system") === activeSystem;
                var matchesYear = activeYear === "all" || card.getAttribute("data-game-year") === activeYear;
                var show = matchesSearch && matchesSystem && matchesYear;
                card.hidden = !show;
                if (show) visible += 1;
            });

            if (count) count.textContent = String(visible);
            if (empty) empty.hidden = visible !== 0;
        }

        if (search) search.addEventListener("input", applyFilters);
        if (yearSelect) yearSelect.addEventListener("change", applyFilters);

        systemButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                activeSystem = button.getAttribute("data-archive-system") || "all";
                systemButtons.forEach(function (candidate) {
                    var selected = candidate === button;
                    candidate.classList.toggle("is-active", selected);
                    candidate.setAttribute("aria-pressed", selected ? "true" : "false");
                });
                applyFilters();
            });
        });

        applyFilters();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initArchiveFilters);
    } else {
        initArchiveFilters();
    }
}());
