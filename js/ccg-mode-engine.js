/* ============================================================
   CCG MODE ENGINE — FIXED ICON PATHS + ERROR HANDLING
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const toggle = document.querySelector("[data-ccg-mode-toggle], #ccgModeToggle");
    if (!toggle) {
        console.warn("ccg-mode-engine.js: Mode toggle button not found.");
        return;
    }

    const body = document.body;
    const current = body.dataset.ccgMode || "c64";

    const ICON_PATH = (pageDepth => {
        switch (pageDepth) {
            case 0: return "resources/images/icons/";
            case 1: return "../resources/images/icons/";
            case 2: return "../../resources/images/icons/";
            default: return "../resources/images/icons/";
        }
    })(document.location.pathname.split("/").length - 2);

    const C64_ICON = ICON_PATH + "mode-c64.png";
    const AMIGA_ICON = ICON_PATH + "mode-amiga.png";

    const toggleIcon = toggle.querySelector("img");
    if (toggleIcon) toggleIcon.src = current === "c64" ? C64_ICON : AMIGA_ICON;

    toggle.addEventListener("click", () => {
        const newMode = body.dataset.ccgMode === "c64" ? "amiga" : "c64";
        body.dataset.ccgMode = newMode;

        if (toggleIcon) {
            toggleIcon.src = newMode === "c64" ? C64_ICON : AMIGA_ICON;
        }
    });

});
