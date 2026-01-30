/* ============================================================
   CCG Mode Engine — Safe Unified Build
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const root = document.body;
    const rootElement = document.documentElement;
    const toggle = document.querySelector("[data-ccg-mode-toggle]");
    const hero = document.querySelector(".home-hero");
    let lastMode = root.getAttribute("data-ccg-mode");
    let lastTouchToggle = 0;
    const supportsPointer = "PointerEvent" in window;

    if (!toggle) {
        console.warn("ccg-mode-engine.js: Mode toggle button not found.");
        return;
    }

    const heroModeLabel = document.querySelector('[data-ccg-mode-label]');
    const heroBadgeLabel = document.querySelector('[data-ccg-hero-mode-label]');

    function ensureFlash() {
        let flash = document.querySelector(".ccg-mode-flash");
        if (!flash) {
            flash = document.createElement("div");
            flash.className = "ccg-mode-flash";
            flash.setAttribute("aria-hidden", "true");
            document.body.appendChild(flash);
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

    function applyMode(mode) {
        rootElement.setAttribute("data-ccg-mode", mode);
        rootElement.setAttribute("data-mode", mode);
        root.setAttribute("data-ccg-mode", mode);
        root.setAttribute("data-mode", mode);
        if (hero) hero.setAttribute("data-hero-mode", mode);
        localStorage.setItem("ccg-mode", mode);

        const label = mode === "c64" ? "C64" : "Amiga";
        if (heroModeLabel) heroModeLabel.textContent = label;
        if (heroBadgeLabel) heroBadgeLabel.textContent = label;

        if (lastMode && lastMode !== mode) {
            triggerFlash(mode);
        }
        lastMode = mode;
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

    toggle.addEventListener("click", handleToggle);
    if (supportsPointer) {
        toggle.addEventListener("pointerdown", handleToggle, { passive: true });
    } else {
        toggle.addEventListener("touchstart", handleToggle, { passive: true });
    }

    const saved = localStorage.getItem("ccg-mode");
    applyMode(saved || root.getAttribute("data-ccg-mode") || "c64");
});
