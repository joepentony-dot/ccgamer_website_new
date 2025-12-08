/* ============================================================
   CCG MODE ENGINE — OMEGA A1
   Handles:
   ✔ C64 ↔ Amiga toggle pill
   ✔ Body data-mode attribute
   ✔ Hero label update
   ✔ LocalStorage persistence
   ✔ Safe fallbacks
============================================================ */

(function () {

    const body = document.body;

    const MODE_KEY = "ccg-site-mode";              // localStorage key
    const toggleBtn = document.querySelector("[data-ccg-mode-toggle]");

    // Old hero label (still supported in case some pages use it)
    const heroModeLabelLegacy = document.querySelector("[data-ccg-hero-mode-label]");

    // NEW Phase 5 hero label
    const heroModeLabel = document.querySelector("[data-ccg-mode-label]");

    const heroBadge = document.querySelector("[data-ccg-hero-badge]");

    /* ------------------------------------------------------------
       1) DETERMINE STARTUP MODE
    ------------------------------------------------------------ */

    function getInitialMode() {
        const saved = localStorage.getItem(MODE_KEY);
        if (saved === "c64" || saved === "amiga") return saved;

        // Default mode = C64
        return "c64";
    }

    function applyMode(mode) {
        body.setAttribute("data-mode", mode);

        const upper = mode.toUpperCase();

        // Update NEW Phase 5 label
        if (heroModeLabel) {
            heroModeLabel.textContent = upper;
        }

        // Keep backwards compatibility for any older hero pages
        if (heroModeLabelLegacy) {
            heroModeLabelLegacy.textContent = upper;
        }

        if (heroBadge) {
            heroBadge.classList.remove("mode-c64", "mode-amiga");
            heroBadge.classList.add(`mode-${mode}`);
        }

        localStorage.setItem(MODE_KEY, mode);
    }


    /* ------------------------------------------------------------
       2) TOGGLE LOGIC
    ------------------------------------------------------------ */

    function toggleMode() {
        const current = body.getAttribute("data-mode") || "c64";
        const next = current === "c64" ? "amiga" : "c64";
        applyMode(next);
    }


    /* ------------------------------------------------------------
       3) INITIALISE
    ------------------------------------------------------------ */

    const startingMode = getInitialMode();
    applyMode(startingMode);

    /* ------------------------------------------------------------
       4) WIRE THE BUTTON
    ------------------------------------------------------------ */

    if (toggleBtn) {
        toggleBtn.addEventListener("click", toggleMode);
    } else {
        console.warn("⚠ ccg-mode-engine.js: Mode toggle button not found.");
    }

})();
