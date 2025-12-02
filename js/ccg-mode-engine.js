/* ==========================================================
   CCG MODE ENGINE — UNIVERSAL SYSTEM SWITCHER
   Now supports both data-mode AND CSS class switching.
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
       Apply mode → sets body attribute AND CSS classes
       ------------------------------------------------------- */
    function applyMode(mode) {

        // 1) Store in dataset (your existing system)
        body.dataset.mode = mode;

        // 2) Apply CSS classes for new home.html
        body.classList.remove("ccg-mode-c64", "ccg-mode-amiga", "ccg-mode-zx");

        if (mode === "c64")  body.classList.add("ccg-mode-c64");
        if (mode === "amiga") body.classList.add("ccg-mode-amiga");
        if (mode === "zx")    body.classList.add("ccg-mode-zx");

        // Smooth transition
        body.style.transition = "all 0.35s ease-out";

        // Global mode-change event
        document.dispatchEvent(new CustomEvent("ccg:modeChange", {
            detail: { mode }
        }));
    }

    /* -------------------------------------------------------
       Cycle mode (C64 → Amiga → C64)
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
