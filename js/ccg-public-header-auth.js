/* ============================================================
   CCG PUBLIC HEADER AUTH BOOTSTRAP
   ------------------------------------------------------------
   Ensures the same Join / Login or Profile controls are available
   on every public page using the shared CCG header.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_PUBLIC_HEADER_AUTH_READY) return;
    window.CCG_PUBLIC_HEADER_AUTH_READY = true;

    const path = String(window.location.pathname || "").toLowerCase();
    if (path.startsWith("/admin/") || path.startsWith("/auth/")) return;

    const STEPS = [
        { src: "/js/ccg-supabase-config.js", ready: () => Boolean(window.CCG_SUPABASE_URL) },
        { src: "/js/ccg-supabase-client.js", ready: () => Boolean(window.ccgSupabase) },
        {
            src: "/js/ccg-community-auth.js",
            ready: () => Boolean(window.ccgCommunityAuth),
            activate: () => window.ccgCommunityAuth?.init?.()
        },
        { src: "/js/ccg-auth.js", ready: () => Boolean(window.CCG_AUTH || document.querySelector("#join-login, #ccg-auth-identity")) }
    ];

    function existingScript(src) {
        return Array.from(document.scripts).find((script) => {
            const value = script.getAttribute("src") || "";
            return value === src || value.endsWith(src);
        }) || null;
    }

    function waitUntil(predicate, timeoutMs = 5000) {
        return new Promise((resolve) => {
            const started = Date.now();
            const check = () => {
                if (predicate()) {
                    resolve(true);
                    return;
                }
                if (Date.now() - started >= timeoutMs) {
                    resolve(false);
                    return;
                }
                window.setTimeout(check, 50);
            };
            check();
        });
    }

    async function activateStep(step) {
        if (typeof step.activate !== "function") return;
        try {
            await step.activate();
        } catch (error) {
            console.warn(`[CCG AUTH] Could not activate ${step.src}.`, error);
        }
    }

    async function loadStep(step) {
        if (step.ready()) {
            await activateStep(step);
            return true;
        }

        const existing = existingScript(step.src);
        if (existing) {
            const ready = await waitUntil(step.ready);
            if (ready) await activateStep(step);
            return ready;
        }

        await new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = step.src;
            script.defer = true;
            script.setAttribute("data-ccg-public-auth-loader", "true");
            script.addEventListener("load", resolve, { once: true });
            script.addEventListener("error", resolve, { once: true });
            document.body.appendChild(script);
        });

        const ready = await waitUntil(step.ready, 3500);
        if (ready) await activateStep(step);
        return ready;
    }

    async function init() {
        if (!document.querySelector(".ccg-header .ccg-header-actions")) return;
        for (const step of STEPS) {
            const ready = await loadStep(step);
            if (!ready) {
                console.warn(`[CCG AUTH] Header auth bootstrap stopped at ${step.src}.`);
                return;
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => void init(), { once: true });
    } else {
        void init();
    }
})();
