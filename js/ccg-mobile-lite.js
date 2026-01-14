/* ============================================================
   CCG MOBILE LITE MODE
   • Zero impact on desktop
   • Activates on phones + reduced motion
============================================================ */

(function () {
    const isMobile =
        window.matchMedia("(max-width: 900px)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isMobile) {
        document.documentElement.classList.add("ccg-mobile-lite");
    }
})();
