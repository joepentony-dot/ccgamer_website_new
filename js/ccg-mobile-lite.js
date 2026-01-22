/* ============================================================
   CCG MOBILE LITE MODE
   • Desktop untouched
   • Mobile performance first
============================================================ */
(function () {
    const root = document.documentElement;
    const isMobile =
        window.matchMedia("(max-width: 900px)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        window.matchMedia("(pointer: coarse)").matches;

    if (isMobile) {
        root.classList.add("ccg-mobile-lite", "ccg-mobile-defer-visuals");
    }

    const markVisualsReady = () => {
        if (!root.classList.contains("ccg-visuals-ready")) {
            root.classList.add("ccg-visuals-ready");
        }
        root.classList.remove("ccg-mobile-defer-visuals");
        document.dispatchEvent(new Event("ccg-visuals-ready"));
    };

    const scheduleVisuals = () => {
        if (isMobile) {
            if ("requestIdleCallback" in window) {
                window.requestIdleCallback(() => {
                    requestAnimationFrame(markVisualsReady);
                }, { timeout: 1200 });
            } else {
                requestAnimationFrame(() => {
                    setTimeout(markVisualsReady, 180);
                });
            }
        } else {
            requestAnimationFrame(markVisualsReady);
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", scheduleVisuals, { once: true });
    } else {
        scheduleVisuals();
    }
})();
