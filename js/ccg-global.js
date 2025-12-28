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
    const MQ_MOBILE = typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 820px)")
        : null;
    const MQ_MOBILE_VIEWPORT = typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 768px)")
        : null;
    const MQ_COARSE = typeof window.matchMedia === "function"
        ? window.matchMedia("(pointer: coarse)")
        : null;
    const MQ_REDUCED = typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    function isMobileViewport() {
        if (MQ_MOBILE_VIEWPORT) return MQ_MOBILE_VIEWPORT.matches;
        return window.innerWidth <= 768;
    }

    window.isMobileViewport = isMobileViewport;

    function isMobileLike() {
        return Boolean(isMobileViewport() || (MQ_MOBILE && MQ_MOBILE.matches) || (MQ_COARSE && MQ_COARSE.matches));
    }

    function safeNowMobileClass() {
        const mobile = isMobileLike();
        document.documentElement.classList.toggle("ccg-is-mobile", mobile);
        if (document.body && document.body.classList) {
            document.body.classList.toggle("ccg-is-mobile", mobile);
        }
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
        resetBodyLockIfStuck();
    }

    function resetBodyLockIfStuck() {
        const header = document.querySelector("[data-ccg-header]");
        const navOpen = header?.classList.contains("ccg-header--nav-open");
        if (!navOpen) {
            document.body?.classList.remove("ccg-body--nav-open", "ccg-body--locked");
        }
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
        const drawerCloseEls = drawer?.querySelectorAll("[data-ccg-drawer-close]") || [];
        const mobileMatch = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 960px)") : null;

        const primaryList = nav?.querySelector("[data-ccg-nav-primary]");
        const secondaryList = nav?.querySelector("[data-ccg-nav-secondary]");
        const moreWrap = nav?.querySelector(".ccg-nav__more");
        const moreToggle = moreWrap?.querySelector("[data-ccg-more-toggle]");
        const moreMenu = nav?.querySelector("[data-ccg-more-menu]");

        if (!toggle || !nav || !primaryList || !moreWrap || !moreMenu) return;

        const isMobileViewport = () => mobileMatch ? mobileMatch.matches : window.innerWidth <= 960;

        const cloneLink = (link, extraClasses = []) => {
            const clone = link.cloneNode(true);
            extraClasses.forEach(cls => clone.classList.add(cls));
            return clone;
        };

        const buildMoreMenu = () => {
            moreMenu.innerHTML = "";
            secondaryList?.querySelectorAll("a").forEach(link => {
                const clone = cloneLink(link, ["ccg-nav__link--overflow"]);
                clone.setAttribute("role", "menuitem");
                moreMenu.appendChild(clone);
            });
        };

        const buildDrawer = () => {
            if (!drawer) return;

            if (drawerPrimary) {
                drawerPrimary.innerHTML = "<div class=\"ccg-nav-drawer__label\">Primary</div>";
                primaryList?.querySelectorAll("a").forEach(link => {
                    drawerPrimary.appendChild(cloneLink(link, ["ccg-nav__link--mobile"]));
                });
            }

            if (drawerSecondary) {
                drawerSecondary.innerHTML = "<div class=\"ccg-nav-drawer__label\">Explore more</div>";
                secondaryList?.querySelectorAll("a").forEach(link => {
                    drawerSecondary.appendChild(cloneLink(link, ["ccg-nav__link--mobile"]));
                });
            }
        };

        buildMoreMenu();

        let isMoreOpen = false;
        let isNavOpen = false;

        const openMore = () => {
            if (isMoreOpen || !moreMenu) return;
            isMoreOpen = true;
            nav.classList.add("ccg-nav--more-open");
            moreWrap.dataset.open = "true";
            moreToggle?.setAttribute("aria-expanded", "true");
            moreMenu.hidden = false;
            moreMenu.dataset.state = "open";
        };

        const closeMore = () => {
            if (!isMoreOpen || !moreMenu) return;
            isMoreOpen = false;
            nav.classList.remove("ccg-nav--more-open");
            delete moreWrap.dataset.open;
            moreToggle?.setAttribute("aria-expanded", "false");
            moreMenu.hidden = true;
            moreMenu.dataset.state = "closed";
        };

        const syncBodyLock = (locked) => {
            document.body?.classList.toggle("ccg-body--nav-open", locked);
            document.body?.classList.toggle("ccg-body--locked", locked);
        };

        const closeNav = () => {
            isNavOpen = false;
            header.classList.remove("ccg-header--nav-open");
            nav.classList.remove("ccg-nav--open");
            drawer?.setAttribute("aria-hidden", "true");
            toggle.setAttribute("aria-expanded", "false");
            syncBodyLock(false);
        };

        const openNav = () => {
            isNavOpen = true;
            buildDrawer();
            header.classList.add("ccg-header--nav-open");
            nav.classList.add("ccg-nav--open");
            drawer?.setAttribute("aria-hidden", "false");
            toggle.setAttribute("aria-expanded", "true");
            syncBodyLock(true);
            setHeaderHeightVar();
        };

        const syncMobileNavState = () => {
            if (!isMobileViewport()) {
                closeNav();
                closeMore();
                return;
            }

            buildDrawer();

            const hasDrawerLinks = drawerPrimary?.querySelector(".ccg-nav__link") || drawerSecondary?.querySelector(".ccg-nav__link");
            nav.classList.toggle("ccg-nav--mobile-fallback", !hasDrawerLinks);
        };

        toggle.addEventListener("click", () => {
            if (isNavOpen) {
                closeNav();
            } else {
                openNav();
            }
        });

        moreToggle?.addEventListener("click", event => {
            event.stopPropagation();
            if (isMoreOpen) {
                closeMore();
            } else {
                openMore();
            }
        });

        drawerCloseEls.forEach(btn => btn.addEventListener("click", closeNav));

        header.addEventListener("click", event => {
            const link = event.target.closest(".ccg-nav__link");
            if (!link) return;
            if (isMobileViewport()) closeNav();
            closeMore();
        });

        document.addEventListener("click", event => {
            if (moreWrap && !moreWrap.contains(event.target)) {
                closeMore();
            }

            if (!isMobileViewport()) return;

            if (isNavOpen && drawer && !drawer.contains(event.target) && !toggle.contains(event.target)) {
                closeNav();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeNav();
                closeMore();
            }
        });

        if (mobileMatch?.addEventListener) {
            mobileMatch.addEventListener("change", () => {
                closeNav();
                closeMore();
                syncMobileHardening();
                syncMobileNavState();
            });
        } else if (mobileMatch?.addListener) {
            mobileMatch.addListener(() => {
                closeNav();
                closeMore();
                syncMobileHardening();
                syncMobileNavState();
            });
        }

        window.addEventListener("resize", () => {
            setHeaderHeightVar();
            syncMobileHardening();
            syncMobileNavState();
        });

        window.addEventListener("orientationchange", () => {
            setHeaderHeightVar();
            syncMobileHardening();
            syncMobileNavState();
        });

        syncMobileNavState();
        setHeaderHeightVar();
        markActiveLinks(header);
        nav.classList.add("ccg-nav--hydrated");
        closeMore();
    }

    /* ======================================================
       LIGHTWEIGHT PARTICLE OVERLAY (GUARDED)
    ====================================================== */
    function shouldRenderParticles() {
        const reducedMotionQuery = MQ_REDUCED || (typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null);
        if (reducedMotionQuery && reducedMotionQuery.matches) return false;

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

        const reducedMotionQuery = MQ_REDUCED || (typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null);
        if (reducedMotionQuery && typeof reducedMotionQuery.addEventListener === "function") {
            reducedMotionQuery.addEventListener("change", event => {
                if (event.matches) {
                    particleField.remove();
                } else {
                    setupParticleField();
                }
            });
        }
    }

    /* ======================================================
       GLOBAL VISITOR COUNTER (COUNTAPI)
    ====================================================== */
    function setupVisitCounter() {
        const counterEls = document.querySelectorAll("[data-ccg-visit-counter]");
        if (!counterEls.length) return;

        const BASE_COUNT = 3028;
        const endpoint = "https://api.countapi.xyz/hit/ccgamer-website/home";

        const renderCount = (value) => {
            const safeValue = Number.isFinite(value) ? value : BASE_COUNT;
            const formatted = safeValue.toLocaleString();
            counterEls.forEach(el => {
                el.textContent = formatted;
            });
        };

        fetch(endpoint)
            .then(response => response.json())
            .then(data => renderCount(data?.value))
            .catch(() => renderCount(BASE_COUNT));
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
        setupVisitCounter();

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
