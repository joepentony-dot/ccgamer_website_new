/* ============================================================
   CCG WHOLE-SITE SEARCH COMMAND PLACEMENT
   ------------------------------------------------------------
   Home owns the full-width search command as static first-paint
   markup. Inner pages retain the global search trigger inside
   the established header actions so no late main-content insert
   can move the page after initial layout.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_SEARCH_COMMAND_PLACEMENT_READY) return;
    window.CCG_SEARCH_COMMAND_PLACEMENT_READY = true;

    const TRIGGER_SELECTOR = "[data-ccg-global-search-trigger]";
    const COMMAND_CLASS = "ccg-home-search-command";
    const PROMOTED_CLASS = "ccg-global-search-trigger--home";

    function isHomePage() {
        return document.documentElement.getAttribute("data-ccg-page") === "home";
    }

    function getHomeMain() {
        return document.querySelector('html[data-ccg-page="home"] .ccg-main--home');
    }

    function promoteHomeTrigger() {
        if (!isHomePage()) return true;

        const trigger = document.querySelector(TRIGGER_SELECTOR);
        const main = getHomeMain();
        if (!(trigger instanceof HTMLElement) || !(main instanceof HTMLElement)) return false;

        const existingCommand = trigger.closest(`.${COMMAND_CLASS}`);
        if (!(existingCommand instanceof HTMLElement) || existingCommand.parentElement !== main) {
            return false;
        }

        trigger.classList.add(PROMOTED_CLASS);
        return true;
    }

    function init() {
        if (!isHomePage()) return;
        if (promoteHomeTrigger()) return;

        const observer = new MutationObserver(() => {
            if (promoteHomeTrigger()) observer.disconnect();
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.setTimeout(() => observer.disconnect(), 10000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
