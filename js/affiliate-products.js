(function () {
    "use strict";

    /*
     * Amazon Associates retirement guard.
     *
     * The legacy hardware panel remains in older generated game HTML, but it
     * must never be displayed or populated while the retailer programme is not
     * active. Keeping this tiny guard in place avoids touching thousands of
     * generated game pages and makes old cached/generated markup fail closed.
     */

    function disableLegacyProductPanel() {
        const section = document.getElementById("affiliate-products-section");
        if (!section) return;

        section.hidden = true;
        section.setAttribute("aria-hidden", "true");
        section.classList.remove("is-hardware-open");

        const panel = section.querySelector("[data-hardware-panel]");
        if (panel) {
            panel.hidden = true;
        }

        const toggle = section.querySelector("[data-hardware-toggle]");
        if (toggle) {
            toggle.disabled = true;
            toggle.setAttribute("aria-expanded", "false");
        }

        const grid = section.querySelector("#affiliate-products-grid");
        if (grid) {
            grid.textContent = "";
        }

        section.querySelectorAll("a[href]").forEach((link) => {
            link.removeAttribute("href");
            link.removeAttribute("target");
            link.removeAttribute("rel");
            link.removeAttribute("data-ccg-affiliate-link");
            link.removeAttribute("data-ccg-revenue-link");
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", disableLegacyProductPanel, { once: true });
    } else {
        disableLegacyProductPanel();
    }

    window.addEventListener("ccg:game-loaded", disableLegacyProductPanel);
})();
