/* ==========================================================
   CCG GLOBAL SCRIPT — CORE UI (NAV + WOW)
   ----------------------------------------------------------
   • Depth-aware logo path fix
   • Priority navigation with responsive drawer + dropdown
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

    function normalisePath(path) {
        const url = new URL(path, window.location.href);
        let pathname = url.pathname.replace("/ccgamer_website_new", "");
        if (pathname.endsWith("/")) pathname += "index.html";
        return pathname;
    }

    function markActiveLinks(header) {
        const current = normalisePath(window.location.href);
        header.querySelectorAll(".ccg-nav__link").forEach(link => {
            const target = normalisePath(link.getAttribute("href") || "");
            if (current.endsWith(target) || current === target) {
                link.classList.add("ccg-nav__link--active");
            }
        });
    }

    /* ======================================================
       NAV TOGGLE (MOBILE)
    ====================================================== */
    function setupNavToggle() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header) return;

        const toggle = header.querySelector("[data-ccg-nav-toggle]");
        const nav = header.querySelector(".ccg-nav");
        const drawer = header.querySelector("[data-ccg-nav-drawer]");
        const drawerPrimary = drawer?.querySelector("[data-ccg-drawer-primary]");
        const drawerSecondary = drawer?.querySelector("[data-ccg-drawer-secondary]");
        const primaryList = nav?.querySelector("[data-ccg-nav-primary]");
        const secondaryList = nav?.querySelector("[data-ccg-nav-secondary]");
        const moreToggle = header.querySelector("[data-ccg-more-toggle]");
        const moreMenu = header.querySelector("[data-ccg-more-menu]");
        const mobileMatch = window.matchMedia("(max-width: 960px)");

        if (!toggle || !nav) return;

        markActiveLinks(header);

        if (primaryList && drawerPrimary) {
            drawerPrimary.appendChild(primaryList.cloneNode(true));
        }

        if (secondaryList && drawerSecondary) {
            drawerSecondary.appendChild(secondaryList.cloneNode(true));
        }

        if (secondaryList && moreMenu) {
            moreMenu.appendChild(secondaryList.cloneNode(true));
        }

        const closeMore = () => {
            if (!moreMenu || !moreToggle) return;
            moreMenu.hidden = true;
            moreToggle.setAttribute("aria-expanded", "false");
        };

        const toggleMore = () => {
            if (!moreMenu || !moreToggle) return;
            const open = moreMenu.hidden;
            moreMenu.hidden = !open;
            moreToggle.setAttribute("aria-expanded", open ? "true" : "false");
        };

        moreToggle?.addEventListener("click", event => {
            event.stopPropagation();
            toggleMore();
        });

        const drawerPanel = drawer?.querySelector(".ccg-nav-drawer__panel");
        const setDrawerState = open => {
            closeMore();
            header.classList.toggle("ccg-header--nav-open", open);
            drawer?.setAttribute("aria-hidden", open ? "false" : "true");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            document.body.classList.toggle("ccg-body--locked", open);
        };

        const closeDrawer = () => setDrawerState(false);
        const openDrawer = () => setDrawerState(true);

        toggle.addEventListener("click", () => {
            const isOpen = !header.classList.contains("ccg-header--nav-open");
            isOpen ? openDrawer() : closeDrawer();
        });

        drawer?.querySelectorAll("[data-ccg-drawer-close]").forEach(btn => {
            btn.addEventListener("click", closeDrawer);
        });

        drawer?.addEventListener("click", event => {
            if (event.target === drawer || event.target.classList.contains("ccg-nav-drawer__backdrop")) {
                closeDrawer();
            }
        });

        header.querySelectorAll(".ccg-nav__link").forEach(link => {
            link.addEventListener("click", () => {
                closeDrawer();
                closeMore();
            });
        });

        document.addEventListener("click", event => {
            if (moreMenu && !moreMenu.hidden) {
                if (!event.target.closest("[data-ccg-more-toggle]") && !event.target.closest("[data-ccg-more-menu]")) {
                    closeMore();
                }
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeDrawer();
                closeMore();
            }
        });

        const maybeCloseOnDesktop = () => {
            if (!mobileMatch.matches) {
                closeDrawer();
                closeMore();
            }
        };

        mobileMatch.addEventListener("change", maybeCloseOnDesktop);

        drawerPanel?.addEventListener("click", event => event.stopPropagation());
    }

    /* ======================================================
       LIGHTWEIGHT PARTICLE OVERLAY (GUARDED)
    ====================================================== */
    function shouldRenderParticles() {
        const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        if (reducedMotionQuery?.matches) return false;

        const isLowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 2;
        const isLowCore = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 2;

        return !(isLowMemory || isLowCore);
    }

    function setupParticleField() {
        if (!shouldRenderParticles()) return;

        const bg = document.querySelector(".ccg-bg");
        if (!bg || bg.querySelector(".ccg-bg-particles")) return;

        const particleField = document.createElement("div");
        particleField.className = "ccg-bg-particles";
        particleField.setAttribute("aria-hidden", "true");

        const particleCount = Math.min(48, Math.max(20, Math.round(window.innerWidth / 28)));

        for (let i = 0; i < particleCount; i++) {
            const spark = document.createElement("span");
            spark.className = "ccg-bg-particles__spark";

            spark.style.setProperty("--ccg-particle-x", `${Math.random() * 100}%`);
            spark.style.setProperty("--ccg-particle-delay", `${Math.random() * 12}s`);
            spark.style.setProperty("--ccg-particle-duration", `${12 + Math.random() * 10}s`);
            spark.style.setProperty("--ccg-particle-size", `${1 + Math.random() * 2.5}px`);

            particleField.appendChild(spark);
        }

        bg.appendChild(particleField);

        const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        reducedMotionQuery?.addEventListener?.("change", event => {
            if (event.matches) {
                particleField.remove();
            } else {
                setupParticleField();
            }
        });
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

        setupParticleField();

    });

})();
