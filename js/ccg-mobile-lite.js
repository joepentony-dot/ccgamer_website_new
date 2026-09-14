/* ============================================================
   CCG MOBILE LITE MODE
   • Desktop untouched
   • Mobile performance first
============================================================ */
(function () {
    const root = document.documentElement;

    let legacyRetailerCommissionUiInitialPassDone = false;

    const retireLegacyRetailerCommissionUi = ({ force = false } = {}) => {
        if (!document.body) return;
        if (!force && legacyRetailerCommissionUiInitialPassDone) return;
        legacyRetailerCommissionUiInitialPassDone = true;

        document.querySelectorAll("#affiliate-products-section").forEach((section) => {
            section.hidden = true;
            section.setAttribute("aria-hidden", "true");
            section.classList.remove("is-hardware-open");
        });

        document.querySelectorAll(".ccg-affiliate-disclosure, .ccg-affiliate-label, .emu-affiliate-note").forEach((node) => {
            node.remove();
        });

        document.querySelectorAll('a[href="/affiliate-disclosure.html"], a[href$="/affiliate-disclosure.html"]').forEach((link) => {
            link.remove();
        });

        // The retired programme only used Amazon hosts or its two legacy data
        // markers.  Avoid parsing every navigation and content link on each
        // public page; this selector still sends every possible retired link
        // through the existing URL and query-string checks below.
        document.querySelectorAll([
            'a[href*="amzn.to" i]',
            'a[href*="amazon." i]',
            'a[data-ccg-affiliate-link="amazon"]',
            'a[data-ccg-revenue-link="amazon-affiliate"]'
        ].join(", ")).forEach((link) => {
            const rawHref = link.getAttribute("href") || "";
            let url;

            try {
                url = new URL(rawHref, window.location.href);
            } catch (error) {
                return;
            }

            const host = url.hostname.toLowerCase();
            const isAmazonHost = host === "amzn.to" || host === "amazon.co.uk" || host.endsWith(".amazon.co.uk") || host.startsWith("www.amazon.") || host.startsWith("amazon.");
            if (!isAmazonHost) return;

            const tag = (url.searchParams.get("tag") || "").toLowerCase();
            const linkCode = (url.searchParams.get("linkCode") || url.searchParams.get("linkcode") || "").toLowerCase();
            const markedLegacyLink = link.getAttribute("data-ccg-affiliate-link") === "amazon"
                || link.getAttribute("data-ccg-revenue-link") === "amazon-affiliate";
            const retiredAccountLink = tag === "cheekycommo0d-21";
            const legacyAssociateLink = host === "amzn.to" || retiredAccountLink || markedLegacyLink || linkCode === "ll2";

            if (legacyAssociateLink) {
                link.remove();
            }
        });
    };

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

        // Keep the shared screenshot modal outside transformed or contained
        // page wrappers so position: fixed remains tied to the live viewport.
        document.body.appendChild(modal);
        modal.dataset.ccgViewportRoot = "true";
    };

    // Canonical /games/<slug>/ pages are prefilled in the HTML. The shared
    // single-game CSS hides pages until ccg-single-ready is present, so reveal
    // prefilled pages immediately. The dynamic game.html shell has an empty H1
    // and therefore keeps its existing loader-controlled reveal behaviour.
    retireLegacyRetailerCommissionUi();
    revealPrefilledSingleGame();
    ensureSingleGameViewportModalRoot();

    window.addEventListener("ccg:game-loaded", () => retireLegacyRetailerCommissionUi({ force: true }));

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
            retireLegacyRetailerCommissionUi();
            ensureSingleGameViewportModalRoot();
            scheduleVisuals();
        }, { once: true });
    } else {
        retireLegacyRetailerCommissionUi();
        ensureSingleGameViewportModalRoot();
        scheduleVisuals();
    }

    scheduleDeferredScripts();
})();
