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

        const primaryLabels = ["home", "browse games", "browse by genre", "collections"];

        const baseList = nav.querySelector(".ccg-nav__list");
        const items = baseList ? Array.from(baseList.querySelectorAll("li")) : [];
        if (!items.length) return;

        /* --------------------------------------------
           Build a modern shell with primary/secondary
        -------------------------------------------- */
        const bar = document.createElement("div");
        bar.className = "ccg-nav__bar";

        const primaryList = document.createElement("ul");
        primaryList.className = "ccg-nav__list ccg-nav__list--primary";

        const secondaryList = document.createElement("ul");
        secondaryList.className = "ccg-nav__list ccg-nav__list--secondary";

        const mobileList = document.createElement("ul");
        mobileList.className = "ccg-nav__list ccg-nav__list--mobile";

        const moreWrap = document.createElement("div");
        moreWrap.className = "ccg-nav__more";

        const moreButton = document.createElement("button");
        moreButton.type = "button";
        moreButton.className = "ccg-nav__more-toggle";
        moreButton.setAttribute("aria-haspopup", "true");
        moreButton.setAttribute("aria-expanded", "false");
        moreButton.innerHTML = "More <span aria-hidden=\"true\">▼</span>";

        const moreMenu = document.createElement("div");
        moreMenu.className = "ccg-nav__more-menu";
        moreMenu.setAttribute("role", "menu");

        items.forEach(li => {
            const link = li.querySelector("a");
            if (!link) return;

            const liClone = li.cloneNode(true);
            const liSecondary = li.cloneNode(true);
            const mobileClone = li.cloneNode(true);

            const label = link.textContent.trim().toLowerCase();
            if (primaryLabels.includes(label)) {
                primaryList.appendChild(liClone);
            } else {
                secondaryList.appendChild(liSecondary);
                const overflowLink = link.cloneNode(true);
                overflowLink.classList.add("ccg-nav__link--overflow");
                overflowLink.setAttribute("role", "menuitem");
                moreMenu.appendChild(overflowLink);
            }

            mobileList.appendChild(mobileClone);
        });

        if (!moreMenu.childElementCount) {
            moreWrap.hidden = true;
        }

        moreWrap.append(moreButton, moreMenu);

        bar.append(primaryList, secondaryList, moreWrap);

        const mobilePanel = document.createElement("div");
        mobilePanel.className = "ccg-nav__mobile";
        mobilePanel.appendChild(mobileList);
        mobilePanel.inert = true;

        nav.innerHTML = "";
        nav.append(bar, mobilePanel);

        const mobileMatch = window.matchMedia("(max-width: 960px)");

        const closeNav = () => {
            header.classList.remove("ccg-header--nav-open");
            toggle.setAttribute("aria-expanded", "false");
            mobilePanel.inert = true;
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
            header.classList.toggle("ccg-header--nav-open", isOpen);
            toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");

            const headerRect = header.getBoundingClientRect();
            nav.style.setProperty("--ccg-header-height", `${headerRect.height}px`);
            mobilePanel.inert = !isOpen;
        });

        header.querySelectorAll(".ccg-nav__link").forEach(link => {
            link.addEventListener("click", () => {
                if (mobileMatch.matches) closeNav();
                closeMore();
            });
        });

        document.addEventListener("click", event => {
            if (!mobileMatch.matches && !header.contains(event.target)) {
                closeMore();
            }

            if (!mobileMatch.matches) return;
            if (!header.contains(event.target)) {
                closeNav();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeNav();
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

        /* --------------------------------------------
           MORE DROPDOWN
        -------------------------------------------- */
        function closeMore() {
            nav.classList.remove("ccg-nav--more-open");
            moreButton.setAttribute("aria-expanded", "false");
        }

        if (!moreWrap.hidden) {
            moreButton.addEventListener("click", () => {
                const isOpen = nav.classList.toggle("ccg-nav--more-open");
                moreButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
            });
        }
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
