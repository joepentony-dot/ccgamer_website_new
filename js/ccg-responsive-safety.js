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
        }
    ]);

    let scheduled = false;

    function findLink(config) {
        return document.querySelector(`link[${config.attr}], link[href="${config.href}"]`);
    }

    function ensureStylesheetsLast() {
        scheduled = false;

        STYLESHEETS.forEach((config) => {
            let link = findLink(config);

            if (!link) {
                link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = config.href;
                link.setAttribute(config.attr, "true");
                document.head.appendChild(link);
                return;
            }

            link.setAttribute(config.attr, "true");

            /* Re-appending an existing link moves it to the end of the
               stylesheet cascade without duplicating or refetching it. */
            if (link.parentNode === document.head && link !== document.head.lastElementChild) {
                document.head.appendChild(link);
            }
        });
    }

    function scheduleEnsure() {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(ensureStylesheetsLast);
    }

    function init() {
        ensureStylesheetsLast();
        window.setTimeout(ensureStylesheetsLast, 120);
        window.setTimeout(ensureStylesheetsLast, 600);
        window.addEventListener("load", ensureStylesheetsLast, { once: true });
        window.addEventListener("resize", scheduleEnsure, { passive: true });
        window.addEventListener("orientationchange", scheduleEnsure, { passive: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();