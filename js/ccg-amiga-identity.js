/* ============================================================
   CCG AMIGA VISUAL IDENTITY
   ------------------------------------------------------------
   Marks established high-level panels for an Amiga-specific
   interface treatment. It does not move or resize content.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_AMIGA_IDENTITY_READY) return;
    window.CCG_AMIGA_IDENTITY_READY = true;

    const CSS_PATH = "/resources/css/ccg-amiga-identity.css";
    const PANEL_SELECTORS = [
        ".games-hero",
        ".games-tools",
        ".games-library",
        ".ccg-publishers-hero",
        ".ccg-publishers-tools",
        ".ccg-publisher-history",
        ".game-hero",
        ".game-section",
        ".ccg-home-hero",
        ".home-hero",
        ".home-section",
        ".ccg-recently-viewed",
        ".zzap-archive__hero",
        ".zzap-tools",
        ".ccg-compare__hero",
        ".ccg-compare__picker",
        ".ccg-discover__hero",
        ".ccg-discover__filters",
        ".genre-hero",
        ".collection-hero"
    ];

    function isExcludedPage() {
        return /^\/(admin|auth|community)\//i.test(location.pathname);
    }

    function ensureCss() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_PATH;
        document.head.appendChild(link);
    }

    function markPanels(root = document) {
        PANEL_SELECTORS.forEach((selector) => {
            root.querySelectorAll?.(selector).forEach((element) => {
                if (element.closest(".ccg-nav-drawer, .ccg-global-search")) return;
                element.classList.add("ccg-amiga-window");
            });
        });
    }

    function init() {
        if (isExcludedPage()) return;
        ensureCss();
        markPanels();
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof Element) {
                        if (PANEL_SELECTORS.some((selector) => node.matches(selector))) {
                            node.classList.add("ccg-amiga-window");
                        }
                        markPanels(node);
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
