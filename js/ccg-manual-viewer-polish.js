(function () {
    "use strict";

    const MODAL_ID = "manualModal";
    const BUTTON_ID = "gameManualBtn";
    const FRAME_ID = "gameManualEmbed";
    const TOOLBAR_ATTR = "data-ccg-manual-toolbar";
    const MANUAL_URLS = new WeakMap();

    function currentScrollTop() {
        return window.scrollY || document.documentElement.scrollTop || 0;
    }

    function readManualUrl(button) {
        if (!button) return "";
        const remembered = MANUAL_URLS.get(button);
        if (remembered) return remembered;

        const dataUrl = String(button.dataset.manualUrl || "").trim();
        if (dataUrl) return dataUrl;

        const href = String(button.getAttribute("href") || "").trim();
        return href && !href.startsWith("#") ? href : "";
    }

    function hideManualSourceFromButton(button) {
        if (!button) return "";

        const manualUrl = readManualUrl(button);
        if (manualUrl) MANUAL_URLS.set(button, manualUrl);

        if (button.dataset.manualUrl) delete button.dataset.manualUrl;
        if (button.getAttribute("href") !== `#${MODAL_ID}`) {
            button.setAttribute("href", `#${MODAL_ID}`);
        }
        if (button.hasAttribute("target")) button.removeAttribute("target");
        if (button.hasAttribute("rel")) button.removeAttribute("rel");
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("title", "Open manual viewer");

        return manualUrl;
    }

    function ensureToolbar() {
        const modal = document.getElementById(MODAL_ID);
        const content = modal?.querySelector(".manual-content");
        const frame = document.getElementById(FRAME_ID);
        if (!modal || !content || !frame) return null;

        let toolbar = content.querySelector(`[${TOOLBAR_ATTR}]`);
        if (!toolbar) {
            toolbar = document.createElement("div");
            toolbar.className = "ccg-manual-toolbar";
            toolbar.setAttribute(TOOLBAR_ATTR, "true");
            toolbar.innerHTML = `
                <span class="ccg-manual-toolbar__label">Game Manual</span>
                <span class="ccg-manual-toolbar__hint">Scroll the PDF here. Use the PDF toolbar to zoom, print or download.</span>
            `;
            content.insertBefore(toolbar, frame);
        }

        toolbar.querySelectorAll("a[href]").forEach((link) => link.remove());
        return toolbar;
    }

    function ensureModalAtDocumentRoot(modal) {
        if (!modal || !document.body) return;
        if (modal.parentElement !== document.body) document.body.appendChild(modal);
    }

    function lockPageAtCurrentPosition() {
        const body = document.body;
        if (!body) return;

        const scrollTop = currentScrollTop();
        body.dataset.modalScrollTop = String(scrollTop);
        body.classList.add("modal-open");

        if (window.CSS?.supports?.("(-webkit-touch-callout: none)")) {
            body.style.top = `-${scrollTop}px`;
        }
    }

    function openManualViewer(button, manualUrl) {
        const modal = document.getElementById(MODAL_ID);
        const frame = document.getElementById(FRAME_ID);
        const status = document.getElementById("manualModalStatus");
        const closeButton = document.getElementById("manualModalClose");
        if (!modal || !frame || !manualUrl) return;

        ensureModalAtDocumentRoot(modal);
        ensureToolbar();
        lockPageAtCurrentPosition();

        if (status) {
            status.textContent = "Loading manual…";
            status.hidden = false;
        }

        frame.removeAttribute("data-manual-loaded");
        frame.src = manualUrl;
        modal.classList.add("open", "active");
        modal.setAttribute("aria-hidden", "false");
        modal.removeAttribute("data-ccg-manual-anchored");
        button?.setAttribute("aria-expanded", "true");

        requestAnimationFrame(() => closeButton?.focus({ preventScroll: true }));
    }

    function bindManualButtonObserver(button) {
        if (!button || button.dataset.ccgManualSourceObserved === "true") return;

        const observer = new MutationObserver(() => {
            hideManualSourceFromButton(button);
        });
        observer.observe(button, {
            attributes: true,
            attributeFilter: ["href", "target", "rel", "data-manual-url", "hidden"]
        });
        button.dataset.ccgManualSourceObserved = "true";
    }

    function syncManualButton() {
        const button = document.getElementById(BUTTON_ID);
        if (!button) return;
        hideManualSourceFromButton(button);
        bindManualButtonObserver(button);
    }

    function bindSafeLoadErrorMessage() {
        const frame = document.getElementById(FRAME_ID);
        const status = document.getElementById("manualModalStatus");
        if (!frame || frame.dataset.ccgManualSafeErrorBound === "true") return;

        frame.addEventListener("error", () => {
            queueMicrotask(() => {
                if (!status) return;
                status.hidden = false;
                status.textContent = "Manual failed to load. Close the viewer and try again.";
            });
        });
        frame.dataset.ccgManualSafeErrorBound = "true";
    }

    document.addEventListener("click", (event) => {
        const button = event.target instanceof Element
            ? event.target.closest(`#${BUTTON_ID}`)
            : null;
        if (!button) return;

        const manualUrl = hideManualSourceFromButton(button);
        if (!manualUrl) return;

        event.preventDefault();
        event.stopPropagation();
        openManualViewer(button, manualUrl);
    }, { capture: true });

    function init() {
        const modal = document.getElementById(MODAL_ID);
        if (!modal) return;

        modal.removeAttribute("data-ccg-manual-anchored");
        ensureToolbar();
        bindSafeLoadErrorMessage();
        syncManualButton();

        window.addEventListener("ccg:game-loaded", syncManualButton);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
