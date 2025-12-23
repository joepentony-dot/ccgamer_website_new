/* ==========================================================
   CCG GLOBAL SCRIPT — CORE UI (NAV + WOW)
   ----------------------------------------------------------
   • Depth-aware logo path fix
   • Priority navigation with responsive drawer + dropdown
   • No dependencies on page-specific JS

   MOBILE HARDENING (NO PADDING HACKS)
   • Clamp horizontal overflow (prevents right-side spill)
   • Header containment on mobile (reduces visual bleed)
   • Disable heavy effects on mobile (particles/glints/wow)
========================================================== */

(function () {
    "use strict";

    /* ======================================================
       ENV / MOBILE DETECTION
    ====================================================== */
    const MQ_MOBILE = window.matchMedia?.("(max-width: 820px)");
    const MQ_COARSE = window.matchMedia?.("(pointer: coarse)");
    const MQ_REDUCED = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    function isMobileLike() {
        return Boolean(MQ_MOBILE?.matches || MQ_COARSE?.matches);
    }

    function safeNowMobileClass() {
        document.documentElement.classList.toggle("ccg-is-mobile", isMobileLike());
        document.body?.classList?.toggle("ccg-is-mobile", isMobileLike());
    }

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

        const setActiveState = (link, isActive) => {
            link.classList.toggle("ccg-nav__link--active", isActive);
            if (isActive) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        };

        header.querySelectorAll(".ccg-nav__link").forEach(link => {
            const target = normalisePath(link.getAttribute("href") || "");
            const isActive = current.endsWith(target) || current === target;

            setActiveState(link, isActive);

            if (isActive) {
                const href = link.getAttribute("href");
                if (!href) return;

                header.querySelectorAll(`.ccg-nav__link[href='${href}']`).forEach(matchedLink => {
                    setActiveState(matchedLink, true);
                });
            }
        });
    }

    /* ======================================================
       MOBILE HARDENING — NO PADDING HACKS
    ====================================================== */
    function clampHorizontalOverflow() {
        // Hard clamp overflow without altering layout alignment
        const de = document.documentElement;
        const body = document.body;

        if (!de || !body) return;

        de.style.overflowX = "hidden";
        de.style.maxWidth = "100%";
        body.style.overflowX = "hidden";
        body.style.maxWidth = "100%";

        // Prevent accidental transform-induced side scrolling on mobile
        body.style.position = body.style.position || "relative";
    }

    function containHeaderOnMobile() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header) return;

        // Visual containment only
        if (isMobileLike()) {
            header.style.isolation = "isolate";
            header.style.overflow = "hidden";
        } else {
            header.style.isolation = "";
            header.style.overflow = "";
        }
    }

    function setHeaderHeightVar() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header) return;

        const rect = header.getBoundingClientRect();
        const h = Math.max(0, Math.round(rect.height));
        document.documentElement.style.setProperty("--ccg-header-height", `${h}px`);
    }

    function syncMobileHardening() {
        safeNowMobileClass();
        clampHorizontalOverflow();
        containHeaderOnMobile();
        setHeaderHeightVar();
    }

    /* ======================================================
       NAV TOGGLE (MOBILE)
    ====================================================== */
    function setupNavToggle() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header) return;

        const toggle = header.querySelector("[data-ccg-nav-toggle]");
        const nav = header.querySelector(".ccg-nav");
        const mobileMatch = window.matchMedia("(max-width: 960px)");

        if (!toggle || !nav) return;

        const primaryLabels = ["home", "browse games", "browse by genre", "collections"];
        const collectedItems = Array.from(nav.querySelectorAll(".ccg-nav__list li"));
        if (!collectedItems.length) return;

        /* --------------------------------------------
           Build a consistent shell from all nav items
        -------------------------------------------- */
        const bar = document.createElement("div");
        bar.className = "ccg-nav__bar";

        const primaryList = document.createElement("ul");
        primaryList.className = "ccg-nav__list ccg-nav__list--primary";
        primaryList.dataset.ccgNavPrimary = "";

        const secondaryList = document.createElement("ul");
        secondaryList.className = "ccg-nav__list ccg-nav__list--secondary";
        secondaryList.dataset.ccgNavSecondary = "";

        const mobileList = document.createElement("ul");
        mobileList.className = "ccg-nav__list ccg-nav__list--mobile";

        const moreWrap = document.createElement("div");
        moreWrap.className = "ccg-nav__more";

        const moreButton = document.createElement("button");
        moreButton.type = "button";
        moreButton.className = "ccg-nav__more-toggle";
        moreButton.setAttribute("aria-haspopup", "true");
        moreButton.setAttribute("aria-expanded", "false");
        moreButton.setAttribute("data-ccg-more-toggle", "");
        moreButton.innerHTML = "More <span aria-hidden=\"true\">▼</span>";

        const moreMenu = document.createElement("div");
        moreMenu.className = "ccg-nav__more-menu";
        moreMenu.setAttribute("role", "menu");
        moreMenu.setAttribute("data-ccg-more-menu", "");

        collectedItems.forEach(li => {
            const link = li.querySelector("a");
            if (!link) return;

            const normalisedLabel = link.textContent.trim().toLowerCase();
            const primaryClone = li.cloneNode(true);
            const secondaryClone = li.cloneNode(true);
            const mobileClone = li.cloneNode(true);

            if (primaryLabels.includes(normalisedLabel)) {
                primaryList.appendChild(primaryClone);
            } else {
                secondaryList.appendChild(secondaryClone);
                const overflowLink = link.cloneNode(true);
                overflowLink.classList.add("ccg-nav__link--overflow");
                overflowLink.setAttribute("role", "menuitem");
                moreMenu.appendChild(overflowLink);
            }

            mobileList.appendChild(mobileClone);
        });

        if (!moreMenu.childElementCount) {
            moreWrap.hidden = true;
        } else {
            moreMenu.hidden = true;
        }

        moreWrap.append(moreButton, moreMenu);
        bar.append(primaryList, secondaryList, moreWrap);

        const mobilePanel = document.createElement("div");
        mobilePanel.className = "ccg-nav__mobile";
        mobilePanel.appendChild(mobileList);
        mobilePanel.inert = true;

        nav.innerHTML = "";
        nav.append(bar, mobilePanel);

        let isMoreOpen = false;

        const openMore = () => {
            if (isMoreOpen) return;
            isMoreOpen = true;
            nav.classList.add("ccg-nav--more-open");
            moreWrap.dataset.open = "true";
            moreButton.setAttribute("aria-expanded", "true");
            moreMenu.hidden = false;
            moreMenu.removeAttribute("hidden");
        };

        const closeMore = () => {
            if (!isMoreOpen) return;
            isMoreOpen = false;
            nav.classList.remove("ccg-nav--more-open");
            delete moreWrap.dataset.open;
            moreButton.setAttribute("aria-expanded", "false");
            moreMenu.hidden = true;
            moreMenu.style.display = "";
            delete moreMenu.dataset.state;
        };

        const closeNav = () => {
            header.classList.remove("ccg-header--nav-open");
            toggle.setAttribute("aria-expanded", "false");
            mobilePanel.inert = true;
        };

        if (!moreWrap.hidden) {
            moreButton.addEventListener("click", event => {
                event.stopPropagation();
                const willOpen = !isMoreOpen;
                if (willOpen) openMore();
                else closeMore();
            });
        }

        toggle.addEventListener("click", () => {
            const isOpen = !header.classList.contains("ccg-header--nav-open");
            header.classList.toggle("ccg-header--nav-open", isOpen);
            toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");

            setHeaderHeightVar();
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

        mobileMatch.addEventListener("change", () => {
            if (!mobileMatch.matches) {
                closeNav();
                closeMore();
            }
            // Re-sync containment when crossing breakpoints
            syncMobileHardening();
        });

        window.addEventListener("resize", () => {
            setHeaderHeightVar();
            syncMobileHardening();
        });

        window.addEventListener("orientationchange", () => {
            setHeaderHeightVar();
            syncMobileHardening();
        });

        setHeaderHeightVar();
        markActiveLinks(header);
    }

    /* ======================================================
       LIGHTWEIGHT PARTICLE OVERLAY (GUARDED)
    ====================================================== */
    function shouldRenderParticles() {
        const reducedMotionQuery = MQ_REDUCED || window.matchMedia?.("(prefers-reduced-motion: reduce)");
        if (reducedMotionQuery?.matches) return false;

        // Mobile/coarse pointer: skip entirely to keep things smooth
        if (isMobileLike()) return false;

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

        const reducedMotionQuery = MQ_REDUCED || window.matchMedia?.("(prefers-reduced-motion: reduce)");
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
           SKIP LINK FOR KEYBOARD USERS
        ------------------------------- */
        const main = document.querySelector("main");
        if (main) {
            if (!main.id) main.id = "ccg-main-content";
            main.setAttribute("tabindex", "-1");

            const skipLink = document.createElement("a");
            skipLink.className = "ccg-skip-link";
            skipLink.href = `#${main.id}`;
            skipLink.textContent = "Skip to main content";
            document.body.prepend(skipLink);
        }

        /* -------------------------------
           MOBILE HARDENING (EARLY)
        ------------------------------- */
        syncMobileHardening();

        /* -------------------------------
           NORMALISE LOGO PATH
        ------------------------------- */
        const logoPath = getLogoPath();
        document.querySelectorAll(".ccg-brand__logo").forEach(img => {
            img.src = logoPath;
            img.loading = img.loading || "lazy";
            img.alt ||= "Cheeky Commodore Gamer logo";
            img.decoding ||= "async";
        });

        /* -------------------------------
           LAZY RESOURCE ENHANCEMENTS
        ------------------------------- */
        document.querySelectorAll("img:not([loading])").forEach(img => {
            const isAboveTheFold = img.closest("header") || img.closest(".ccg-hero") || img.closest(".home-hero") || img.closest(".ccg-info-hero");
            img.loading = isAboveTheFold ? "eager" : "lazy";
            img.decoding ||= "async";
        });

        document.querySelectorAll("iframe").forEach(frame => {
            frame.loading = frame.loading || "lazy";
            frame.referrerPolicy ||= "strict-origin-when-cross-origin";
        });

        const introVideo = document.querySelector(".intro-video");
        if (introVideo) {
            introVideo.preload = "metadata";
        }

        setupNavToggle();

        /* ==================================================
           VIEWPORT WOW — LIGHT UP EVERYTHING
           (MOBILE: DISABLED to avoid extra animation churn)
        ================================================== */
        if (!isMobileLike()) {
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
        }

        /* ==================================================
           MICRO-GLINTS — MODED NAV & LOGO
           (MOBILE/COARSE: DISABLED)
        ================================================== */
        if (!isMobileLike()) {
            const glintTargets = document.querySelectorAll(".ccg-brand__logo, .ccg-nav__link");
            glintTargets.forEach(target => {
                target.addEventListener("pointerenter", () => target.classList.add("is-glinting"));
                target.addEventListener("pointerleave", () => target.classList.remove("is-glinting"));
            });
        }

        setupParticleField();

        /* -------------------------------
           Keep header height var accurate
        ------------------------------- */
        setHeaderHeightVar();
        window.addEventListener("load", setHeaderHeightVar, { passive: true });
    });

})();
