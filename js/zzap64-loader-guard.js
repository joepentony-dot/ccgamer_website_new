/* ============================================================
   ZZAP!64 ARCHIVE — VISIBLE LOADING BAR GUARD
   ------------------------------------------------------------
   Makes the existing real-progress loader impossible to miss:
   • moves it directly beneath the site header/mode strip
   • keeps it visible long enough to be useful
   • waits for the page load event before allowing dismissal
   • preserves warning/error states from the archive controller
============================================================ */

(function () {
    "use strict";

    if (window.CCG_ZZAP64_LOADER_GUARD_READY) return;
    window.CCG_ZZAP64_LOADER_GUARD_READY = true;

    const MIN_VISIBLE_MS = 2400;

    function init() {
        if (document.documentElement.getAttribute("data-ccg-page") !== "zzap64-awards") return;

        const loader = document.getElementById("zzapLoading");
        if (!loader || loader.dataset.ccgLoaderGuard === "true") return;

        loader.dataset.ccgLoaderGuard = "true";
        loader.classList.add("zzap-loading--top-guard");

        const header = document.querySelector("[data-ccg-header], .ccg-header");
        if (header?.parentNode) {
            header.parentNode.insertBefore(loader, header.nextSibling);
        }

        const startedAt = performance.now();
        let pageLoaded = document.readyState === "complete";
        let hideRequested = false;
        let allowHide = false;
        let releaseTimer = 0;

        const releaseWhenReady = () => {
            if (!hideRequested || allowHide) return;
            if (!pageLoaded) return;
            if (loader.getAttribute("aria-busy") !== "false") return;
            if (loader.dataset.state === "error") return;

            const elapsed = performance.now() - startedAt;
            const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

            window.clearTimeout(releaseTimer);
            releaseTimer = window.setTimeout(() => {
                allowHide = true;
                loader.hidden = true;
                observer.disconnect();
            }, remaining);
        };

        const observer = new MutationObserver(() => {
            if (loader.hidden && !allowHide) {
                hideRequested = true;
                loader.hidden = false;
            }
            releaseWhenReady();
        });

        observer.observe(loader, {
            attributes: true,
            attributeFilter: ["hidden", "aria-busy", "data-state"]
        });

        loader.hidden = false;

        if (!pageLoaded) {
            window.addEventListener("load", () => {
                pageLoaded = true;
                releaseWhenReady();
            }, { once: true });
        }

        window.setTimeout(releaseWhenReady, MIN_VISIBLE_MS);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
