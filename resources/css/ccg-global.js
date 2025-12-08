/* ================================================================
   CCG-GLOBAL.JS — Universal Framework Init (Omega Safe Build)
   Drives:
   - Fade-in
   - Mode sync
   - Header/logo normalisation
================================================================ */

document.addEventListener("DOMContentLoaded", () => {
    // ------------------------------------------------------------
    // PAGE FADE-IN
    // ------------------------------------------------------------
    document.body.classList.add("ccg-fade-in");

    // ------------------------------------------------------------
    // MODE BADGE SYNC (C64 / AMIGA)
    // ------------------------------------------------------------
    const body = document.body;
    const mode = body.getAttribute("data-mode") || "c64";

    const badge = document.querySelector("[data-ccg-hero-mode-label]");
    if (badge) badge.textContent = mode.toUpperCase();

    // ------------------------------------------------------------
    // LOGO NORMALISATION (fixes legacy paths)
    // ------------------------------------------------------------
    const correctLogo = "resources/images/ccgamer-logo.png";
    document.querySelectorAll("img[src*='ccgamer-logo']").forEach(img => {
        img.src = correctLogo;
    });
});
