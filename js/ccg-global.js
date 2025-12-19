/* ==========================================================
   CCG GLOBAL SCRIPT — UNIVERSAL EFFECTS + OMEGA MODE SUPPORT
   FINAL STABLE BUILD — DEPTH-AWARE LOGO + HEADER DROPDOWN
   ========================================================== */

(function () {
    const body = document.body;

    /* -----------------------------------------------
       HELPER: COMPUTE CORRECT LOGO PATH BY DEPTH
    ----------------------------------------------- */
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
        const folderDepth = Math.max(segments.length - 1, 0);

        let prefix = "";
        for (let i = 0; i < folderDepth; i++) prefix += "../";

        return prefix + "resources/images/ccgamer-logo.png";
    }

    /* -----------------------------------------------
       PAGE FADE-IN
    ----------------------------------------------- */
    document.addEventListener("DOMContentLoaded", () => {
        body.classList.add("ccg-fade-in");
    });

    /* -----------------------------------------------
       LOGO NORMALISER — DEPTH-AWARE
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
       MODE LABEL HANDLER (HOME USES data-ccg-mode-label)
    ----------------------------------------------- */
    function updateModeLabel() {
        const labelEl = document.querySelector("[data-ccg-mode-label]");
        if (!labelEl) return;

        const mode = (document.body.getAttribute("data-ccg-mode") || "c64").toUpperCase();
        labelEl.textContent = mode;
    }

    document.addEventListener("ccg:modeChange", () => {
        updateModeLabel();
    });

    document.addEventListener("DOMContentLoaded", () => {
        updateModeLabel();
    });

    /* -----------------------------------------------
       HEADER "MORE ▾" DROPDOWN — ACCESSIBLE TOGGLE
       Works with CSS fallback (focus-within) too.
    ----------------------------------------------- */
    document.addEventListener("DOMContentLoaded", () => {
        const moreBlocks = document.querySelectorAll(".ccg-nav__more");
        if (!moreBlocks.length) return;

        function closeAll() {
            moreBlocks.forEach(block => {
                const btn = block.querySelector(".ccg-nav__more-btn");
                const dd = block.querySelector(".ccg-nav__dropdown");
                if (!btn || !dd) return;
                dd.classList.remove("is-open");
                btn.setAttribute("aria-expanded", "false");
            });
        }

        moreBlocks.forEach(block => {
            const moreBtn = block.querySelector(".ccg-nav__more-btn");
            const dropdown = block.querySelector(".ccg-nav__dropdown");
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
                if (isOpen) {
                    closeMenu();
                } else {
                    closeAll();
                    openMenu();
                }
            }

            moreBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu();
            });

            dropdown.addEventListener("click", (e) => {
                e.stopPropagation();
            });

            document.addEventListener("click", () => {
                closeMenu();
            });

            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    closeMenu();
                }
            });
        });
    });

})();
