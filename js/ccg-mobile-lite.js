/* ============================================================
   CCG MOBILE LITE MODE
   • Desktop untouched
   • Mobile performance first
============================================================ */
(function () {
    const isMobile =
        window.matchMedia("(max-width: 900px)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isMobile) {
        document.documentElement.classList.add("ccg-mobile-lite");
    }
})();
