/* ==========================================================
   CCG GLOBAL SCRIPT — UNIVERSAL EFFECTS + OMEGA MODE SUPPORT
   FINAL STABLE BUILD — HEADER/NAV SAFE + DEPTH-AWARE LOGO
   ========================================================== */

(function () {
    const body = document.body;

    /* ======================================================
       DEPTH-AWARE LOGO PATH (NO 404s)
    ====================================================== */

    function getLogoPath() {
        let path = window.location.pathname || "";

        const repoMarker = "/ccgamer_website_new/";
        const repoIndex = path.indexOf(repoMarker);
        if (repoIndex !== -1) {
            path = path.substring(repoIndex + repoMarker.length);
        }

        if (path.startsWith("/")) path = path.slice(1);
        if (!path) return "resources/images/ccgamer-logo.png";

        const segments = path.split("/");
        const depth = Math.max(segments.length - 1, 0);

        let prefix = "";
        for (let i = 0; i < depth; i++) prefix += "../";

        return prefix + "resources/images/ccgamer-logo.png";
    }

    document.addEventListener("DOMContentLoaded", () => {
        const correctLogo = getLogoPath();

        document.querySelectorAll(".ccg-brand__logo").forEach(img => {
            img.src = correctLogo;
            if (!img.alt) img.alt = "Cheeky Commodore Gamer logo";
            img.setAttribute("loading", "lazy");
        });
    });

    /* ======================================================
       PAGE FADE-IN
    ====================================================== */

    document.addEventListener("DOMContentLoaded", () => {
        body.classList.add("ccg-fade-in");
    });

    /* ======================================================
       MODE LABEL + TOGGLE VISUAL SYNC
    ====================================================== */

    function updateModeLabel() {
        const label = document.querySelector("[data-ccg-mode-label]");
        if (!label) return;

        const mode = body.getAttribute("data-ccg-mode") || "c64";
        label.textContent = mode.toUpperCase();
    }

    function updateModeToggleVisual() {
        const toggle = document.querySelector(".ccg-mode-toggle");
        if (!toggle) return;

        const mode = body.getAttribute("data-ccg-mode") || "c64";
        toggle.classList.toggle("ccg-mode-toggle--amiga", mode === "amiga");
        toggle.classList.toggle("ccg-mode-toggle--c64", mode === "c64");
    }

    document.addEventListener("ccg:modeChange", (e) => {
        updateModeLabel();
        updateModeToggleVisual();
    });

    document.addEventListener("DOMContentLoaded", () => {
        updateModeLabel();
        updateModeToggleVisual();
    });

    /* ======================================================
       HEADER "MORE ▾" DROPDOWN — STABLE & ACCESSIBLE
    ====================================================== */

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
            dropdown.classList.contains("is-open")
                ? closeMenu()
                : openMenu();
        }

        moreBtn.addEventListener("click", (e) => {
            e.preventDefault();
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

})();
