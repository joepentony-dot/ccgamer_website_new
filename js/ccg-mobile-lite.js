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

        // Keep the shared screenshot modal outside transformed or contained
        // page wrappers so position: fixed remains tied to the live viewport.
        document.body.appendChild(modal);
        modal.dataset.ccgViewportRoot = "true";
    };

    let boxLightboxReturnFocus = null;

    const closeDedicatedBoxLightbox = () => {
        const lightbox = document.querySelector("[data-ccg-box-lightbox]");
        if (!lightbox || !lightbox.classList.contains("is-open")) return;

        const savedScroll = Number(lightbox.dataset.scrollY || window.scrollY || 0);
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        root.classList.remove("ccg-box-lightbox-open");
        document.body?.classList.remove("ccg-box-lightbox-open");

        requestAnimationFrame(() => {
            window.scrollTo({ top: savedScroll, left: 0, behavior: "auto" });
            if (boxLightboxReturnFocus && typeof boxLightboxReturnFocus.focus === "function") {
                try {
                    boxLightboxReturnFocus.focus({ preventScroll: true });
                } catch (error) {
                    boxLightboxReturnFocus.focus();
                }
            }
            boxLightboxReturnFocus = null;
        });
    };

    const ensureDedicatedBoxLightbox = () => {
        if (!document.body) return null;

        let lightbox = document.querySelector("[data-ccg-box-lightbox]");
        if (lightbox) return lightbox;

        lightbox = document.createElement("div");
        lightbox.className = "ccg-box-lightbox";
        lightbox.setAttribute("data-ccg-box-lightbox", "true");
        lightbox.setAttribute("role", "dialog");
        lightbox.setAttribute("aria-modal", "true");
        lightbox.setAttribute("aria-label", "Enlarged game box artwork");
        lightbox.setAttribute("aria-hidden", "true");
        lightbox.innerHTML = `
            <button class="ccg-box-lightbox__close" type="button" aria-label="Close enlarged game box">&times;</button>
            <div class="ccg-box-lightbox__stage">
                <img class="ccg-box-lightbox__image" alt="" decoding="async">
            </div>
        `;
        document.body.appendChild(lightbox);

        lightbox.addEventListener("click", (event) => {
            if (event.target === lightbox || event.target.closest(".ccg-box-lightbox__close")) {
                closeDedicatedBoxLightbox();
            }
        });

        return lightbox;
    };

    const resetLegacyBoxModal = () => {
        const legacyModal = document.getElementById("ccgModal");
        if (!legacyModal) return;

        legacyModal.classList.remove("open", "active", "ccg-modal--box3d");
        legacyModal.setAttribute("aria-hidden", "true");

        const legacyImage = legacyModal.querySelector("[data-ccg-box3d-modal-image]");
        if (legacyImage) legacyImage.hidden = true;

        const frame = document.getElementById("ccgModalFrame");
        if (frame) frame.hidden = false;
    };

    const openDedicatedBoxLightbox = (box) => {
        if (!box || root.getAttribute("data-ccg-page") !== "single-game") return false;

        const sourceImage = box.querySelector(".game-hero__box3d-img, img");
        const source = sourceImage?.currentSrc || sourceImage?.src || "";
        if (!source) return false;

        const lightbox = ensureDedicatedBoxLightbox();
        const enlargedImage = lightbox?.querySelector(".ccg-box-lightbox__image");
        const closeButton = lightbox?.querySelector(".ccg-box-lightbox__close");
        if (!lightbox || !enlargedImage) return false;

        resetLegacyBoxModal();
        boxLightboxReturnFocus = box;
        lightbox.dataset.scrollY = String(window.scrollY || document.documentElement.scrollTop || 0);
        enlargedImage.src = source;
        enlargedImage.alt = sourceImage?.alt || "Game box artwork";

        root.classList.add("ccg-box-lightbox-open");
        document.body?.classList.add("ccg-box-lightbox-open");
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");

        requestAnimationFrame(() => {
            if (closeButton && typeof closeButton.focus === "function") {
                try {
                    closeButton.focus({ preventScroll: true });
                } catch (error) {
                    closeButton.focus();
                }
            }
        });

        return true;
    };

    const bindDedicatedBoxLightbox = () => {
        if (root.getAttribute("data-ccg-page") !== "single-game") return;
        if (root.dataset.ccgDedicatedBoxLightboxBound === "true") return;

        // Capture the interaction before the legacy shared modal handler. The
        // 3D box now has its own viewport-rooted viewer, so it cannot open at a
        // different vertical position on long mobile game pages.
        document.addEventListener("click", (event) => {
            const target = event.target instanceof Element ? event.target : null;
            const box = target?.closest(".game-hero__box3d");
            if (!box) return;
            if (!openDedicatedBoxLightbox(box)) return;

            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === "function") {
                event.stopImmediatePropagation();
            }
        }, true);

        document.addEventListener("keydown", (event) => {
            const lightbox = document.querySelector("[data-ccg-box-lightbox]");
            if (event.key === "Escape" && lightbox?.classList.contains("is-open")) {
                event.preventDefault();
                closeDedicatedBoxLightbox();
                return;
            }

            if (event.key !== "Enter" && event.key !== " ") return;
            const target = event.target instanceof Element ? event.target : null;
            const box = target?.closest(".game-hero__box3d");
            if (!box) return;
            if (!openDedicatedBoxLightbox(box)) return;

            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === "function") {
                event.stopImmediatePropagation();
            }
        }, true);

        root.dataset.ccgDedicatedBoxLightboxBound = "true";
    };

    // Canonical /games/<slug>/ pages are prefilled in the HTML. The shared
    // single-game CSS hides pages until ccg-single-ready is present, so reveal
    // prefilled pages immediately. The dynamic game.html shell has an empty H1
    // and therefore keeps its existing loader-controlled reveal behaviour.
    revealPrefilledSingleGame();
    ensureSingleGameViewportModalRoot();
    bindDedicatedBoxLightbox();

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
            bindDedicatedBoxLightbox();
            scheduleVisuals();
        }, { once: true });
    } else {
        ensureSingleGameViewportModalRoot();
        bindDedicatedBoxLightbox();
        scheduleVisuals();
    }

    scheduleDeferredScripts();
})();
