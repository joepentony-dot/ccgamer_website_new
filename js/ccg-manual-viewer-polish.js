(function () {
    "use strict";

    const MODAL_ID = "manualModal";
    const BUTTON_ID = "gameManualBtn";
    const FRAME_ID = "gameManualEmbed";
    const LINK_ATTR = "data-ccg-manual-open-external";
    const TOOLBAR_ATTR = "data-ccg-manual-toolbar";
    const ANCHORED_ATTR = "data-ccg-manual-anchored";
    const ANCHOR_VAR = "--ccg-manual-anchor-top";

    let pendingScrollTop = null;
    let activeButton = null;

    function currentScrollTop() {
        return window.scrollY || document.documentElement.scrollTop || 0;
    }

    function viewportHeight() {
        const visualHeight = window.visualViewport?.height;
        return Math.max(1, visualHeight || window.innerHeight || document.documentElement.clientHeight || 1);
    }

    function isCompactViewport() {
        return !!window.matchMedia?.("(max-width: 700px)").matches;
    }

    function resolveManualUrl(button) {
        if (!button) return "";
        return String(button.dataset.manualUrl || button.getAttribute("href") || "").trim();
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
                <a class="ccg-manual-toolbar__external ccg-btn ccg-btn--ghost"
                   ${LINK_ATTR}="true"
                   target="_blank"
                   rel="noopener noreferrer">Open manual in new tab</a>
            `;
            content.insertBefore(toolbar, frame);
        }

        return toolbar;
    }

    function updateExternalLink(url) {
        const toolbar = ensureToolbar();
        const link = toolbar?.querySelector(`[${LINK_ATTR}]`);
        if (!link) return;

        if (url) {
            link.href = url;
            link.hidden = false;
            link.removeAttribute("aria-disabled");
        } else {
            link.removeAttribute("href");
            link.hidden = true;
            link.setAttribute("aria-disabled", "true");
        }
    }

    function estimatePanelHeight() {
        const height = viewportHeight();
        return Math.min(height * (isCompactViewport() ? 0.68 : 0.72), isCompactViewport() ? 620 : 760);
    }

    function positionViewerNearButton(button) {
        const modal = document.getElementById(MODAL_ID);
        if (!modal || !button?.getBoundingClientRect) return;

        const rect = button.getBoundingClientRect();
        const height = viewportHeight();
        const panelHeight = estimatePanelHeight();
        const margin = isCompactViewport() ? 8 : 12;
        const gap = isCompactViewport() ? 8 : 10;
        const maxTop = Math.max(margin, height - panelHeight - margin);
        const belowTop = rect.bottom + gap;
        const aboveTop = rect.top - gap - panelHeight;

        let viewportTop;
        if (belowTop <= maxTop) {
            viewportTop = belowTop;
        } else if (aboveTop >= margin) {
            viewportTop = aboveTop;
        } else {
            viewportTop = Math.min(Math.max(rect.top, margin), maxTop);
        }

        const documentTop = Math.max(0, currentScrollTop() + viewportTop);
        modal.style.setProperty(ANCHOR_VAR, `${Math.round(documentTop)}px`);
    }

    function releaseManualPageLock(scrollTop) {
        const body = document.body;
        const modal = document.getElementById(MODAL_ID);
        if (!body || !modal || !modal.classList.contains("open")) return;

        const desiredScrollTop = Number.isFinite(scrollTop) ? scrollTop : currentScrollTop();

        body.classList.remove("modal-open");
        body.style.top = "";
        body.dataset.modalScrollTop = String(desiredScrollTop);

        if (Math.abs(currentScrollTop() - desiredScrollTop) > 1) {
            window.scrollTo({ top: desiredScrollTop, behavior: "auto" });
        }
    }

    function scheduleOpenSync() {
        queueMicrotask(() => {
            const modal = document.getElementById(MODAL_ID);
            if (!modal?.classList.contains("open")) return;

            syncFromButton();
            if (activeButton) positionViewerNearButton(activeButton);
            releaseManualPageLock(pendingScrollTop);

            requestAnimationFrame(() => {
                if (!modal.classList.contains("open")) return;
                releaseManualPageLock(
                    Number.parseInt(document.body?.dataset.modalScrollTop || "", 10)
                );
            });
        });
    }

    document.addEventListener("click", (event) => {
        const button = event.target instanceof Element
            ? event.target.closest(`#${BUTTON_ID}`)
            : null;
        if (!button) return;

        const manualUrl = resolveManualUrl(button);
        if (!manualUrl) return;

        pendingScrollTop = currentScrollTop();
        activeButton = button;
        positionViewerNearButton(button);
        updateExternalLink(manualUrl);
        scheduleOpenSync();
    }, { capture: true });

    function syncFromButton() {
        const button = document.getElementById(BUTTON_ID);
        updateExternalLink(resolveManualUrl(button));
    }

    function syncScrollRestorePoint() {
        const modal = document.getElementById(MODAL_ID);
        const body = document.body;
        if (!modal?.classList.contains("open") || !body) return;
        body.dataset.modalScrollTop = String(currentScrollTop());
    }

    function init() {
        const modal = document.getElementById(MODAL_ID);
        if (!modal) return;

        modal.setAttribute(ANCHORED_ATTR, "true");

        const content = modal.querySelector(".manual-content");
        if (content) content.setAttribute("aria-modal", "false");

        ensureToolbar();
        syncFromButton();

        if (modal.dataset.ccgManualPolishObserved === "true") return;

        const observer = new MutationObserver(() => {
            if (modal.classList.contains("open")) {
                syncFromButton();
                if (!activeButton) activeButton = document.getElementById(BUTTON_ID);
                if (activeButton) positionViewerNearButton(activeButton);
                scheduleOpenSync();
            } else {
                pendingScrollTop = null;
                activeButton = null;
            }
        });
        observer.observe(modal, { attributes: true, attributeFilter: ["class", "aria-hidden"] });

        window.addEventListener("scroll", syncScrollRestorePoint, { passive: true });
        window.addEventListener("resize", () => {
            if (!modal.classList.contains("open") || !activeButton) return;
            positionViewerNearButton(activeButton);
        }, { passive: true });

        modal.dataset.ccgManualPolishObserved = "true";
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
