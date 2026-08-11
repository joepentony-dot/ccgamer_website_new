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

    let boxDialogReturnFocus = null;
    let boxDialogScrollState = null;

    const lockBoxDialogPageScroll = () => {
        if (!document.body || boxDialogScrollState) return;

        boxDialogScrollState = {
            htmlOverflow: document.documentElement.style.overflow,
            bodyOverflow: document.body.style.overflow
        };

        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
    };

    const restoreBoxDialogPageScroll = () => {
        if (!document.body || !boxDialogScrollState) return;

        document.documentElement.style.overflow = boxDialogScrollState.htmlOverflow;
        document.body.style.overflow = boxDialogScrollState.bodyOverflow;
        boxDialogScrollState = null;
    };

    const restoreBoxDialogFocus = () => {
        const returnFocus = boxDialogReturnFocus;
        boxDialogReturnFocus = null;

        if (!returnFocus || typeof returnFocus.focus !== "function") return;

        requestAnimationFrame(() => {
            try {
                returnFocus.focus({ preventScroll: true });
            } catch (error) {
                returnFocus.focus();
            }
        });
    };

    const closeDedicatedBoxDialog = () => {
        const dialog = document.querySelector("[data-ccg-box-dialog]");
        if (!dialog || !dialog.open) return;
        dialog.close();
    };

    const ensureDedicatedBoxDialog = () => {
        if (!document.body) return null;

        let dialog = document.querySelector("[data-ccg-box-dialog]");
        if (dialog) return dialog;

        dialog = document.createElement("dialog");
        dialog.className = "ccg-box-dialog";
        dialog.setAttribute("data-ccg-box-dialog", "true");
        dialog.setAttribute("aria-label", "Enlarged game box artwork");
        dialog.innerHTML = `
            <div class="ccg-box-dialog__content">
                <button class="ccg-box-dialog__close" type="button" aria-label="Close enlarged game box">&times;</button>
                <img class="ccg-box-dialog__image" alt="" decoding="async">
            </div>
        `;
        document.body.appendChild(dialog);

        dialog.addEventListener("click", (event) => {
            const closeButton = event.target instanceof Element
                ? event.target.closest(".ccg-box-dialog__close")
                : null;

            if (closeButton || event.target === dialog) {
                closeDedicatedBoxDialog();
            }
        });

        dialog.addEventListener("close", () => {
            restoreBoxDialogPageScroll();
            restoreBoxDialogFocus();
        });

        return dialog;
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

    const openDedicatedBoxDialog = (box) => {
        if (!box || root.getAttribute("data-ccg-page") !== "single-game") return false;

        const sourceImage = box.querySelector(".game-hero__box3d-img, img");
        const source = sourceImage?.currentSrc || sourceImage?.src || "";
        if (!source) return false;

        const dialog = ensureDedicatedBoxDialog();
        const enlargedImage = dialog?.querySelector(".ccg-box-dialog__image");
        const closeButton = dialog?.querySelector(".ccg-box-dialog__close");
        if (!dialog || !enlargedImage || typeof dialog.showModal !== "function") return false;

        resetLegacyBoxModal();

        if (dialog.open) {
            dialog.close();
        }

        boxDialogReturnFocus = box;
        enlargedImage.src = source;
        enlargedImage.alt = sourceImage?.alt || "Game box artwork";

        lockBoxDialogPageScroll();

        try {
            dialog.showModal();
        } catch (error) {
            restoreBoxDialogPageScroll();
            boxDialogReturnFocus = null;
            console.warn("[CCG] Unable to open game box dialog.", error);
            return false;
        }

        requestAnimationFrame(() => {
            if (!closeButton || typeof closeButton.focus !== "function") return;
            try {
                closeButton.focus({ preventScroll: true });
            } catch (error) {
                closeButton.focus();
            }
        });

        return true;
    };

    const bindDedicatedBoxDialog = () => {
        if (root.getAttribute("data-ccg-page") !== "single-game") return;
        if (root.dataset.ccgDedicatedBoxDialogBound === "true") return;

        // Capture the 3D-box interaction before the legacy screenshot-modal
        // handler. showModal() places the viewer in the browser top layer, so it
        // cannot be positioned above or below the user's current viewport.
        document.addEventListener("click", (event) => {
            const target = event.target instanceof Element ? event.target : null;
            const box = target?.closest(".game-hero__box3d");
            if (!box) return;
            if (!openDedicatedBoxDialog(box)) return;

            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === "function") {
                event.stopImmediatePropagation();
            }
        }, true);

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;

            const target = event.target instanceof Element ? event.target : null;
            const box = target?.closest(".game-hero__box3d");
            if (!box) return;
            if (!openDedicatedBoxDialog(box)) return;

            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === "function") {
                event.stopImmediatePropagation();
            }
        }, true);

        root.dataset.ccgDedicatedBoxDialogBound = "true";
    };

    // Canonical /games/<slug>/ pages are prefilled in the HTML. The shared
    // single-game CSS hides pages until ccg-single-ready is present, so reveal
    // prefilled pages immediately. The dynamic game.html shell has an empty H1
    // and therefore keeps its existing loader-controlled reveal behaviour.
    revealPrefilledSingleGame();
    ensureSingleGameViewportModalRoot();
    bindDedicatedBoxDialog();

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
            bindDedicatedBoxDialog();
            scheduleVisuals();
        }, { once: true });
    } else {
        ensureSingleGameViewportModalRoot();
        bindDedicatedBoxDialog();
        scheduleVisuals();
    }

    scheduleDeferredScripts();
})();
