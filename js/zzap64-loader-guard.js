/* ============================================================
   ZZAP!64 ARCHIVE — LOADING BAR POSITIONING
   ------------------------------------------------------------
   Keeps the real-progress loader directly beneath the site
   header without delaying dismissal after the archive is ready.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_LOADER_GUARD_READY) return;
    window.CCG_ZZAP64_LOADER_GUARD_READY = true;

    const CSS_PATH = "/resources/css/zzap64-loader-guard.css";

    function ensureStylesheet() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_PATH;
        link.dataset.zzapLoaderGuard = "true";
        document.head.appendChild(link);
    }

    function positionLoader(loader) {
        const identityBar = document.getElementById("ccgModeIdentityBar");
        const header = document.querySelector("[data-ccg-header], .ccg-header");
        const anchor = identityBar || header;
        if (anchor?.parentNode) {
            anchor.parentNode.insertBefore(loader, anchor.nextSibling);
        }
    }

    function init() {
        if (document.documentElement.getAttribute("data-ccg-page") !== "zzap64-awards") return;

        ensureStylesheet();

        const loader = document.getElementById("zzapLoading");
        if (!loader || loader.dataset.ccgLoaderGuard === "true") return;

        loader.dataset.ccgLoaderGuard = "true";
        loader.classList.add("zzap-loading--top-guard");
        positionLoader(loader);

        window.addEventListener("load", () => {
            positionLoader(loader);
        }, { once: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
