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
       NAV TOGGLE (MOBILE)
    ====================================================== */
    function setupNavToggle() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header) return;

        const toggle = header.querySelector("[data-ccg-nav-toggle]");
        const nav = header.querySelector(".ccg-nav");
        if (!toggle || !nav) return;

        const mobileMatch = window.matchMedia("(max-width: 960px)");

        const closeNav = () => {
            header.classList.remove("ccg-header--nav-open");
            toggle.setAttribute("aria-expanded", "false");
        };

        const maybeCloseOnDesktop = () => {
            if (!mobileMatch.matches) {
                closeNav();
            }
        };

        toggle.addEventListener("click", () => {
            const isOpen = !header.classList.contains("ccg-header--nav-open");
            header.classList.toggle("ccg-header--nav-open", isOpen);
            toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });

        header.querySelectorAll(".ccg-nav__link").forEach(link => {
            link.addEventListener("click", () => {
                if (mobileMatch.matches) closeNav();
            });
        });

        document.addEventListener("click", event => {
            if (!mobileMatch.matches) return;
            if (!header.contains(event.target)) {
                closeNav();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeNav();
            }
        });

        mobileMatch.addEventListener("change", maybeCloseOnDesktop);
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

        setupNavToggle();

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
        const glintTargets = document.querySelectorAll(".ccg-brand__logo, .ccg-nav__link");

        glintTargets.forEach(target => {
            target.addEventListener("pointerenter", () => target.classList.add("is-glinting"));
            target.addEventListener("pointerleave", () => target.classList.remove("is-glinting"));
        });

    });

})();
