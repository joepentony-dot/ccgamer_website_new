/*
CCG Unified Public Shell Core
Global Source of Truth
Master Layout: home.html
Do Not Fork
Do Not Duplicate
Do Not Override
*/

(function () {
    "use strict";

    const HARDENED_CLASS = "ccg-nav-contract-hardened";
    const REQUIRED_STYLES = [
        { href: "/resources/css/ccg-nav-viewport-overlay.css", marker: "data-ccg-nav-viewport-overlay-style" },
        { href: "/resources/css/ccg-inner-page-density.css", marker: "data-ccg-inner-page-density-style" },
        { href: "/resources/css/ccg-scroll-authority.css", marker: "data-ccg-scroll-authority-style" },
        { href: "/resources/css/ccg-nav-fit.css", marker: "data-ccg-nav-fit-style" }
    ];

    const CRITICAL_MODULES = [
        { src: "/js/ccg-header-auth-loader.js", marker: "data-ccg-header-auth-loader" },
        { src: "/js/ccg-nav-fit.js", marker: "data-ccg-nav-fit-loader" },
        { src: "/js/ccg-mode-engine.js", marker: "data-ccg-mode-engine-loader" }
    ];

    const OPTIONAL_MODULES = [
        { src: "/js/ccg-legacy-url-consolidation.js", marker: "data-ccg-legacy-url-loader" },
        { src: "/js/ccg-global-search.js", marker: "data-ccg-global-search-loader" },
        { src: "/js/ccg-search-command-placement.js", marker: "data-ccg-search-command-placement-loader" },
        { src: "/js/ccg-search-ranking.js", marker: "data-ccg-search-ranking-loader" },
        { src: "/js/ccg-recently-viewed.js", marker: "data-ccg-recently-viewed-loader" },
        { src: "/js/ccg-smart-discovery.js", marker: "data-ccg-smart-discovery-loader" },
        { src: "/js/ccg-engagement-engine.js", marker: "data-ccg-engagement-engine-loader" },
        { src: "/js/ccg-archive-pulse-randomizer.js", marker: "data-ccg-archive-pulse-randomizer-loader" },
        { src: "/js/ccg-archive-pulse-thumbnails.js", marker: "data-ccg-archive-pulse-thumbnails-loader" },
        { src: "/js/ccg-archive-shortcuts.js", marker: "data-ccg-archive-shortcuts-loader" },
        { src: "/js/ccg-archive-schema.js", marker: "data-ccg-archive-schema-loader" },
        { src: "/js/ccg-pwa.js", marker: "data-ccg-pwa-loader" },
        { src: "/js/ccg-pwa-visible-install.js", marker: "data-ccg-pwa-visible-install-loader" },
        { src: "/js/ccg-release-check.js", marker: "data-ccg-release-check-loader" },
        { src: "/js/ccg-publisher-history.js", marker: "data-ccg-publisher-history-loader" },
        { src: "/js/ccg-ui-regression-fixes.js", marker: "data-ccg-ui-regression-fixes-loader" },
        { src: "/js/ccg-amiga-identity.js", marker: "data-ccg-amiga-identity-loader" },
        { src: "/js/ccg-mode-identity.js", marker: "data-ccg-mode-identity-loader" },
        { src: "/js/ccg-recent-content.js", marker: "data-ccg-recent-content-loader" },
        { src: "/js/ccg-member-library-interface.js", marker: "data-ccg-member-library-interface-loader" },
        { src: "/js/ccg-member-library-sync-loader.js", marker: "data-ccg-member-library-sync-loader" },
        { src: "/js/ccg-member-community-loader.js", marker: "data-ccg-member-community-loader" },
        { src: "/js/ccg-member-public-preview-loader.js", marker: "data-ccg-member-public-preview-loader" },
        { src: "/js/ccg-member-custom-collections-loader.js", marker: "data-ccg-member-custom-collections-loader" },
        { src: "/js/ccg-member-collection-insights-loader.js", marker: "data-ccg-member-collection-insights-loader" },
        { src: "/js/ccg-member-loyalty-loader.js", marker: "data-ccg-member-loyalty-loader" },
        { src: "/js/ccg-member-achievements-loader.js", marker: "data-ccg-member-achievements-loader" },
        { src: "/js/ccg-member-data-safety.js", marker: "data-ccg-member-data-safety-loader" },
        { src: "/js/zzap64-awards-logo-styles.js", marker: "data-ccg-zzap-logo-styles-loader" },
        { src: "/js/ccg-game-badges.js", marker: "data-ccg-game-badges-loader" },
        { src: "/js/ccg-responsive-safety.js", marker: "data-ccg-responsive-safety-loader" }
    ];

    const FINAL_PRIMARY = [
        ["Home", "/home.html"],
        ["Browse Games", "/games/"],
        ["Browse by Genre", "/games/genres/"],
        ["Publishers", "/games/publishers/"],
        ["Collections", "/games/collections/"],
        ["Music Hub", "/music/"]
    ];

    const FINAL_SECONDARY = [
        ["Find Me a Game", "/games/discover/"],
        ["Zzap!64 Reviews & Awards", "/zzap64/"],
        ["Quiz", "/quiz/quiz.html"],
        ["Emulation", "/emulation.html"],
        ["Install CCG App", "/install-app.html"],
        ["About Me", "/about.html"],
        ["Contact", "/contact.html"]
    ];

    const SOCIAL_LINKS = [
        ["YouTube", "https://www.youtube.com/@CheekyCommodoreGamer", "yt"],
        ["Patreon", "https://patreon.com/CheekyCommodoreGamer", "patreon"],
        ["PayPal", "https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL", "paypal"],
        ["X/Twitter", "https://twitter.com/CheekyC64Gamer", "x"],
        ["Facebook", "https://www.facebook.com/cheekycommodoregamer", "fb"],
        ["Discord", "https://discord.gg/83Xw9ktAn4", "discord"]
    ];

    let navAuthorityObserver = null;
    let shellAuthorityObserver = null;
    let navCoreInitialised = false;
    let shellRepairing = false;

    function canonicalPath(value) {
        try {
            return new URL(value, window.location.href).pathname.replace(/\/+$/, "") || "/";
        } catch (error) {
            return String(value || "").replace(/\/+$/, "") || "/";
        }
    }

    function listMatches(list, links) {
        if (!list) return false;
        const anchors = Array.from(list.children)
            .map((item) => item.querySelector(".ccg-nav__link"))
            .filter(Boolean);
        if (anchors.length !== links.length) return false;
        return anchors.every((link, index) => {
            const [label, href] = links[index];
            return link.textContent.trim() === label
                && canonicalPath(link.getAttribute("href")) === canonicalPath(href);
        });
    }

    function navigationStructureMatches() {
        const nav = document.querySelector("[data-ccg-header] .ccg-nav");
        if (!nav) return false;
        return listMatches(nav.querySelector("[data-ccg-nav-primary]"), FINAL_PRIMARY)
            && listMatches(nav.querySelector("[data-ccg-nav-secondary]"), FINAL_SECONDARY);
    }

    function buildList(list, links) {
        if (!list) return;
        const fragment = document.createDocumentFragment();
        links.forEach(([label, href]) => {
            const item = document.createElement("li");
            const link = document.createElement("a");
            link.href = href;
            link.className = "ccg-nav__link";
            link.textContent = label;
            if (canonicalPath(href) === "/install-app.html") {
                link.setAttribute("data-ccg-pwa-install-nav", "true");
            }
            item.appendChild(link);
            fragment.appendChild(item);
        });
        list.replaceChildren(fragment);
    }

    function synchroniseNavigationStructure() {
        const header = document.querySelector("[data-ccg-header]");
        const nav = header?.querySelector(".ccg-nav");
        if (!header || !nav) return false;

        const primary = nav.querySelector("[data-ccg-nav-primary]");
        const secondary = nav.querySelector("[data-ccg-nav-secondary]");
        let changed = false;

        if (!listMatches(primary, FINAL_PRIMARY)) {
            buildList(primary, FINAL_PRIMARY);
            changed = true;
        }
        if (!listMatches(secondary, FINAL_SECONDARY)) {
            buildList(secondary, FINAL_SECONDARY);
            changed = true;
        }

        if (changed) {
            const menu = nav.querySelector("[data-ccg-more-menu]");
            if (menu) {
                menu.replaceChildren();
                menu.hidden = true;
            }

            const toggle = nav.querySelector("[data-ccg-more-toggle]");
            if (toggle) toggle.setAttribute("aria-expanded", "false");
        }

        if (typeof window.ccgMarkNavigationActive === "function") {
            window.ccgMarkNavigationActive(header);
        }
        return changed;
    }

    function createModeToggle() {
        const button = document.createElement("button");
        button.className = "ccg-mode-toggle";
        button.type = "button";
        button.setAttribute("aria-label", "Toggle between C64 and Amiga modes");
        button.setAttribute("data-ccg-mode-toggle", "");
        button.innerHTML = '<span class="ccg-mode-toggle__pill"><span class="ccg-mode-toggle__label ccg-mode-toggle__label--c64">C64 MODE</span><span class="ccg-mode-toggle__label ccg-mode-toggle__label--amiga">AMIGA MODE</span><span class="ccg-mode-toggle__thumb"></span></span>';
        return button;
    }

    function buildSocials(container) {
        container.setAttribute("aria-label", "Social links");
        const fragment = document.createDocumentFragment();
        SOCIAL_LINKS.forEach(([label, href, icon]) => {
            const link = document.createElement("a");
            link.href = href;
            link.setAttribute("aria-label", label);
            const span = document.createElement("span");
            span.className = `ccg-socials__icon ccg-socials__icon--${icon}`;
            link.appendChild(span);
            fragment.appendChild(link);
        });
        container.replaceChildren(fragment);
    }

    function socialStructureMatches(container) {
        if (!container) return false;
        const links = Array.from(container.querySelectorAll(":scope > a"));
        if (links.length !== SOCIAL_LINKS.length) return false;
        return links.every((link, index) => {
            const [label, href, icon] = SOCIAL_LINKS[index];
            const span = link.querySelector(".ccg-socials__icon");
            return link.getAttribute("aria-label") === label
                && link.href === new URL(href, window.location.href).href
                && Boolean(span?.classList.contains(`ccg-socials__icon--${icon}`));
        });
    }

    function synchroniseHeaderActions(header) {
        const inner = header?.querySelector(".ccg-header-inner");
        if (!inner) return false;

        let changed = false;
        let actions = inner.querySelector(".ccg-header-actions");
        if (!actions) {
            actions = document.createElement("div");
            actions.className = "ccg-header-actions";
            inner.appendChild(actions);
            changed = true;
        }

        let authSlot = actions.querySelector(".ccg-auth-slot");
        if (!authSlot) {
            authSlot = document.createElement("div");
            authSlot.className = "ccg-auth-slot";
            authSlot.setAttribute("data-ccg-auth-slot", "true");
            changed = true;
        }

        let modeHint = actions.querySelector(".ccg-mode-hint");
        if (!modeHint) {
            modeHint = document.createElement("div");
            modeHint.className = "ccg-mode-hint";
            modeHint.textContent = "Try different modes";
            changed = true;
        }

        let modeToggle = actions.querySelector("[data-ccg-mode-toggle]");
        if (!modeToggle) {
            modeToggle = createModeToggle();
            changed = true;
        }

        let socials = actions.querySelector(".ccg-header-socials");
        if (!socials) {
            socials = document.createElement("div");
            socials.className = "ccg-header-socials";
            buildSocials(socials);
            changed = true;
        } else if (!socialStructureMatches(socials)) {
            buildSocials(socials);
            changed = true;
        }

        header.querySelectorAll(".ccg-socials-fallback").forEach((fallback) => {
            fallback.remove();
            changed = true;
        });

        const desired = [authSlot, modeHint, modeToggle, socials];
        const current = Array.from(actions.children);
        const sameOrder = desired.length === current.length && desired.every((node, index) => current[index] === node);
        if (!sameOrder) {
            desired.forEach((node) => actions.appendChild(node));
            Array.from(actions.children).forEach((node) => {
                if (!desired.includes(node)) node.remove();
            });
            changed = true;
        }

        return changed;
    }

    function synchroniseBrand(header) {
        const brand = header?.querySelector(".ccg-brand");
        if (!brand) return false;
        let changed = false;
        if (brand.getAttribute("href") !== "/home.html") {
            brand.setAttribute("href", "/home.html");
            changed = true;
        }
        const logo = brand.querySelector(".ccg-brand__logo");
        if (logo) {
            if (canonicalPath(logo.getAttribute("src")) !== "/resources/images/ccgamer-logo.png") {
                logo.setAttribute("src", "/resources/images/ccgamer-logo.png");
                changed = true;
            }
            if (logo.getAttribute("loading") !== "eager") {
                logo.setAttribute("loading", "eager");
                changed = true;
            }
            if (!logo.getAttribute("width")) logo.setAttribute("width", "1500");
            if (!logo.getAttribute("height")) logo.setAttribute("height", "1032");
        }
        return changed;
    }

    function shellStructureMatches() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header) return false;
        const actions = header.querySelector(".ccg-header-actions");
        if (!actions) return false;
        if (!actions.querySelector(".ccg-auth-slot")) return false;
        if (!actions.querySelector(".ccg-mode-hint")) return false;
        if (!actions.querySelector("[data-ccg-mode-toggle]")) return false;
        if (!socialStructureMatches(actions.querySelector(".ccg-header-socials"))) return false;
        if (header.querySelector(".ccg-socials-fallback")) return false;
        return navigationStructureMatches();
    }

    function synchroniseShellStructure() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header || shellRepairing) return false;
        shellRepairing = true;
        try {
            const changed = Boolean(
                synchroniseBrand(header)
                | synchroniseHeaderActions(header)
                | synchroniseNavigationStructure()
            );
            header.dataset.ccgShellAuthority = "true";
            document.documentElement.classList.add("ccg-shell-ready");
            return changed;
        } finally {
            shellRepairing = false;
        }
    }

    function isNavPillCandidate(el) {
        if (!(el instanceof HTMLElement)) return false;
        if (el.closest(".ccg-nav__more-menu, .ccg-nav-drawer, [data-ccg-more-menu], [data-ccg-nav-drawer]")) return false;
        return Boolean(el.matches(".ccg-nav__link, .ccg-nav__more-toggle, .ccg-nav-toggle, .ccg-mode-toggle, .ccg-community-profile-btn, .ccg-btn-auth"));
    }

    function migrateDropShadowToBoxShadow(style) {
        const filter = style.getPropertyValue("filter") || "";
        if (!/drop-shadow\(/i.test(filter)) return;
        const match = filter.match(/drop-shadow\(([^)]+)\)/i);
        if (!match) return;
        const args = match[1].trim().split(/\s+/);
        if (args.length < 2) return;
        const x = args[0] || "0px";
        const y = args[1] || "0px";
        const blur = args[2] || "0px";
        const color = args.slice(3).join(" ") || "currentColor";
        if (!style.getPropertyValue("box-shadow")) style.setProperty("box-shadow", `${x} ${y} ${blur} ${color}`);
        const cleanedFilter = filter.replace(/\s*drop-shadow\([^)]+\)/gi, "").trim();
        if (cleanedFilter) style.setProperty("filter", cleanedFilter);
        else style.removeProperty("filter");
    }

    function hardenPill(el) {
        if (!isNavPillCandidate(el) || el.classList.contains(HARDENED_CLASS)) return;
        el.classList.add(HARDENED_CLASS);
        el.style.setProperty("border-radius", "0px", "important");
        el.style.setProperty("overflow", "hidden", "important");
        el.style.setProperty("background-clip", "padding-box", "important");
        el.style.setProperty("filter", "none", "important");
        el.style.setProperty("backdrop-filter", "none", "important");
        migrateDropShadowToBoxShadow(el.style);
    }

    function applyNavGlowPatch() {
        document.querySelectorAll(".ccg-header .ccg-nav__link, .ccg-header .ccg-nav__more-toggle, .ccg-header .ccg-nav-toggle, .ccg-header .ccg-mode-toggle, .ccg-header .ccg-community-profile-btn, .ccg-header .ccg-btn-auth").forEach(hardenPill);
    }

    function normaliseModulePath(value) {
        if (!value) return "";
        try {
            const pathname = new URL(value, window.location.href).pathname;
            return pathname.replace(/^\/ccgamer_website_new(?=\/)/i, "");
        } catch (error) {
            return String(value || "").split(/[?#]/, 1)[0];
        }
    }

    function hasModuleScript(src) {
        return Array.from(document.scripts).some((script) => normaliseModulePath(script.getAttribute("src")) === src);
    }

    function hasStylesheet(href) {
        return Array.from(document.querySelectorAll('link[rel="stylesheet"][href]')).some((link) => normaliseModulePath(link.getAttribute("href")) === href);
    }

    function loadRequiredStyles() {
        REQUIRED_STYLES.forEach(({ href, marker }) => {
            if (hasStylesheet(href)) return;
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            link.setAttribute(marker, "true");
            document.head.appendChild(link);
        });
    }

    function loadModules(modules) {
        modules.forEach(({ src, marker }) => {
            if (hasModuleScript(src)) return;
            const script = document.createElement("script");
            script.src = src;
            script.async = false;
            script.setAttribute(marker, "true");
            document.body.appendChild(script);
        });
    }

    function queueApply() { window.requestAnimationFrame(applyNavGlowPatch); }

    function bindStateReapply() {
        if (window.__ccgNavCoreBound) return;
        window.__ccgNavCoreBound = true;
        window.addEventListener("resize", queueApply, { passive: true });
        window.addEventListener("orientationchange", queueApply, { passive: true });
        window.addEventListener("pageshow", () => {
            synchroniseShellStructure();
            queueApply();
        });
        document.addEventListener("click", (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest("[data-ccg-mode-toggle], [data-ccg-nav-toggle], [data-ccg-drawer-close], [data-ccg-more-toggle]")) {
                queueApply();
            }
        });
    }

    function installNavigationAuthorityObserver() {
        if (navAuthorityObserver) return;
        const nav = document.querySelector("[data-ccg-header] .ccg-nav");
        if (!nav) return;
        const lists = nav.querySelectorAll("[data-ccg-nav-primary], [data-ccg-nav-secondary]");
        if (!lists.length) return;

        navAuthorityObserver = new MutationObserver(() => {
            if (navigationStructureMatches()) return;
            if (!synchroniseNavigationStructure()) return;
            applyNavGlowPatch();
            document.dispatchEvent(new CustomEvent("ccg:navigation-ready", { detail: { nav } }));
        });
        lists.forEach((list) => navAuthorityObserver.observe(list, { childList: true, subtree: true }));
    }

    function installShellAuthorityObserver() {
        if (shellAuthorityObserver) return;
        const header = document.querySelector("[data-ccg-header]");
        if (!header) return;
        shellAuthorityObserver = new MutationObserver(() => {
            if (shellRepairing || shellStructureMatches()) return;
            if (!synchroniseShellStructure()) return;
            applyNavGlowPatch();
            document.dispatchEvent(new CustomEvent("ccg:shell-ready", { detail: { header } }));
        });
        shellAuthorityObserver.observe(header, { childList: true, subtree: true });
    }

    function initUnifiedNavCore() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header || navCoreInitialised) return false;
        navCoreInitialised = true;
        loadRequiredStyles();
        synchroniseShellStructure();
        applyNavGlowPatch();
        bindStateReapply();
        installNavigationAuthorityObserver();
        installShellAuthorityObserver();
        loadModules(CRITICAL_MODULES);
        loadModules(OPTIONAL_MODULES);
        document.dispatchEvent(new CustomEvent("ccg:navigation-ready", { detail: { nav: header.querySelector(".ccg-nav") } }));
        document.dispatchEvent(new CustomEvent("ccg:shell-ready", { detail: { header } }));
        return true;
    }

    window.applyNavGlowPatch = applyNavGlowPatch;
    window.CCGUnifiedNavCore = Object.freeze({
        init: initUnifiedNavCore,
        sync: synchroniseShellStructure,
        syncNavigation: synchroniseNavigationStructure,
        applyNavGlowPatch
    });

    if (document.querySelector("[data-ccg-header]")) initUnifiedNavCore();
    else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initUnifiedNavCore, { once: true });
    else initUnifiedNavCore();
})();
