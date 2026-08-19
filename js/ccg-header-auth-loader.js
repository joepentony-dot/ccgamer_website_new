/* ============================================================
   CCG GLOBAL HEADER ACCOUNT + ACTIONS LOADER
   ------------------------------------------------------------
   Ensures every public page carrying the shared header restores
   the same authenticated account state and presents the same mode,
   social and account action contract. Older public pages are upgraded
   in place instead of keeping their own partial header variants.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_HEADER_AUTH_LOADER_READY) return;
    window.CCG_HEADER_AUTH_LOADER_READY = true;

    const AUTH_FOUNDATION_SCRIPTS = [
        "/js/ccg-supabase-config.js",
        "/js/ccg-supabase-client.js",
        "/js/ccg-community-auth.js"
    ];
    const HEADER_AUTH_SCRIPT = "/js/ccg-auth.js";
    const REQUIRED_CSS = [
        "/resources/css/ccg-community.css",
        "/resources/css/ccg-socials.css"
    ];
    const SOCIALS = [
        ["https://www.youtube.com/@CheekyCommodoreGamer", "YouTube", "ccg-socials__icon--yt"],
        ["https://patreon.com/CheekyCommodoreGamer", "Patreon", "ccg-socials__icon--patreon"],
        ["https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL", "PayPal", "ccg-socials__icon--paypal"],
        ["https://twitter.com/CheekyC64Gamer", "X/Twitter", "ccg-socials__icon--x"],
        ["https://www.facebook.com/cheekycommodoregamer", "Facebook", "ccg-socials__icon--fb"],
        ["https://discord.gg/83Xw9ktAn4", "Discord", "ccg-socials__icon--discord"]
    ];

    function isExcludedPage() {
        return /^\/(admin|auth)(?:\/|$)/i.test(window.location.pathname || "");
    }

    function normalizePath(value) {
        try {
            return new URL(value, window.location.origin).pathname;
        } catch (error) {
            return String(value || "");
        }
    }

    function ensureRequiredCss() {
        REQUIRED_CSS.forEach((href) => {
            const exists = Array.from(document.querySelectorAll("link[rel='stylesheet']"))
                .some((link) => normalizePath(link.getAttribute("href")) === href);
            if (exists) return;
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            link.dataset.ccgHeaderActionStyle = "true";
            document.head.appendChild(link);
        });
    }

    function buildSocials() {
        const socials = document.createElement("div");
        socials.className = "ccg-header-socials";
        socials.setAttribute("aria-label", "Social links");

        SOCIALS.forEach(([href, label, iconClass]) => {
            const link = document.createElement("a");
            link.href = href;
            link.setAttribute("aria-label", label);

            const icon = document.createElement("span");
            icon.className = `ccg-socials__icon ${iconClass}`;
            link.appendChild(icon);
            socials.appendChild(link);
        });

        return socials;
    }

    function ensureSharedHeaderActions() {
        const header = document.querySelector("[data-ccg-header]");
        if (!header) return null;

        let actions = header.querySelector(".ccg-header-actions");
        if (!actions) {
            actions = document.createElement("div");
            actions.className = "ccg-header-actions";
            const inner = header.querySelector(".ccg-header-inner");
            if (!inner) return null;
            inner.appendChild(actions);
        }

        const modeToggle = actions.querySelector("[data-ccg-mode-toggle]");
        if (modeToggle && !actions.querySelector(".ccg-mode-hint")) {
            const hint = document.createElement("div");
            hint.className = "ccg-mode-hint";
            hint.textContent = "Try different modes";
            actions.insertBefore(hint, modeToggle);
        }

        if (!actions.querySelector(".ccg-header-socials")) {
            const fallback = actions.querySelector(".ccg-socials-fallback");
            actions.insertBefore(buildSocials(), fallback || null);
        }

        actions.querySelectorAll(".ccg-socials-fallback").forEach((fallback) => {
            fallback.setAttribute("aria-hidden", "true");
            fallback.hidden = true;
        });

        header.dataset.ccgSharedActionsReady = "true";
        document.dispatchEvent(new CustomEvent("ccg:header-actions-ready", { detail: { header, actions } }));
        return actions;
    }

    function existingScript(src) {
        return Array.from(document.scripts).find((script) => normalizePath(script.getAttribute("src")) === src) || null;
    }

    function loadScript(src) {
        const existing = existingScript(src);
        if (existing) {
            if (existing.dataset.ccgLoaded === "true" || existing.readyState === "complete") return Promise.resolve();
            return new Promise((resolve) => {
                existing.addEventListener("load", resolve, { once: true });
                window.setTimeout(resolve, 1500);
            });
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = false;
            script.dataset.ccgHeaderAuthDependency = "true";
            script.addEventListener("load", () => {
                script.dataset.ccgLoaded = "true";
                resolve();
            }, { once: true });
            script.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
            document.body.appendChild(script);
        });
    }

    async function restoreAuthFoundation() {
        for (const src of AUTH_FOUNDATION_SCRIPTS) {
            await loadScript(src);
        }

        if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.init === "function") {
            await window.ccgCommunityAuth.init();
        } else if (window.ccgSupabase && typeof window.ccgSupabase.waitForSessionReady === "function") {
            await window.ccgSupabase.waitForSessionReady();
        }
    }

    async function init() {
        if (isExcludedPage() || !document.querySelector("[data-ccg-header]")) return;
        ensureRequiredCss();
        const actions = ensureSharedHeaderActions();
        if (!actions) return;

        try {
            await restoreAuthFoundation();
            await loadScript(HEADER_AUTH_SCRIPT);

            if (window.CCGHeaderAuth && typeof window.CCGHeaderAuth.init === "function") {
                await window.CCGHeaderAuth.init();
            } else if (window.CCGHeaderAuth && typeof window.CCGHeaderAuth.refresh === "function") {
                await window.CCGHeaderAuth.refresh();
            }
        } catch (error) {
            console.warn("[CCG] Header account controls could not be initialised on this page.", error);
        }
    }

    window.CCGHeaderActions = Object.freeze({
        ensure: ensureSharedHeaderActions
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        void init();
    }
})();
