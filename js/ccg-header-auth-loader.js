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
        {
            src: "/js/ccg-supabase-config.js",
            ready: () => Boolean(window.CCG_SUPABASE_URL && window.CCG_SUPABASE_ANON_KEY)
        },
        {
            src: "/js/ccg-supabase-client.js",
            ready: () => Boolean(window.ccgSupabase && typeof window.ccgSupabase.getClient === "function")
        },
        {
            src: "/js/ccg-community-auth.js",
            ready: () => Boolean(window.ccgCommunityAuth && typeof window.ccgCommunityAuth.init === "function")
        },
        {
            src: "/js/ccg-auth.js",
            ready: () => Boolean(window.CCGHeaderAuth && typeof window.CCGHeaderAuth.refresh === "function")
        }
    ];
    const COMMUNITY_CSS = "/resources/css/ccg-community.css";
    const READY_TIMEOUT = 10000;

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

    function waitForReady(check, label) {
        if (check()) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const started = Date.now();
            const timer = window.setInterval(() => {
                if (check()) {
                    window.clearInterval(timer);
                    resolve();
                    return;
                }
                if (Date.now() - started >= READY_TIMEOUT) {
                    window.clearInterval(timer);
                    reject(new Error(`Timed out waiting for ${label}`));
                }
            }, 40);
        });
    }

    function loadScript(entry) {
        const { src, ready } = entry;
        if (ready()) return Promise.resolve();

        const existing = existingScript(src);
        if (existing) {
            return new Promise((resolve, reject) => {
                let settled = false;
                const finish = () => {
                    if (settled) return;
                    settled = true;
                    waitForReady(ready, src).then(resolve, reject);
                };
                existing.addEventListener("load", finish, { once: true });
                existing.addEventListener("error", () => {
                    if (settled) return;
                    settled = true;
                    reject(new Error(`Unable to load ${src}`));
                }, { once: true });
                window.setTimeout(finish, 0);
            });
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = false;
            script.dataset.ccgHeaderAuthDependency = "true";
            script.addEventListener("load", () => {
                waitForReady(ready, src).then(resolve, reject);
            }, { once: true });
            script.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
            document.body.appendChild(script);
        });
    }

    async function init() {
        if (isExcludedPage() || !document.querySelector("[data-ccg-header] .ccg-header-actions")) return;
        ensureCommunityCss();

        if (window.CCGHeaderAuth && typeof window.CCGHeaderAuth.prime === "function") {
            window.CCGHeaderAuth.prime();
        }

        try {
            for (const entry of AUTH_SCRIPTS) {
                await loadScript(entry);
            }

            if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.init === "function") {
                await window.ccgCommunityAuth.init();
            }

            window.dispatchEvent(new CustomEvent("ccg:header-auth-dependencies-ready"));

            if (window.CCGHeaderAuth && typeof window.CCGHeaderAuth.refresh === "function") {
                await window.CCGHeaderAuth.refresh();
            }
        } catch (error) {
            console.warn("[CCG] Header account controls could not be initialised on this page.", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
