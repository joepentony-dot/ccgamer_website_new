/* ============================================================
   CCG GLOBAL HEADER ACCOUNT LOADER
   ------------------------------------------------------------
   Ensures every public page carrying the shared header can show
   the same Join / Login, Profile and Logout controls without
   requiring each generated page to duplicate the auth stack.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_HEADER_AUTH_LOADER_READY) return;
    window.CCG_HEADER_AUTH_LOADER_READY = true;

    const AUTH_SCRIPTS = [
        "/js/ccg-supabase-config.js",
        "/js/ccg-supabase-client.js",
        "/js/ccg-community-auth.js",
        "/js/ccg-auth.js"
    ];
    const COMMUNITY_CSS = "/resources/css/ccg-community.css";

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

    function ensureCommunityCss() {
        const exists = Array.from(document.querySelectorAll("link[rel='stylesheet']"))
            .some((link) => normalizePath(link.getAttribute("href")) === COMMUNITY_CSS);
        if (exists) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = COMMUNITY_CSS;
        document.head.appendChild(link);
    }

    function existingScript(src) {
        return Array.from(document.scripts).find((script) => normalizePath(script.getAttribute("src")) === src) || null;
    }

    function loadScript(src) {
        if (existingScript(src)) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = false;
            script.dataset.ccgHeaderAuthDependency = "true";
            script.addEventListener("load", resolve, { once: true });
            script.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
            document.body.appendChild(script);
        });
    }

    async function init() {
        if (isExcludedPage() || !document.querySelector("[data-ccg-header] .ccg-header-actions")) return;
        ensureCommunityCss();

        try {
            for (const src of AUTH_SCRIPTS) {
                await loadScript(src);
            }

            if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.init === "function") {
                await window.ccgCommunityAuth.init();
            }
            if (window.CCGHeaderAuth && typeof window.CCGHeaderAuth.refresh === "function") {
                await window.CCGHeaderAuth.refresh();
            }
        } catch (error) {
            console.warn("[CCG] Header account controls could not be initialised on this page.", error);
        }
    }

    if (document.querySelector("[data-ccg-header] .ccg-header-actions")) {
        void init();
    } else if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => void init(), { once: true });
    } else {
        void init();
    }
})();
