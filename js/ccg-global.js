/* ==========================================================
   CCG GLOBAL SCRIPT — CORE UI (NAV + WOW)
   ----------------------------------------------------------
   • Depth-aware logo path fix
   • Header nav flatten (no "More" dropdown)
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
           HEADER NAV FLATTEN — TWO-LAYER PILL ROW
        ================================================== */
        const navList = document.querySelector(".ccg-nav__list");
        const moreBlocks = document.querySelectorAll(".ccg-nav__more");

        moreBlocks.forEach(block => {
            const menuLinks = block.querySelectorAll(".ccg-nav__dropdown-link");
            if (!menuLinks.length || !navList) return;

            menuLinks.forEach(link => {
                const li = document.createElement("li");
                const clone = link.cloneNode(true);
                clone.classList.remove("ccg-nav__dropdown-link");
                clone.classList.add("ccg-nav__link");
                li.appendChild(clone);
                navList.appendChild(li);
            });

            block.remove();
        });

        if (navList) {
            navList.classList.add("ccg-nav__list--expanded");
        }

        /* ==================================================
           VIEWPORT WOW — LIGHT UP EVERYTHING
        ================================================== */
        const wowSelectors = [
            ".ccg-hero",
            ".home-highlight-card",
            ".home-genre-card",
            ".home-featured-card",
            ".home-curated-card",
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
