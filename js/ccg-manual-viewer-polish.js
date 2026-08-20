(function () {
    "use strict";

    const LEGACY_MODAL_ID = "manualModal";
    const LEGACY_FRAME_ID = "gameManualEmbed";
    const BUTTON_ID = "gameManualBtn";
    const DIALOG_ID = "ccgManualDialog";
    const DIALOG_ATTR = "data-ccg-manual-dialog";
    const FRAME_ATTR = "data-ccg-manual-frame";
    const STATUS_ATTR = "data-ccg-manual-status";
    const CLOSE_ATTR = "data-ccg-manual-close";

    let activeManualUrl = "";
    let returnFocus = null;
    let pageScrollState = null;

    function resolvePrimaryLink(value) {
        if (Array.isArray(value) && value.length) {
            return value.find(Boolean) || "";
        }
        if (typeof value === "string") return value.trim();
        return "";
    }

    function normaliseManualUrl(url) {
        const trimmed = String(url || "").trim();
        if (!trimmed) return "";

        const driveMatch = trimmed.match(/https?:\/\/drive\.google\.com\/file\/d\/([^/]+)\//i);
        if (driveMatch && driveMatch[1]) {
            return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
        }

        return trimmed;
    }

    function resolveManualUrlFromGame(game) {
        const candidate = resolvePrimaryLink(game?.pdf || game?.manual || game?.manuals);
        if (!candidate || !/^https:\/\//i.test(candidate)) return "";

        const isDriveFile = /https?:\/\/drive\.google\.com\/file\/d\/[^/]+\//i.test(candidate);
        const isPdfPath = /\.pdf(?:[?#].*)?$/i.test(candidate);
        if (!isDriveFile && !isPdfPath) return "";

        return normaliseManualUrl(candidate);
    }

    function readManualUrlFromButton(button) {
        if (!button) return "";

        const dataUrl = String(button.dataset.manualUrl || "").trim();
        if (dataUrl) return normaliseManualUrl(dataUrl);

        const href = String(button.getAttribute("href") || "").trim();
        return href && !href.startsWith("#") ? normaliseManualUrl(href) : "";
    }

    function scrubManualSourceFromButton(button) {
        if (!button) return;

        if (button.dataset.manualUrl) delete button.dataset.manualUrl;
        if (button.getAttribute("href") !== `#${DIALOG_ID}`) {
            button.setAttribute("href", `#${DIALOG_ID}`);
        }
        if (button.hasAttribute("target")) button.removeAttribute("target");
        if (button.hasAttribute("rel")) button.removeAttribute("rel");
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("aria-controls", DIALOG_ID);
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("title", "Open manual viewer");
    }

    function captureManualSource(button, preferredUrl = "") {
        const candidate = normaliseManualUrl(preferredUrl) || readManualUrlFromButton(button);
        if (candidate) activeManualUrl = candidate;
        scrubManualSourceFromButton(button);
        return activeManualUrl;
    }

    function resetLegacyManualModal() {
        const legacyModal = document.getElementById(LEGACY_MODAL_ID);
        if (!legacyModal) return;

        legacyModal.classList.remove("open", "active");
        legacyModal.setAttribute("aria-hidden", "true");

        const legacyFrame = document.getElementById(LEGACY_FRAME_ID);
        if (legacyFrame) {
            legacyFrame.removeAttribute("src");
        }
    }

    function lockPageScroll() {
        if (!document.body || pageScrollState) return;

        pageScrollState = {
            htmlOverflow: document.documentElement.style.overflow,
            bodyOverflow: document.body.style.overflow,
            scrollTop: window.scrollY || document.documentElement.scrollTop || 0
        };

        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
    }

    function restorePageScroll() {
        if (!document.body || !pageScrollState) return;

        document.documentElement.style.overflow = pageScrollState.htmlOverflow;
        document.body.style.overflow = pageScrollState.bodyOverflow;
        pageScrollState = null;
    }

    function restoreReturnFocus() {
        const target = returnFocus;
        returnFocus = null;
        if (!target || typeof target.focus !== "function") return;

        requestAnimationFrame(() => {
            try {
                target.focus({ preventScroll: true });
            } catch (error) {
                target.focus();
            }
        });
    }

    function ensureManualDialog() {
        if (!document.body) return null;

        let dialog = document.querySelector(`[${DIALOG_ATTR}]`);
        if (dialog) return dialog;

        dialog = document.createElement("dialog");
        dialog.id = DIALOG_ID;
        dialog.className = "ccg-manual-dialog";
        dialog.setAttribute(DIALOG_ATTR, "true");
        dialog.setAttribute("aria-label", "Game manual viewer");

        const content = document.createElement("div");
        content.className = "ccg-manual-dialog__content";

        const toolbar = document.createElement("div");
        toolbar.className = "ccg-manual-dialog__toolbar";

        const label = document.createElement("span");
        label.className = "ccg-manual-dialog__label";
        label.textContent = "Game Manual";

        const hint = document.createElement("span");
        hint.className = "ccg-manual-dialog__hint";
        hint.textContent = "Scroll the PDF here. Use the PDF toolbar to zoom, print or download.";

        const closeButton = document.createElement("button");
        closeButton.className = "ccg-manual-dialog__close";
        closeButton.type = "button";
        closeButton.setAttribute(CLOSE_ATTR, "true");
        closeButton.setAttribute("aria-label", "Close manual");
        closeButton.textContent = "×";

        const status = document.createElement("p");
        status.className = "ccg-manual-dialog__status";
        status.setAttribute(STATUS_ATTR, "true");
        status.setAttribute("aria-live", "polite");
        status.textContent = "Loading manual…";

        const frame = document.createElement("iframe");
        frame.className = "ccg-manual-dialog__frame";
        frame.setAttribute(FRAME_ATTR, "true");
        frame.setAttribute("title", "Game manual");
        frame.setAttribute("loading", "eager");
        frame.setAttribute("allow", "fullscreen");

        toolbar.appendChild(label);
        toolbar.appendChild(hint);
        toolbar.appendChild(closeButton);
        content.appendChild(toolbar);
        content.appendChild(status);
        content.appendChild(frame);
        dialog.appendChild(content);
        document.body.appendChild(dialog);

        closeButton.addEventListener("click", () => {
            if (dialog.open) dialog.close();
        });

        dialog.addEventListener("click", (event) => {
            if (event.target === dialog && dialog.open) {
                dialog.close();
            }
        });

        frame.addEventListener("load", () => {
            status.hidden = true;
            status.textContent = "Manual loaded.";
        });

        frame.addEventListener("error", () => {
            status.hidden = false;
            status.textContent = "Manual failed to load. Close the viewer and try again.";
        });

        dialog.addEventListener("close", () => {
            frame.removeAttribute("src");
            restorePageScroll();

            const button = document.getElementById(BUTTON_ID);
            button?.setAttribute("aria-expanded", "false");
            restoreReturnFocus();
        });

        return dialog;
    }

    function openManualDialog(button, manualUrl) {
        const dialog = ensureManualDialog();
        if (!dialog || typeof dialog.showModal !== "function" || !manualUrl) return false;

        const frame = dialog.querySelector(`[${FRAME_ATTR}]`);
        const status = dialog.querySelector(`[${STATUS_ATTR}]`);
        const closeButton = dialog.querySelector(`[${CLOSE_ATTR}]`);
        if (!frame || !status) return false;

        resetLegacyManualModal();

        if (dialog.open) {
            dialog.close();
        }

        returnFocus = button;
        lockPageScroll();

        status.hidden = false;
        status.textContent = "Loading manual…";
        frame.src = manualUrl;

        try {
            dialog.showModal();
        } catch (error) {
            restorePageScroll();
            returnFocus = null;
            frame.removeAttribute("src");
            console.warn("[CCG] Unable to open manual dialog.", error);
            return false;
        }

        button?.setAttribute("aria-expanded", "true");

        requestAnimationFrame(() => {
            if (!closeButton || typeof closeButton.focus !== "function") return;
            try {
                closeButton.focus({ preventScroll: true });
            } catch (error) {
                closeButton.focus();
            }
        });

        return true;
    }

    function bindManualButtonObserver(button) {
        if (!button || button.dataset.ccgManualSourceObserved === "true") return;

        const observer = new MutationObserver(() => {
            captureManualSource(button);
        });
        observer.observe(button, {
            attributes: true,
            attributeFilter: ["href", "target", "rel", "data-manual-url", "hidden"]
        });
        button.dataset.ccgManualSourceObserved = "true";
    }

    function syncManualButton(event) {
        const button = document.getElementById(BUTTON_ID);
        if (!button) return;

        const eventManualUrl = resolveManualUrlFromGame(event?.detail?.game);
        captureManualSource(button, eventManualUrl);
        bindManualButtonObserver(button);
    }

    document.addEventListener("click", (event) => {
        const button = event.target instanceof Element
            ? event.target.closest(`#${BUTTON_ID}`)
            : null;
        if (!button) return;

        const manualUrl = captureManualSource(button);
        event.preventDefault();

        if (!manualUrl || !openManualDialog(button, manualUrl)) return;

        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
            event.stopImmediatePropagation();
        }
    }, true);

    function init() {
        ensureManualDialog();
        resetLegacyManualModal();
        syncManualButton();
        window.addEventListener("ccg:game-loaded", syncManualButton);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
