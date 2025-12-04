/* ============================================================
   CCG MODE ENGINE — FINAL PRODUCTION VERSION
   Supports Omega Cinematic Toggle (C64 / Amiga pill)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const toggle = document.querySelector("[data-ccg-mode-toggle]");
    const MODE_KEY = "ccg-preferred-mode";

    function normalize(mode) {
        return mode === "amiga" ? "amiga" : "c64";
    }

    function readPreferredMode() {
        const stored = localStorage.getItem(MODE_KEY);
        if (stored) return normalize(stored);
        if (body.dataset.ccgMode) return normalize(body.dataset.ccgMode);
        return "c64";
    }

    function applyToggleState(mode) {
        if (!toggle) return;
        toggle.classList.toggle("is-amiga", mode === "amiga");
        toggle.classList.toggle("is-c64", mode !== "amiga");
    }

    function applyMode(mode, { emit = true } = {}) {
        const current = normalize(mode);
        body.dataset.ccgMode = current;
        body.dataset.mode = current; // legacy hook for existing scripts
        localStorage.setItem(MODE_KEY, current);
        applyToggleState(current);

        if (emit) {
            document.dispatchEvent(
                new CustomEvent("ccg:modeChange", { detail: { mode: current } })
            );
        }
    }

    const initialMode = readPreferredMode();
    applyMode(initialMode, { emit: false });

    document.dispatchEvent(new CustomEvent("ccg-mode-ready", { detail: { mode: initialMode } }));
    document.dispatchEvent(new CustomEvent("ccg:modeChange", { detail: { mode: initialMode } }));

    if (toggle) {
        toggle.addEventListener("click", () => {
            const nextMode = body.dataset.ccgMode === "amiga" ? "c64" : "amiga";
            applyMode(nextMode);
        });
    }
});
