/* ==========================================================
   CCG GLOBAL SCRIPT — APPLIES UNIVERSAL EFFECTS
   ========================================================== */

(function(){
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
    let scanlineStrength = 0.18;

    function updateScanlines() {
        if (!scanlineOverlay) return;
        scanlineOverlay.style.opacity = scanlineStrength;
    }

    updateScanlines();

    // SHIFT + S → cycle scanline modes
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

        // Adjust accent colours sitewide
        if (mode === "c64") {
            body.style.setProperty("--ccg-accent", "#70fff0");
        } else if (mode === "amiga") {
            body.style.setProperty("--ccg-accent", "#32f6ff");
        } else if (mode === "zx") {
            body.style.setProperty("--ccg-accent", "#00ff00");
        }
    });

})();
