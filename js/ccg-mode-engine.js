(function () {

    const MODE_KEY = "ccg-preferred-mode";

    // Apply mode at startup
    function applyMode(mode) {
        document.body.classList.remove("c64-mode", "amiga-mode");
        document.body.classList.add(mode);
        localStorage.setItem(MODE_KEY, mode);
    }

    // Load previous mode or default to C64
    function initMode() {
        const saved = localStorage.getItem(MODE_KEY) || "c64-mode";
        applyMode(saved);
    }

    // Toggle mode on logo click
    function toggleMode() {
        const current = document.body.classList.contains("c64-mode")
            ? "c64-mode"
            : "amiga-mode";

        const next = current === "c64-mode"
            ? "amiga-mode"
            : "c64-mode";

        document.body.classList.add("mode-transition");
        setTimeout(() => {
            applyMode(next);
            document.body.classList.remove("mode-transition");
        }, 300);
    }

    // Event listener for logo click
    document.addEventListener("click", e => {
        const logo = e.target.closest(".ccg-logo");
        if (!logo) return;
        toggleMode();
    });

    initMode();
})();
