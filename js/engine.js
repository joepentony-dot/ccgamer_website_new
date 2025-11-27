// ==========================================
// CHEEKY COMMODORE GAMER - ENGINE JS (V1)
// Boot screen, theme toggle, small helpers
// ==========================================

(function () {
    function byId(id) {
        return document.getElementById(id);
    }

    // -------------------------------
    // Theme toggle (C64 / Amiga)
    // -------------------------------
    function initThemeToggle() {
        const root = document.documentElement;
        const btn = byId("theme-toggle");
        if (!btn) return;

        const STORAGE_KEY = "ccg-theme";

        function applyTheme(theme) {
            const t = theme === "amiga" ? "amiga" : "c64";
            root.setAttribute("data-theme", t);
            btn.textContent = t === "c64" ? "C64 MODE" : "AMIGA MODE";
        }

        const saved = localStorage.getItem(STORAGE_KEY) || "c64";
        applyTheme(saved);

        btn.addEventListener("click", () => {
            const current = root.getAttribute("data-theme") || "c64";
            const next = current === "c64" ? "amiga" : "c64";
            applyTheme(next);
            localStorage.setItem(STORAGE_KEY, next);
        });
    }

    // -------------------------------
    // Boot screen / raster intro
    // -------------------------------
    function initBootScreen() {
        const startScreen = byId("start-screen");
        const bootLog = byId("boot-log");
        const pressSpace = byId("press-space");
        if (!startScreen || !bootLog || !pressSpace) return;

        const audio = byId("boot-audio"); // optional audio element

        const lines = [
            " *** COMMODORE 64 BASIC V2 ***",
            " 64K RAM SYSTEM  38911 BASIC BYTES FREE",
            "",
            "READY.",
            "",
            "LOAD \"CHEEKY COMMODORE GAMER\",8,1",
            "SEARCHING FOR CHEEKY COMMODORE GAMER",
            "LOADING",
            "READY.",
            "",
            "RUN",
            ""
        ];

        let lineIndex = 0;

        function appendLine() {
            if (lineIndex >= lines.length) {
                pressSpace.classList.add("visible");
                return;
            }
            bootLog.textContent += lines[lineIndex] + "\n";
            lineIndex++;
            setTimeout(appendLine, 280);
        }

        function finishBoot() {
            if (!startScreen.classList.contains("active")) return;
            startScreen.classList.remove("active");
            startScreen.style.opacity = "0";
            setTimeout(() => {
                startScreen.style.display = "none";
            }, 350);

            if (audio && typeof audio.play === "function") {
                audio.volume = 0.85;
                audio.play().catch(() => {
                    // Autoplay might be blocked; ignore
                });
            }
        }

        // Mark active so we don't double-run
        startScreen.classList.add("active");
        bootLog.textContent = "";
        pressSpace.classList.remove("visible");

        setTimeout(appendLine, 300);

        function keyHandler(ev) {
            if (ev.key === " " || ev.key === "Enter" || ev.key === "Escape") {
                ev.preventDefault();
                finishBoot();
            }
        }

        function clickHandler() {
            finishBoot();
        }

        document.addEventListener("keydown", keyHandler);
        startScreen.addEventListener("click", clickHandler);
    }

    // -------------------------------
    // Cursor / other tiny fixes
    // -------------------------------
    function initCursorFix() {
        // You mentioned the cursor "disappearing in centre".
        // Here we force default on body for safety.
        document.body.style.cursor = "default";
    }

    // -------------------------------
    // DOM Ready
    // -------------------------------
    function init() {
        initThemeToggle();
        initBootScreen();
        initCursorFix();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
