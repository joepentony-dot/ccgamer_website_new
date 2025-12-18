/* ==========================================================
   CCG GLOBAL SCRIPT — UNIVERSAL EFFECTS + OMEGA MODE SUPPORT
   FINAL CLEAN BUILD — DEPTH-AWARE LOGO FIX (NO 404s)
   + HEADER "MORE ▾" DROPDOWN LOGIC (H6)
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
            path = path.substring(repoIndex + repoMarker.length);
        }

        if (path.startsWith("/")) {
            path = path.slice(1);
        }

        if (!path) {
            return "resources/images/ccgamer-logo.png";
        }

        const segments = path.split("/");
        const folderDepth = Math.max(segments.length - 1, 0);

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
    ----------------------------------------------- */
    document.addEventListener("DOMContentLoaded", () => {
        const correctLogo = getLogoPath();

        document.querySelectorAll(".ccg-brand__logo").forEach(img => {
            img.src = correctLogo;

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
    ----------------------------------------------- */
    document.addEventListener("ccg:modeChange", (event) => {
        const mode = event.detail.mode;

        if (mode === "c64") {
            body.style.setProperty("--ccg-accent", "#70fff0");
        } else if (mode === "amiga") {
            body.style.setProperty("--ccg-accent", "#f432ff");
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
       HEADER "MORE ▾" DROPDOWN — ACCESSIBLE TOGGLE (H6)
    ----------------------------------------------- */
    document.addEventListener("DOMContentLoaded", () => {
        const moreBtn = document.querySelector(".ccg-nav__more-btn");
        const dropdown = document.querySelector(".ccg-nav__dropdown");

        if (!moreBtn || !dropdown) return;

        function openMenu() {
            dropdown.classList.add("is-open");
            moreBtn.setAttribute("aria-expanded", "true");
        }

        function closeMenu() {
            dropdown.classList.remove("is-open");
            moreBtn.setAttribute("aria-expanded", "false");
        }

        function toggleMenu() {
            const isOpen = dropdown.classList.contains("is-open");
            isOpen ? closeMenu() : openMenu();
        }

        moreBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        document.addEventListener("click", (e) => {
            if (!dropdown.contains(e.target) && !moreBtn.contains(e.target)) {
                closeMenu();
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                closeMenu();
            }
        });
    });

    /* -----------------------------------------------
       INITIALISE ON LOAD
    ----------------------------------------------- */
    document.addEventListener("DOMContentLoaded", () => {
        updateModeToggleLabel();
        updateOmegaSwitchVisual();
    });

})();
