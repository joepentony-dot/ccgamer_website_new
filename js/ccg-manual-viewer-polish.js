(function () {
    "use strict";

    const MODAL_ID = "manualModal";
    const BUTTON_ID = "gameManualBtn";
    const FRAME_ID = "gameManualEmbed";
    const LINK_ATTR = "data-ccg-manual-open-external";
    const TOOLBAR_ATTR = "data-ccg-manual-toolbar";

    let pendingScrollTop = null;

    function currentScrollTop() {
        return window.scrollY || document.documentElement.scrollTop || 0;
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

    function repairLockedScrollPosition(scrollTop) {
        const body = document.body;
        const modal = document.getElementById(MODAL_ID);
        if (!body || !modal || !modal.classList.contains("open")) return;

        body.dataset.modalScrollTop = String(scrollTop);

        const style = window.getComputedStyle(body);
        if (style.position === "fixed") {
            body.style.top = `-${scrollTop}px`;
            return;
        }

        if (Math.abs(currentScrollTop() - scrollTop) > 1) {
            window.scrollTo({ top: scrollTop, behavior: "auto" });
        }
    }

    function scheduleScrollRepair(scrollTop) {
        queueMicrotask(() => {
            requestAnimationFrame(() => repairLockedScrollPosition(scrollTop));
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
        updateExternalLink(manualUrl);
        scheduleScrollRepair(pendingScrollTop);
    }, { capture: true });

    function syncFromButton() {
        const button = document.getElementById(BUTTON_ID);
        updateExternalLink(resolveManualUrl(button));
    }

    function init() {
        if (!document.getElementById(MODAL_ID)) return;
        ensureToolbar();
        syncFromButton();

        const modal = document.getElementById(MODAL_ID);
        if (!modal || modal.dataset.ccgManualPolishObserved === "true") return;

        const observer = new MutationObserver(() => {
            if (modal.classList.contains("open")) {
                syncFromButton();
                if (pendingScrollTop !== null) scheduleScrollRepair(pendingScrollTop);
            } else {
                pendingScrollTop = null;
            }
        });
        observer.observe(modal, { attributes: true, attributeFilter: ["class", "aria-hidden"] });
        modal.dataset.ccgManualPolishObserved = "true";
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
