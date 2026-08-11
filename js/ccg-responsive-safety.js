/* ============================================================
   CCG RESPONSIVE SAFETY LOADER
   ------------------------------------------------------------
   Loads the final responsive contract after the shared theme
   stack so breakpoint/overflow safeguards remain authoritative.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_RESPONSIVE_SAFETY_READY) return;
    window.CCG_RESPONSIVE_SAFETY_READY = true;

    const CSS_PATH = "/resources/css/ccg-responsive-safety.css";
    const ATTR = "data-ccg-responsive-safety";
    let scheduled = false;

    function findLink() {
        return document.querySelector(`link[${ATTR}], link[href="${CSS_PATH}"]`);
    }

    function ensureStylesheetLast() {
        scheduled = false;
        let link = findLink();

        if (!link) {
            link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = CSS_PATH;
            link.setAttribute(ATTR, "true");
            document.head.appendChild(link);
            return;
        }

        link.setAttribute(ATTR, "true");

        /* Re-appending an existing link moves it to the end of the
           stylesheet cascade without duplicating or refetching it. */
        if (link.parentNode === document.head && link !== document.head.lastElementChild) {
            document.head.appendChild(link);
        }
    }

    function scheduleEnsure() {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(ensureStylesheetLast);
    }

    function init() {
        ensureStylesheetLast();
        window.setTimeout(ensureStylesheetLast, 120);
        window.setTimeout(ensureStylesheetLast, 600);
        window.addEventListener("load", ensureStylesheetLast, { once: true });
        window.addEventListener("resize", scheduleEnsure, { passive: true });
        window.addEventListener("orientationchange", scheduleEnsure, { passive: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
