/* ============================================================
   CCG MOBILE LITE MODE
   • Desktop untouched
   • Mobile performance first
============================================================ */
(function () {
    const root = document.documentElement;

    const revealPrefilledSingleGame = () => {
        if (root.getAttribute("data-ccg-page") !== "single-game") return;

        const heroTitle = document.getElementById("gameHeroTitle");
        if (!heroTitle || !heroTitle.textContent.trim()) return;

        if (document.body) {
            document.body.classList.remove("ccg-loading-single");
            document.body.classList.add("ccg-single-ready");
        }
    };

    const ensureSingleGameViewportModalRoot = () => {
        if (root.getAttribute("data-ccg-page") !== "single-game") return;
        if (!document.body) return;

        const modal = document.getElementById("ccgModal");
        if (!modal || modal.parentElement === document.body) return;

        // Keep the shared screenshot / 3D-box modal outside transformed or
        // contained page wrappers so position: fixed is always relative to the
        // current viewport instead of a scrolled document section.
        document.body.appendChild(modal);
        modal.dataset.ccgViewportRoot = "true";
    };

    // Canonical /games/<slug>/ pages are prefilled in the HTML. The shared
    // single-game CSS hides pages until ccg-single-ready is present, so reveal
    // prefilled pages immediately. The dynamic game.html shell has an empty H1
    // and therefore keeps its existing loader-controlled reveal behaviour.
    revealPrefilledSingleGame();
    ensureSingleGameViewportModalRoot();

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
        if (document.querySelector(".ccg-hud-dock")) {
            root.classList.add("ccg-hud-dock-ready");
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
        document.addEventListener("DOMContentLoaded", () => {
            ensureSingleGameViewportModalRoot();
            scheduleVisuals();
        }, { once: true });
    } else {
        ensureSingleGameViewportModalRoot();
        scheduleVisuals();
    }

    scheduleDeferredScripts();
})();