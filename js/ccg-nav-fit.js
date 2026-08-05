/* ============================================================
   CCG RESPONSIVE NAVIGATION FIT
   ------------------------------------------------------------
   Keeps every desktop navigation choice visible without creating
   a trapped horizontal scrollbar. Also mirrors the signed-in
   profile link into the mobile drawer with an explicit label.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_NAV_FIT_READY) return;
    window.CCG_NAV_FIT_READY = true;

    const DESKTOP_BREAKPOINT = 1200;
    const STYLE_PATH = "/resources/css/ccg-navigation-fit.css";
    let queued = false;

    function ensureStyle() {
        if (document.querySelector(`link[href="${STYLE_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = STYLE_PATH;
        link.setAttribute("data-ccg-navigation-fit-style", "true");
        document.head.appendChild(link);
    }

    function navOverflows(nav) {
        const rect = nav.getBoundingClientRect();
        const controls = nav.querySelectorAll(".ccg-nav__link, .ccg-nav__more-toggle");
        if (!controls.length || rect.width <= 0) return false;

        let left = Number.POSITIVE_INFINITY;
        let right = Number.NEGATIVE_INFINITY;
        controls.forEach((control) => {
            const controlRect = control.getBoundingClientRect();
            if (controlRect.width <= 0) return;
            left = Math.min(left, controlRect.left);
            right = Math.max(right, controlRect.right);
        });

        return left < rect.left - 1 || right > rect.right + 1 || nav.scrollWidth > nav.clientWidth + 2;
    }

    function fitOne(nav) {
        nav.classList.remove("ccg-nav-fit--compact", "ccg-nav-fit--wrapped");
        if (window.innerWidth < DESKTOP_BREAKPOINT) return;

        if (!navOverflows(nav)) return;
        nav.classList.add("ccg-nav-fit--compact");

        window.requestAnimationFrame(() => {
            if (!nav.isConnected || window.innerWidth < DESKTOP_BREAKPOINT) return;
            if (navOverflows(nav)) nav.classList.add("ccg-nav-fit--wrapped");
        });
    }

    function fitAll() {
        queued = false;
        document.querySelectorAll(".ccg-header .ccg-nav").forEach(fitOne);
    }

    function queueFit() {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(fitAll);
    }

    function readableProfileText(identity) {
        const raw = String(identity?.textContent || "").trim();
        if (!raw) return "";
        return /^profile\s*:/i.test(raw) ? raw : `Profile: ${raw}`;
    }

    function syncProfileLinks() {
        const identity = document.getElementById("ccg-auth-identity");
        const label = readableProfileText(identity);

        if (identity && label) {
            identity.textContent = label;
            identity.setAttribute("aria-label", `Open ${label}`);
            identity.title = "Open your profile";
            identity.classList.add("ccg-community-profile-btn");
        }

        document.querySelectorAll(".ccg-nav-drawer__panel").forEach((panel) => {
            let slot = panel.querySelector(".ccg-drawer-profile-slot");
            if (!slot) {
                slot = document.createElement("div");
                slot.className = "ccg-drawer-profile-slot";
                slot.hidden = true;
                const header = panel.querySelector(".ccg-nav-drawer__header");
                if (header) header.insertAdjacentElement("afterend", slot);
                else panel.insertAdjacentElement("afterbegin", slot);
            }

            if (!identity || !label) {
                slot.hidden = true;
                slot.textContent = "";
                return;
            }

            slot.hidden = false;
            slot.innerHTML = "";
            const link = document.createElement("a");
            link.className = "ccg-drawer-profile-link";
            link.href = identity.getAttribute("href") || "/community/profile.html";
            link.textContent = label;
            link.setAttribute("aria-label", `Open ${label}`);
            slot.appendChild(link);
        });
    }

    function bindObservers() {
        if (window.__ccgNavFitObserversBound) return;
        window.__ccgNavFitObserversBound = true;

        window.addEventListener("resize", queueFit, { passive: true });
        window.addEventListener("orientationchange", queueFit, { passive: true });
        window.addEventListener("load", queueFit, { once: true });
        window.addEventListener("ccg:auth-state", syncProfileLinks);
        window.addEventListener("ccg:auth-ready", syncProfileLinks);
        window.addEventListener("ccg:auth-changed", syncProfileLinks);

        if ("ResizeObserver" in window) {
            const resizeObserver = new ResizeObserver(queueFit);
            document.querySelectorAll(".ccg-header, .ccg-header .ccg-nav").forEach((element) => resizeObserver.observe(element));
        }

        const observer = new MutationObserver((mutations) => {
            const relevant = mutations.some((mutation) => {
                if (mutation.type === "characterData") return true;
                if (mutation.type !== "childList") return false;
                return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
            });
            if (!relevant) return;
            syncProfileLinks();
            queueFit();
        });
        observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    }

    function init() {
        ensureStyle();
        syncProfileLinks();
        bindObservers();
        queueFit();
        document.fonts?.ready?.then(queueFit).catch(() => {});
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
