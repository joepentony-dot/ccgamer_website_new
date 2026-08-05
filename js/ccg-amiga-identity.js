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

    const CSS_PATHS = [
        "/resources/css/ccg-amiga-identity.css",
        "/resources/css/ccg-amiga-mobile-alignment.css"
    ];
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
        ".ccg-discover__hero",
        ".ccg-discover__filters",
        ".genre-hero",
        ".collection-hero"
    ];

    function isExcludedPage() {
        return /^\/(admin|auth|community)\//i.test(location.pathname);
    }

    function ensureCss() {
        CSS_PATHS.forEach((cssPath) => {
            if (document.querySelector(`link[href="${cssPath}"]`)) return;
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = cssPath;
            document.head.appendChild(link);
        });
    }

    function addWindowChrome(element) {
        if (!(element instanceof Element)) return;
        if (element.querySelector(":scope > .ccg-amiga-window__chrome")) return;

        const chrome = document.createElement("span");
        chrome.className = "ccg-amiga-window__chrome";
        chrome.setAttribute("aria-hidden", "true");
        chrome.innerHTML = `
            <span class="ccg-amiga-window__titlebar"></span>
            <span class="ccg-amiga-window__gadget"></span>
        `;
        element.prepend(chrome);
    }

    function enhancePanel(element) {
        if (!(element instanceof Element)) return;
        if (element.closest(".ccg-nav-drawer, .ccg-global-search")) return;
        element.classList.add("ccg-amiga-window");
        addWindowChrome(element);
    }

    function markPanels(root = document) {
        PANEL_SELECTORS.forEach((selector) => {
            root.querySelectorAll?.(selector).forEach(enhancePanel);
        });
    }

    function init() {
        if (isExcludedPage()) return;
        ensureCss();
        markPanels();

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof Element)) return;
                    if (PANEL_SELECTORS.some((selector) => node.matches(selector))) {
                        enhancePanel(node);
                    }
                    markPanels(node);
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
