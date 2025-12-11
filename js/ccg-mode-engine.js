/* ============================================================
   CCG Mode Engine — Safe Unified Build
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const root = document.body;
    const toggle = document.querySelector("[data-ccg-mode-toggle]");

    if (!toggle) {
        console.warn("ccg-mode-engine.js: Mode toggle button not found.");
        return;
    }

    toggle.addEventListener("click", () => {
        const current = root.getAttribute("data-ccg-mode") === "c64" ? "amiga" : "c64";
        root.setAttribute("data-ccg-mode", current);
        localStorage.setItem("ccg-mode", current);
    });

    const saved = localStorage.getItem("ccg-mode");
    if (saved) root.setAttribute("data-ccg-mode", saved);
});
