// js/ccg-mode-engine.js
// ==========================================================
// CCG MODE ENGINE — PHASE OMEGA
// - Handles global C64 / Amiga mode switching
// - Persists choice via localStorage
// - Dispatches "ccg:modeChange" so other scripts react
// - No audio / hum references
// ==========================================================

(function () {
    const body = document.body;
    const MODE_KEY = "ccgDisplayMode";
    const DEFAULT_MODE = body.dataset.mode || "c64";

    // -------------------------------
    // Core applyMode helper
    // -------------------------------
    function applyMode(mode, options = {}) {
        if (!mode) mode = DEFAULT_MODE || "c64";

        // Only support c64 / amiga for now (ZX later as Easter egg)
        if (mode !== "c64" && mode !== "amiga") {
            mode = "c64";
        }

        body.dataset.mode = mode;
        document.documentElement.setAttribute("data-theme", mode);

        // Persist
        try {
            localStorage.setItem(MODE_KEY, mode);
        } catch (e) {
            // ignore storage errors
        }

        // Notify listeners (global & CSS already react)
        if (options.announce !== false) {
            const evt = new CustomEvent("ccg:modeChange", {
                detail: { mode }
            });
            document.dispatchEvent(evt);
        }
    }

    // -------------------------------
    // Initialise mode on page load
    // -------------------------------
    function initMode() {
        let saved = null;
        try {
            saved = localStorage.getItem(MODE_KEY);
        } catch (e) {
            saved = null;
        }

        const startMode = saved || DEFAULT_MODE || "c64";

        // Apply once without double-announce
        applyMode(startMode, { announce: false });

        // Then emit a single initial event so listeners can sync
        const evt = new CustomEvent("ccg:modeChange", {
            detail: { mode: startMode }
        });
        document.dispatchEvent(evt);
    }

    // -------------------------------
    // Hook up the toggle button
    // -------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        const toggleBtn = document.getElementById("ccg-mode-toggle");

        if (toggleBtn) {
            toggleBtn.addEventListener("click", () => {
                const current = body.dataset.mode === "amiga" ? "amiga" : "c64";
                const next = current === "c64" ? "amiga" : "c64";
                applyMode(next);
            });
        }

        initMode();
    });

})();
