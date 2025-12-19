/* ==========================================================
   CCG GLOBAL SCRIPT — CORE UI + HEADER DROPDOWN (LOCKED)
   ----------------------------------------------------------
   • Depth-aware logo path fix
   • Header "More ▾" dropdown (CLICK-BASED)
   • Close on outside click / ESC
   • No dependencies on page-specific JS
========================================================== */

(function () {
    'use strict';

    /* ======================================================
       DEPTH-AWARE LOGO PATH
    ====================================================== */
    function getLogoPath() {
        let path = window.location.pathname || "";

        const repoMarker = "/ccgamer_website_new/";
        const repoIndex = path.indexOf(repoMarker);
        if (repoIndex !== -1) {
            path = path.substring(repoIndex + repoMarker.length);
        }

        if (path.startsWith("/")) path = path.slice(1);
        if (!path) return "resources/images/ccgamer-logo.png";

        const depth = path.split("/").length - 1;
        return "../".repeat(depth) + "resources/images/ccgamer-logo.png";
    }

    /* ======================================================
       DOM READY
    ====================================================== */
    document.addEventListener("DOMContentLoaded", () => {

        /* -------------------------------
           NORMALISE LOGO PATH
        ------------------------------- */
        const logoPath = getLogoPath();
        document.querySelectorAll(".ccg-brand__logo").forEach(img => {
            img.src = logoPath;
            img.loading = img.loading || "lazy";
            img.alt ||= "Cheeky Commodore Gamer logo";
        });

        /* ==================================================
           HEADER “MORE ▾” DROPDOWN — CLICK TOGGLE
        ================================================== */
        const moreBlocks = document.querySelectorAll(".ccg-nav__more");

        moreBlocks.forEach(block => {
            const btn = block.querySelector(".ccg-nav__more-btn");
            const menu = block.querySelector(".ccg-nav__dropdown");

            if (!btn || !menu) return;

            function open() {
                menu.classList.add("is-open");
                btn.setAttribute("aria-expanded", "true");
            }

            function close() {
                menu.classList.remove("is-open");
                btn.setAttribute("aria-expanded", "false");
            }

            function toggle(e) {
                e.preventDefault();
                e.stopPropagation();
                menu.classList.contains("is-open") ? close() : open();
            }

            btn.addEventListener("click", toggle);

            // Prevent menu clicks closing immediately
            menu.addEventListener("click", e => e.stopPropagation());

            // Close on outside click
            document.addEventListener("click", close);

            // Close on ESC
            document.addEventListener("keydown", e => {
                if (e.key === "Escape") close();
            });
        });

    });

})();
