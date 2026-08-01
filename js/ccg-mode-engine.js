/* ============================================================
   CCG Mode Engine — Safe Unified Build
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const root = document.body;
    const rootElement = document.documentElement;
    const toggle = document.querySelector("[data-ccg-mode-toggle]");
    const hero = document.querySelector(".home-hero");
    const AMIGA_STYLESHEETS = [
        {
            id: "ccg-amiga-mode-styles",
            path: "/resources/css/ccg-amiga-mode.css",
            label: "Amiga visual layer"
        },
        {
            id: "ccg-amiga-mobile-fix-styles",
            path: "/resources/css/ccg-amiga-mobile-fix.css",
            label: "Amiga mobile performance layer"
        }
    ];
    let lastMode = root.getAttribute("data-ccg-mode") || rootElement.getAttribute("data-ccg-mode") || null;
    let lastTouchToggle = 0;
    let modeChangeTimer = 0;
    const supportsPointer = "PointerEvent" in window;

    const heroModeLabel = document.querySelector('[data-ccg-mode-label]');
    const heroBadgeLabel = document.querySelector('[data-ccg-hero-mode-label]');

    function ensureStylesheet({ id, path, label }) {
        if (document.getElementById(id)) return;

        const stylesheet = document.createElement("link");
        stylesheet.id = id;
        stylesheet.rel = "stylesheet";
        stylesheet.href = path;
        stylesheet.addEventListener("error", () => {
            console.warn(`ccg-mode-engine.js: ${label} could not be loaded.`);
        }, { once: true });
        document.head.appendChild(stylesheet);
    }

    function ensureAmigaStyles() {
        AMIGA_STYLESHEETS.forEach(ensureStylesheet);
    }

    function ensureAmigaChrome() {
        if (document.querySelector(".ccg-amiga-chrome")) return;

        const chrome = document.createElement("div");
        chrome.className = "ccg-amiga-chrome";
        chrome.setAttribute("aria-hidden", "true");
        chrome.innerHTML = `
            <div class="ccg-amiga-chrome__copper"></div>
            <div class="ccg-amiga-chrome__checker"></div>
            <div class="ccg-amiga-chrome__boing"></div>
            <div class="ccg-amiga-chrome__status">
                <span class="ccg-amiga-chrome__drive-light"></span>
                <span>16-Bit Workbench</span>
            </div>
        `;
        root.appendChild(chrome);
    }

    function ensureFlash() {
        let flash = document.querySelector(".ccg-mode-flash");
        if (!flash) {
            flash = document.createElement("div");
            flash.className = "ccg-mode-flash";
            flash.setAttribute("aria-hidden", "true");
            root.appendChild(flash);
        }
        return flash;
    }

    function triggerFlash(mode) {
        const flash = ensureFlash();
        const flashClass = mode === "c64" ? "c64-flash" : "amiga-flash";
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const lowPower = Boolean(connection?.saveData) || ["slow-2g", "2g"].includes(connection?.effectiveType);
        const useLite = prefersReducedMotion || lowPower;

        flash.classList.remove("c64-flash", "amiga-flash", "ccg-mode-flash--lite");
        void flash.offsetWidth;
        if (useLite) {
            flash.classList.add("ccg-mode-flash--lite");
            window.setTimeout(() => {
                flash.classList.remove("ccg-mode-flash--lite");
            }, 180);
        } else {
            flash.classList.add(flashClass);
            flash.addEventListener("animationend", () => {
                flash.classList.remove("c64-flash", "amiga-flash");
            }, { once: true });
        }
    }

    function triggerModeBuild(mode) {
        window.clearTimeout(modeChangeTimer);
        rootElement.classList.remove("ccg-mode-entering-c64", "ccg-mode-entering-amiga");
        void rootElement.offsetWidth;
        rootElement.classList.add(mode === "amiga" ? "ccg-mode-entering-amiga" : "ccg-mode-entering-c64");

        modeChangeTimer = window.setTimeout(() => {
            rootElement.classList.remove("ccg-mode-entering-c64", "ccg-mode-entering-amiga");
        }, 760);
    }

    function applyMode(mode) {
        const nextMode = mode === "amiga" ? "amiga" : "c64";
        const changed = Boolean(lastMode && lastMode !== nextMode);

        rootElement.setAttribute("data-ccg-mode", nextMode);
        rootElement.setAttribute("data-mode", nextMode);
        root.setAttribute("data-ccg-mode", nextMode);
        root.setAttribute("data-mode", nextMode);
        if (hero) hero.setAttribute("data-hero-mode", nextMode);
        localStorage.setItem("ccg-mode", nextMode);

        const label = nextMode === "c64" ? "C64" : "Amiga";
        if (heroModeLabel) heroModeLabel.textContent = label;
        if (heroBadgeLabel) heroBadgeLabel.textContent = label;

        if (toggle) {
            toggle.setAttribute("aria-pressed", String(nextMode === "amiga"));
            toggle.setAttribute("aria-label", nextMode === "amiga" ? "Switch to C64 mode" : "Switch to Amiga mode");
            toggle.dataset.ccgActiveMode = nextMode;
        }

        if (changed) {
            triggerModeBuild(nextMode);
            triggerFlash(nextMode);
        }

        lastMode = nextMode;
        window.dispatchEvent(new CustomEvent("ccg:mode-changed", {
            detail: { mode: nextMode }
        }));
    }

    function handleToggle(event) {
        const now = Date.now();
        if (event.type === "pointerdown") {
            if (event.pointerType && !["touch", "pen"].includes(event.pointerType)) return;
            lastTouchToggle = now;
        }

        if (event.type === "touchstart") {
            lastTouchToggle = now;
        }

        if (event.type === "click" && now - lastTouchToggle < 500) return;
        const current = root.getAttribute("data-ccg-mode") === "c64" ? "amiga" : "c64";
        applyMode(current);
    }

    ensureAmigaStyles();
    ensureAmigaChrome();

    if (toggle) {
        toggle.addEventListener("click", handleToggle);
        if (supportsPointer) {
            toggle.addEventListener("pointerdown", handleToggle, { passive: true });
        } else {
            toggle.addEventListener("touchstart", handleToggle, { passive: true });
        }
    } else {
        console.warn("ccg-mode-engine.js: Mode toggle button not found.");
    }

    const saved = localStorage.getItem("ccg-mode");
    applyMode(saved || root.getAttribute("data-ccg-mode") || rootElement.getAttribute("data-ccg-mode") || "c64");
});
