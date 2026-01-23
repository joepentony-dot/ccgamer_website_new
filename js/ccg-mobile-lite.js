/* ============================================================
   CCG MOBILE LITE MODE
   • Desktop untouched
   • Mobile performance first
============================================================ */
(function () {
    const root = document.documentElement;
    const isMobile =
        window.matchMedia("(max-width: 900px)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        window.matchMedia("(pointer: coarse)").matches;

    if (isMobile) {
        root.classList.add("ccg-mobile-lite", "ccg-mobile-defer-visuals");
    }

    const markVisualsReady = () => {
        if (!root.classList.contains("ccg-visuals-ready")) {
            root.classList.add("ccg-visuals-ready");
        }
        root.classList.remove("ccg-mobile-defer-visuals");
        document.dispatchEvent(new Event("ccg-visuals-ready"));
    };

    const scheduleVisuals = () => {
        if (isMobile) {
            if ("requestIdleCallback" in window) {
                window.requestIdleCallback(() => {
                    requestAnimationFrame(markVisualsReady);
                }, { timeout: 1200 });
            } else {
                requestAnimationFrame(() => {
                    setTimeout(markVisualsReady, 180);
                });
            }
        } else {
            requestAnimationFrame(markVisualsReady);
        }
    };

    const loadDeferredScripts = () => {
        const deferred = Array.from(document.querySelectorAll("script[data-ccg-defer]"));
        if (!deferred.length) return;

        deferred.forEach((script) => {
            const src = script.dataset.ccgSrc || script.getAttribute("data-ccg-src");
            if (!src) return;

            const newScript = document.createElement("script");
            newScript.src = src;
            if (script.hasAttribute("data-ccg-defer")) {
                newScript.setAttribute("data-ccg-defer", script.getAttribute("data-ccg-defer") || "");
            }
            if (script.hasAttribute("data-ccg-scope")) {
                newScript.setAttribute("data-ccg-scope", script.getAttribute("data-ccg-scope"));
            }
            newScript.defer = true;
            document.body.appendChild(newScript);
        });
    };

    const scheduleDeferredScripts = () => {
        if (!isMobile) {
            loadDeferredScripts();
            return;
        }

        const runDeferred = () => {
            if ("requestIdleCallback" in window) {
                window.requestIdleCallback(loadDeferredScripts, { timeout: 2000 });
            } else {
                setTimeout(loadDeferredScripts, 400);
            }
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", runDeferred, { once: true });
        } else {
            runDeferred();
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", scheduleVisuals, { once: true });
    } else {
        scheduleVisuals();
    }

    scheduleDeferredScripts();
})();
