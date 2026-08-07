/* ============================================================
   CCG Mode Engine — Global Single-Owner Controller
   ============================================================ */

(function () {
    "use strict";

    if (window.CCGModeEngine && typeof window.CCGModeEngine.refresh === "function") {
        window.CCGModeEngine.refresh();
        return;
    }

    const rootElement = document.documentElement;
    const EXCLUDED_PATH = /^\/(admin|auth|community)\//i;
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

    let initialized = false;
    let lastMode = null;
    let modeChangeTimer = 0;

    function normalizeMode(mode) {
        return String(mode || "").toLowerCase() === "amiga" ? "amiga" : "c64";
    }

    function readStoredMode() {
        try {
            const saved = localStorage.getItem("ccg-mode");
            return saved === "amiga" || saved === "c64" ? saved : "";
        } catch (error) {
            return "";
        }
    }

    function writeStoredMode(mode) {
        try {
            localStorage.setItem("ccg-mode", mode);
        } catch (error) {}
    }

    function getMode() {
        const body = document.body;
        const value = body?.getAttribute("data-ccg-mode")
            || rootElement.getAttribute("data-ccg-mode")
            || body?.getAttribute("data-mode")
            || rootElement.getAttribute("data-mode")
            || readStoredMode()
            || "c64";
        return normalizeMode(value);
    }

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
        const body = document.body;
        if (!body || document.querySelector(".ccg-amiga-chrome")) return;

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
        body.appendChild(chrome);
    }

    function ensureFlash() {
        const body = document.body;
        if (!body) return null;
        let flash = document.querySelector(".ccg-mode-flash");
        if (!flash) {
            flash = document.createElement("div");
            flash.className = "ccg-mode-flash";
            flash.setAttribute("aria-hidden", "true");
            body.appendChild(flash);
        }
        return flash;
    }

    function triggerFlash(mode) {
        const flash = ensureFlash();
        if (!flash) return;
        const flashClass = mode === "c64" ? "c64-flash" : "amiga-flash";
        const prefersReducedMotion = typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

    function syncModeControls(mode) {
        const label = mode === "c64" ? "C64" : "Amiga";
        document.querySelectorAll("[data-ccg-mode-label]").forEach((element) => {
            element.textContent = label;
        });
        document.querySelectorAll("[data-ccg-hero-mode-label]").forEach((element) => {
            element.textContent = label;
        });
        document.querySelectorAll("[data-ccg-mode-toggle]").forEach((toggle) => {
            toggle.setAttribute("aria-pressed", String(mode === "amiga"));
            toggle.setAttribute("aria-label", mode === "amiga" ? "Switch to C64 mode" : "Switch to Amiga mode");
            toggle.dataset.ccgActiveMode = mode;
            toggle.dataset.ccgModeOwner = "engine";
        });
        document.querySelectorAll(".home-hero").forEach((hero) => {
            hero.setAttribute("data-hero-mode", mode);
        });
    }

    function applyMode(mode, options = {}) {
        const body = document.body;
        if (!body) return normalizeMode(mode);

        const nextMode = normalizeMode(mode);
        const changed = Boolean(lastMode && lastMode !== nextMode);
        const persist = options.persist !== false;
        const animate = options.animate !== false;
        const announce = options.announce !== false;

        rootElement.setAttribute("data-ccg-mode", nextMode);
        rootElement.setAttribute("data-mode", nextMode);
        body.setAttribute("data-ccg-mode", nextMode);
        body.setAttribute("data-mode", nextMode);
        if (persist) writeStoredMode(nextMode);
        syncModeControls(nextMode);

        if (changed && animate) {
            triggerModeBuild(nextMode);
            triggerFlash(nextMode);
        }

        lastMode = nextMode;
        if (announce) {
            window.dispatchEvent(new CustomEvent("ccg:mode-changed", {
                detail: { mode: nextMode }
            }));
        }
        return nextMode;
    }

    function toggleMode() {
        return applyMode(getMode() === "amiga" ? "c64" : "amiga");
    }

    function refresh() {
        if (!document.body) return "";
        const current = getMode();
        syncModeControls(current);
        return current;
    }

    function handleToggleClick(event) {
        const target = event.target instanceof Element
            ? event.target.closest("[data-ccg-mode-toggle]")
            : null;
        if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") return;

        event.preventDefault();
        event.stopImmediatePropagation();
        toggleMode();
    }

    function init() {
        if (initialized || EXCLUDED_PATH.test(window.location.pathname)) return;
        if (!document.body) return;
        initialized = true;

        ensureAmigaStyles();
        ensureAmigaChrome();
        document.addEventListener("click", handleToggleClick, true);

        const initialMode = readStoredMode()
            || document.body.getAttribute("data-ccg-mode")
            || rootElement.getAttribute("data-ccg-mode")
            || "c64";
        applyMode(initialMode, { animate: false, announce: false });
    }

    const controller = Object.freeze({
        get ready() {
            return initialized;
        },
        applyMode,
        toggleMode,
        getMode,
        refresh
    });
    window.CCGModeEngine = controller;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
