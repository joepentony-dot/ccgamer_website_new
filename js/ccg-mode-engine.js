/* ============================================================
   CCG MODE ENGINE — FINAL PRODUCTION VERSION
   Supports Omega Cinematic Toggle (C64 / Amiga pill)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const body = document.body;
    const toggle = document.querySelector("[data-ccg-mode-toggle]");

    /* -----------------------------------------
       1) Ensure default mode exists
       ----------------------------------------- */
    if (!body.dataset.ccgMode) {
        body.dataset.ccgMode = "c64";
    }

    let currentMode = body.dataset.ccgMode;

    /* -----------------------------------------
       2) Sync toggle UI immediately
       ----------------------------------------- */
    function applyToggleState(mode) {
        if (!toggle) return;
        toggle.classList.remove("is-c64", "is-amiga");
        toggle.classList.add(mode === "amiga" ? "is-amiga" : "is-c64");
    }

    applyToggleState(currentMode);

    /* -----------------------------------------
       3) Bind toggle click
       ----------------------------------------- */
    if (toggle) {
        toggle.addEventListener("click", () => {
            currentMode = currentMode === "c64" ? "amiga" : "c64";

            // Update attribute
            body.dataset.ccgMode = currentMode;

            // Update visual UI
            applyToggleState(currentMode);
        });
    }

    /* -----------------------------------------
       4) Dispatch custom event (for pages that react)
       ----------------------------------------- */
    const event = new CustomEvent("ccg-mode-ready", {
        detail: { mode: currentMode }
    });
    document.dispatchEvent(event);
});
