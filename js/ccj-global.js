/* ==========================================================
   CCG GLOBAL SCRIPT — UNIVERSAL EFFECTS + OMEGA TOGGLE
   ========================================================== */

(function () {
    const body = document.body;

    /* -----------------------------------------------
       PAGE FADE-IN
    ----------------------------------------------- */
    document.addEventListener("DOMContentLoaded", () => {
        body.classList.add("ccg-fade-in");
    });

    /* -----------------------------------------------
       SCANLINE INTENSITY (SHIFT + S)
    ----------------------------------------------- */
    const scanlineOverlay = document.querySelector(".crt-overlay");
    let scanlineStrength = 0.05;

    function updateScanlines() {
        if (scanlineOverlay) scanlineOverlay.style.opacity = scanlineStrength;
    }

    updateScanlines();

    window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "s" && e.shiftKey) {
            scanlineStrength += 0.1;
            if (scanlineStrength > 0.45) scanlineStrength = 0.05;
            updateScanlines();
        }
    });

    /* -----------------------------------------------
       GLOBAL MODE CHANGE
       Fired by ccg-mode-engine.js
    ----------------------------------------------- */
    document.addEventListener("ccg:modeChange", (event) => {
        const mode = event.detail.mode;

        console.log("GLOBAL MODE UPDATE →", mode);

        // Apply accent colour
        if (mode === "c64") {
            body.style.setProperty("--ccg-accent", "#70fff0");   // cyan glow
        } else if (mode === "amiga") {
            body.style.setProperty("--ccg-accent", "#f432ff");   // neon magenta
        }

        updateModeToggleLabel();
        updateOmegaSwitchVisual();
    });

    /* -----------------------------------------------
       MODE LABEL HANDLER
    ----------------------------------------------- */
    function updateModeToggleLabel() {
        const label = document.getElementById("ccg-mode-label");
        if (!label) return;

        const mode = document.body.dataset.mode;
        label.textContent = mode === "amiga" ? "Amiga Mode" : "C64 Mode";
    }

    /* -----------------------------------------------
       SWITCH HANDLE POSITION
    ----------------------------------------------- */
    function updateOmegaSwitchVisual() {
        const switchEl = document.querySelector(".ccg-omega-toggle");
        if (!switchEl) return;

        const mode = body.dataset.mode;

        switchEl.classList.toggle("omega-amiga", mode === "amiga");
        switchEl.classList.toggle("omega-c64", mode === "c64");
    }

    /* -----------------------------------------------
       INITIALISE ON LOAD
    ----------------------------------------------- */
    document.addEventListener("DOMContentLoaded", () => {
        updateModeToggleLabel();
        updateOmegaSwitchVisual();
    });

})();
