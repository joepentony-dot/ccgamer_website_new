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

        const closeAll = () => {
            moreBlocks.forEach(group => {
                const btn = group.querySelector(".ccg-nav__more-btn");
                const menu = group.querySelector(".ccg-nav__dropdown");
                if (!btn || !menu) return;
                menu.classList.remove("is-open");
                btn.setAttribute("aria-expanded", "false");
            });
        };

        moreBlocks.forEach(block => {
            const btn = block.querySelector(".ccg-nav__more-btn");
            const menu = block.querySelector(".ccg-nav__dropdown");

            if (!btn || !menu) return;

            function open() {
                closeAll();
                menu.classList.add("is-open");
                btn.setAttribute("aria-expanded", "true");
            }

            function close() {
                menu.classList.remove("is-open");
                btn.setAttribute("aria-expanded", "false");
            }

            btn.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                menu.classList.contains("is-open") ? close() : open();
            });

            // Prevent menu clicks closing immediately
            menu.addEventListener("click", e => e.stopPropagation());

            // Close on outside click
            document.addEventListener("click", closeAll);

            // Close on ESC
            document.addEventListener("keydown", e => {
                if (e.key === "Escape") closeAll();
            });
        });

        /* ==================================================
           VIEWPORT WOW — LIGHT UP EVERYTHING
        ================================================== */
        const wowSelectors = [
            ".ccg-hero",
            ".home-highlight-card",
            ".home-genre-card",
            ".games-accordion__section",
            ".ccg-game-card",
            ".ccg-panel",
            ".emulation-cta",
            ".quiz-card",
            "footer",
            ".ccg-brand",
        ];

        const wowTargets = document.querySelectorAll(wowSelectors.join(","));

        if (wowTargets.length) {
            const wowObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-lit");
                    } else {
                        entry.target.classList.remove("is-lit");
                    }
                });
            }, { threshold: 0.25 });

            wowTargets.forEach(el => {
                el.setAttribute("data-ccg-wow", "");
                wowObserver.observe(el);
            });
        }

        /* ==================================================
           MICRO-GLINTS — MODED NAV & LOGO
        ================================================== */
        const glintTargets = document.querySelectorAll(".ccg-brand__logo, .ccg-nav__link, .ccg-nav__dropdown-link");

        glintTargets.forEach(target => {
            target.addEventListener("pointerenter", () => target.classList.add("is-glinting"));
            target.addEventListener("pointerleave", () => target.classList.remove("is-glinting"));
        });

    });

})();
