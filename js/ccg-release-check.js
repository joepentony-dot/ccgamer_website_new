/* ============================================================
   CCG PUBLIC RELEASE CHECK
   ------------------------------------------------------------
   Detects changes to the shared public shell without asking visitors
   to clear their browser cache. The fingerprint is derived from live
   shared assets, so future UI/navigation releases can announce
   themselves even when service-worker.js itself was unchanged.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_RELEASE_CHECK_READY) return;
    window.CCG_RELEASE_CHECK_READY = true;

    const STORAGE_KEY = "ccg_public_release_fingerprint";
    const CHECK_KEY = "ccg_public_release_checked_at";
    const CHECK_INTERVAL = 5 * 60 * 1000;
    const CSS_PATH = "/resources/css/ccg-pwa.css";
    const RELEASE_ASSETS = [
        "/service-worker.js",
        "/js/ccg-nav-core.js",
        "/js/ccg-nav.js",
        "/js/ccg-nav-fit.js",
        "/js/ccg-header-auth-loader.js",
        "/js/ccg-music-config.js",
        "/js/ccg-music-navigation.js",
        "/js/ccg-pwa-visible-install.js",
        "/js/ccg-release-check.js",
        "/resources/css/ccg-nav.css",
        "/resources/css/ccg-socials.css",
        "/resources/css/ccg-master.css",
        "/resources/css/ccg-mode.css"
    ];

    function storageGet(key) {
        try { return window.localStorage.getItem(key); }
        catch (error) { return null; }
    }

    function storageSet(key, value) {
        try { window.localStorage.setItem(key, String(value)); }
        catch (error) {}
    }

    function ensureCss() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_PATH;
        document.head.appendChild(link);
    }

    function isPrivateArea() {
        const path = String(window.location.pathname || "/");
        return ["/admin/", "/community/", "/auth/", "/supabase/"].some((prefix) => path.startsWith(prefix));
    }

    async function digestText(text) {
        if (window.crypto?.subtle && window.TextEncoder) {
            const bytes = new TextEncoder().encode(text);
            const digest = await window.crypto.subtle.digest("SHA-256", bytes);
            return Array.from(new Uint8Array(digest))
                .map((value) => value.toString(16).padStart(2, "0"))
                .join("");
        }

        let hash = 2166136261;
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, "0");
    }

    async function fetchReleaseFingerprint() {
        const parts = [];
        for (const path of RELEASE_ASSETS) {
            const response = await fetch(`${path}?ccg-release-check=${Date.now()}`, {
                cache: "no-store",
                credentials: "same-origin",
                headers: { "cache-control": "no-cache" }
            });
            if (!response.ok) throw new Error(`${path} returned ${response.status}`);
            parts.push(path, await response.text());
        }
        return digestText(parts.join("\n--CCG-RELEASE--\n"));
    }

    function removePanel(panel) {
        if (!panel) return;
        panel.classList.add("is-leaving");
        window.setTimeout(() => panel.remove(), 180);
    }

    async function clearPublicCaches() {
        const registration = await navigator.serviceWorker?.getRegistration?.("/");
        const worker = registration?.waiting || registration?.active || navigator.serviceWorker?.controller;
        worker?.postMessage?.({ type: "CLEAR_PUBLIC_CACHES" });
        try { await registration?.update?.(); } catch (error) {}
        return registration;
    }

    async function activateRelease(button, fingerprint, panel) {
        button.disabled = true;
        button.textContent = "Updating…";

        const registration = await clearPublicCaches();
        storageSet(STORAGE_KEY, fingerprint);

        if (registration?.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
            let reloaded = false;
            navigator.serviceWorker?.addEventListener?.("controllerchange", () => {
                if (reloaded) return;
                reloaded = true;
                window.location.reload();
            }, { once: true });
            window.setTimeout(() => {
                if (!reloaded) window.location.reload();
            }, 1400);
            return;
        }

        removePanel(panel);
        window.location.reload();
    }

    function showUpdatePanel(fingerprint) {
        if (document.querySelector("[data-ccg-release-update]")) return;
        ensureCss();

        const panel = document.createElement("aside");
        panel.className = "ccg-pwa-panel ccg-pwa-panel--update";
        panel.dataset.ccgReleaseUpdate = "true";
        panel.setAttribute("role", "region");
        panel.setAttribute("aria-label", "CCG update ready");

        const copy = document.createElement("div");
        copy.className = "ccg-pwa-panel__copy";

        const title = document.createElement("strong");
        title.className = "ccg-pwa-panel__title";
        title.textContent = "CCG update ready";

        const message = document.createElement("p");
        message.className = "ccg-pwa-panel__message";
        message.textContent = "A newer version of the CCG website is available. Reload to use the latest navigation, layout and shared features.";

        const actions = document.createElement("div");
        actions.className = "ccg-pwa-panel__actions";

        const update = document.createElement("button");
        update.type = "button";
        update.className = "ccg-pwa-button ccg-pwa-button--primary";
        update.textContent = "Reload now";
        update.addEventListener("click", () => void activateRelease(update, fingerprint, panel));

        const later = document.createElement("button");
        later.type = "button";
        later.className = "ccg-pwa-button";
        later.textContent = "Later";
        later.addEventListener("click", () => removePanel(panel));

        copy.append(title, message);
        actions.append(update, later);
        panel.append(copy, actions);
        document.body.appendChild(panel);
        window.requestAnimationFrame(() => panel.classList.add("is-visible"));
    }

    async function checkRelease() {
        if (isPrivateArea() || !navigator.onLine) return;

        const lastChecked = Number.parseInt(storageGet(CHECK_KEY) || "0", 10);
        if (Number.isFinite(lastChecked) && Date.now() - lastChecked < CHECK_INTERVAL) return;
        storageSet(CHECK_KEY, Date.now());

        try {
            const fingerprint = await fetchReleaseFingerprint();
            const previous = storageGet(STORAGE_KEY);

            if (!previous) {
                storageSet(STORAGE_KEY, fingerprint);
                return;
            }

            if (previous !== fingerprint) showUpdatePanel(fingerprint);
        } catch (error) {
            console.warn("[ccg-release-check] Release fingerprint unavailable", error);
        }
    }

    function init() {
        void checkRelease();
        window.addEventListener("focus", () => void checkRelease(), { passive: true });
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") void checkRelease();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
