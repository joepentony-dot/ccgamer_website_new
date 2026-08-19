/* ============================================================
   CCG GLOBAL HEADER ACCOUNT LOADER
   ------------------------------------------------------------
   Ensures every public page carrying the shared header restores
   the same authenticated account state before the header auth UI
   is allowed to decide between Profile / Logout and Join / Login.
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
        if (isExcludedPage() || !document.querySelector("[data-ccg-header] .ccg-header-actions")) return;
        ensureCommunityCss();

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

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        void init();
    }
})();
