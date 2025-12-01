/* ==========================================================
   CCG MODE ENGINE — UNIVERSAL SYSTEM SWITCHER
   Supports: C64 / Amiga / ZX Dev Lab (Easter Egg)
   ========================================================== */

window.CCGModeEngine = (function () {

    const body = document.body;
    const audio = new Audio("resources/audio/crt_hum_loop.mp3");
    audio.loop = true;
    audio.volume = 0.18;

    /* Start ambience when user interacts */
    window.addEventListener("click", () => {
        if (audio.paused) {
            audio.play().catch(() => {});
        }
    }, { once: true });

    /* -------------------------------------------------------
       Get current mode
       ------------------------------------------------------- */
    function getMode() {
        return body.dataset.mode || "c64";
    }

    /* -------------------------------------------------------
       Apply mode → sets body attribute + emits events
       ------------------------------------------------------- */
    function applyMode(mode) {
        body.dataset.mode = mode;

        // Global CSS transition smoother
        body.style.transition = "all 0.35s ease-out";

        // Custom global event for all pages
        document.dispatchEvent(new CustomEvent("ccg:modeChange", {
            detail: { mode }
        }));
    }

    /* -------------------------------------------------------
       Cycle mode (C64 → Amiga → C64 unless ZX triggered)
       ------------------------------------------------------- */
    function toggleMode() {
        const current = getMode();
        let next = "amiga";
        if (current === "amiga") next = "c64";
        if (current === "zx") next = "c64";
        applyMode(next);
    }

    /* -------------------------------------------------------
       Explicit setter (used by home.html)
       ------------------------------------------------------- */
    function setMode(mode) {
        applyMode(mode);
    }

    /* -------------------------------------------------------
       PUBLIC API
       ------------------------------------------------------- */
    return {
        setMode,
        toggleMode,
        getMode
    };

})();
