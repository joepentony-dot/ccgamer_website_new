/* ==========================================================
   CCG GLOBAL SCRIPT — APPLIES UNIVERSAL EFFECTS
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
       SCANLINE INTENSITY SETUP
       ----------------------------------------------- */
    const scanlineOverlay = document.querySelector(".crt-overlay");
    let scanlineStrength = 0.05;

    function updateScanlines() {
        if (!scanlineOverlay) return;
        scanlineOverlay.style.opacity = scanlineStrength;
    }

    updateScanlines();

    // SHIFT + S → cycle scanline density
    window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "s" && e.shiftKey) {
            scanlineStrength += 0.1;
            if (scanlineStrength > 0.45) scanlineStrength = 0.05;
            updateScanlines();
        }
    });

    /* -----------------------------------------------
       GLOBAL MODE CHANGE HANDLER
       ----------------------------------------------- */
    document.addEventListener("ccg:modeChange", (event) => {
        const mode = event.detail.mode;
        console.log("GLOBAL MODE UPDATE →", mode);

        // Adjust accent colour sitewide
        if (mode === "c64") {
            body.style.setProperty("--ccg-accent", "#70fff0");
        } else if (mode === "amiga") {
            body.style.setProperty("--ccg-accent", "#32f6ff");
        } else if (mode === "zx") {
            body.style.setProperty("--ccg-accent", "#00ff00");
        }

        // Update mode toggle label when mode actually changes
        updateModeToggleLabel();
    });

    /* -----------------------------------------------
       MODE TOGGLE — AUTO LABEL UPDATER
       ----------------------------------------------- */

    function updateModeToggleLabel() {
        const label = document.getElementById("ccg-mode-label");
        if (!label) return;

        const mode = document.body.dataset.mode;
        label.textContent = mode === "amiga" ? "Amiga Mode" : "C64 Mode";
    }

    document.addEventListener("DOMContentLoaded", () => {
        const btn = document.getElementById("ccg-mode-toggle");
        const label = document.getElementById("ccg-mode-label");

        if (!btn || !label) return;

        // Ensure label is correct on page load
        updateModeToggleLabel();

        // When the mode button is clicked, wait for mode engine to flip the data-mode,
        // then update the text.
        btn.addEventListener("click", () => {
            setTimeout(updateModeToggleLabel, 20);
        });
    });

})();
