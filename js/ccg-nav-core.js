/*
CCG Unified Navigation Core
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
        { src: "/js/ccg-nav-fit.js", marker: "data-ccg-nav-fit-loader" },
        { src: "/js/ccg-header-auth-loader.js", marker: "data-ccg-header-auth-loader" },
        { src: "/js/ccg-publisher-history.js", marker: "data-ccg-publisher-history-loader" },
        { src: "/js/ccg-ui-regression-fixes.js", marker: "data-ccg-ui-regression-fixes-loader" },
        { src: "/js/ccg-mode-engine.js", marker: "data-ccg-mode-engine-loader" },
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

    let navAuthorityObserver = null;
    let navCoreInitialised = false;

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
            if (toggle) {
                toggle.setAttribute("aria-expanded", "false");
            }
        }

        if (typeof window.ccgMarkNavigationActive === "function") {
            window.ccgMarkNavigationActive(header);
        }
        return changed;
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

    function loadOptionalModules() {
        OPTIONAL_MODULES.forEach(({ src, marker }) => {
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
        document.addEventListener("click", (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest("[data-ccg-mode-toggle], [data-ccg-nav-toggle], [data-ccg-drawer-close], [data-ccg-more-toggle]")) {
                queueApply();
                setTimeout(queueApply, 120);
            }
        });
        const header = document.querySelector("[data-ccg-header]");
        if (header) {
            new MutationObserver((mutations) => {
                if (mutations.some((mutation) => mutation.type === "attributes" || mutation.type === "childList")) queueApply();
            }).observe(header, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "aria-hidden", "hidden", "style", "data-mode", "data-ccg-mode"] });
        }
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

    function initUnifiedNavCore() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header || navCoreInitialised) return false;
        navCoreInitialised = true;
        loadRequiredStyles();
        synchroniseNavigationStructure();
        applyNavGlowPatch();
        bindStateReapply();
        installNavigationAuthorityObserver();
        loadOptionalModules();
        document.dispatchEvent(new CustomEvent("ccg:navigation-ready"));
        return true;
    }

    window.applyNavGlowPatch = applyNavGlowPatch;
    window.CCGUnifiedNavCore = Object.freeze({
        init: initUnifiedNavCore,
        sync: synchroniseNavigationStructure,
        applyNavGlowPatch
    });

    if (document.querySelector("[data-ccg-header]")) initUnifiedNavCore();
    else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initUnifiedNavCore, { once: true });
    else initUnifiedNavCore();
})();