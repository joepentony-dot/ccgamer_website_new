/* ============================================================
   CCG MODE ENGINE — FINAL FIXED VERSION
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const body = document.body;
    const toggle = document.querySelector("[data-ccg-mode-toggle]");

    if (!toggle) return;

    // Ensure initial state matches body attribute
    const current = body.dataset.ccgMode || "c64";
    toggle.classList.add(current === "amiga" ? "is-amiga" : "is-c64");

    toggle.addEventListener("click", () => {
        const mode = body.dataset.ccgMode === "c64" ? "amiga" : "c64";

        // Update body attribute
        body.dataset.ccgMode = mode;

        // Update toggle pill UI
        toggle.classList.remove("is-c64", "is-amiga");
        toggle.classList.add(mode === "amiga" ? "is-amiga" : "is-c64");
    });
});
