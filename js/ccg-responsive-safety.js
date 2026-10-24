/* ============================================================
   CCG RESPONSIVE SAFETY LOADER
   ------------------------------------------------------------
   Loads the final responsive contract after the shared theme
   stack so breakpoint/overflow safeguards remain authoritative.
============================================================ */

(function () {
    "use strict";

    const pageId = String(document.documentElement.getAttribute("data-ccg-page") || "").toLowerCase();
    const pathname = String(window.location.pathname || "");

    /* The intro loader and admin tools own their own viewport contracts. */
    if (pageId === "intro" || pathname.startsWith("/admin/")) return;

    if (window.CCG_RESPONSIVE_SAFETY_READY) return;
    window.CCG_RESPONSIVE_SAFETY_READY = true;

    const STYLESHEETS = Object.freeze([
        {
            href: "/resources/css/ccg-responsive-safety.css",
            attr: "data-ccg-responsive-safety"
        },
        {
            href: "/resources/css/ccg-responsive-page-polish.css",
            attr: "data-ccg-responsive-page-polish"
        },
        {
            href: "/resources/css/ccg-sitewide-layout-optimization.css",
            attr: "data-ccg-sitewide-layout-optimization"
        },
        {
            href: "/resources/css/ccg-nav-labelled-bridge.css",
            attr: "data-ccg-nav-labelled-bridge"
        }
    ]);

    // Staged pages declare this same ordered stack before first paint. Legacy
    // pages may still need it once; moving loaded links invalidates style/layout
    // and briefly changes the winner of competing responsive rules.
    function ensureStylesheets() {
        STYLESHEETS.forEach((config) => {
            const existing = Array.from(document.querySelectorAll("link[href]"))
                .find((link) => new URL(link.href, location.href).pathname === config.href);
            if (existing) return;
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = config.href;
            link.setAttribute(config.attr, "true");
            document.head.appendChild(link);
        });
    }

    function init() {
        ensureStylesheets();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
