/* ==========================================================
   CCG GLOBAL SCRIPT — UNIVERSAL EFFECTS + OMEGA MODE SUPPORT
   FINAL CLEAN BUILD — DEPTH-AWARE LOGO FIX (NO 404s)
   ========================================================== */

(function () {
    const body = document.body;

    /* -----------------------------------------------
       HELPER: COMPUTE CORRECT LOGO PATH BY DEPTH
       Works on:
       - GitHub Pages: /ccgamer_website_new/...
       - Future domain: /...
    ----------------------------------------------- */
    function getLogoPath() {
        let path = window.location.pathname || "";

        // If we're on GitHub Pages, strip the repo segment
        const repoMarker = "/ccgamer_website_new/";
        const repoIndex = path.indexOf(repoMarker);
        if (repoIndex !== -1) {
            path = path.substring(repoIndex + repoMarker.length); // e.g. "games/genres/arcade-games.html"
        }

        // Normalise leading slash if present (custom domain case)
        if (path.startsWith("/")) {
            path = path.slice(1); // "games/index.html"
        }

        // If we're exactly at the root ("/" or "/ccgamer_website_new/")
        if (!path) {
            // Treat as depth 0 (same folder as home.html)
            return "resources/images/ccgamer-logo.png";
        }

        const segments = path.split("/");
        // Last segment is the file, everything before is folder depth
        const folderDepth = Math.max(segments.length - 1, 0);

        // Build prefix like "", "../", "../../", etc.
        let prefix = "";
        for (let i = 0; i < folderDepth; i++) {
            prefix += "../";
        }

        return prefix + "resources/images/ccgamer-logo.png";
    }

    /* -----------------------------------------------
       PAGE FADE-IN
    ----------------------------------------------- */
    document.addEventListener("DOMContentLoaded", () => {
        body.classList.add("ccg-fade-in");
    });

    /* -----------------------------------------------
       OMEGA LOGO NORMALISER — DEPTH-AWARE
       Ensures all .ccg-brand__logo elements get
       the correct relative path based on page depth.
    ----------------------------------------------- */
    document.addEventListener("DOMContentLoaded", () => {
        const correctLogo = getLogoPath();

        document.querySelectorAll(".ccg-brand__logo").forEach(img => {
            img.src = correctLogo;

            // Safety: ensure alt + loading are sensible
            if (!img.alt || img.alt.trim() === "") {
                img.alt = "Cheeky Commodore Gamer logo";
            }
            if (!img.getAttribute("loading")) {
                img.setAttribute("loading", "lazy");
            }
        });
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
       GLOBAL MODE CHANGE EVENT
       Fired by ccg-mode-engine.js
    ----------------------------------------------- */
    document.addEventListener("ccg:modeChange", (event) => {
        const mode = event.detail.mode;

        console.log("GLOBAL MODE UPDATE →", mode);

        // Update accent colour system-wide
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
       OMEGA SWITCH HANDLE POSITION
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
