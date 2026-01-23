/* ============================================================
   CCG Mode Engine — Safe Unified Build
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const root = document.body;
    const rootElement = document.documentElement;
    const toggle = document.querySelector("[data-ccg-mode-toggle]");
    const hero = document.querySelector(".home-hero");

    if (!toggle) {
        console.warn("ccg-mode-engine.js: Mode toggle button not found.");
        return;
    }

    const heroModeLabel = document.querySelector('[data-ccg-mode-label]');
    const heroBadgeLabel = document.querySelector('[data-ccg-hero-mode-label]');

    function applyMode(mode) {
        rootElement.setAttribute("data-ccg-mode", mode);
        rootElement.setAttribute("data-mode", mode);
        root.setAttribute("data-ccg-mode", mode);
        root.setAttribute("data-mode", mode);
        if (hero) hero.setAttribute("data-hero-mode", mode);
        localStorage.setItem("ccg-mode", mode);

        const label = mode === "c64" ? "C64" : "Amiga";
        if (heroModeLabel) heroModeLabel.textContent = label;
        if (heroBadgeLabel) heroBadgeLabel.textContent = label;
    }

    toggle.addEventListener("click", () => {
        const current = root.getAttribute("data-ccg-mode") === "c64" ? "amiga" : "c64";
        applyMode(current);
    });

    const saved = localStorage.getItem("ccg-mode");
    applyMode(saved || root.getAttribute("data-ccg-mode") || "c64");
});
