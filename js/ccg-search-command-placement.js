/* ============================================================
   CCG WHOLE-SITE SEARCH COMMAND PLACEMENT
   ------------------------------------------------------------
   Promotes the existing global search trigger into the same
   full-width command panel used on home.html across public
   Omega pages. The search engine itself remains unchanged.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_SEARCH_COMMAND_PLACEMENT_READY) return;
    window.CCG_SEARCH_COMMAND_PLACEMENT_READY = true;

    const TRIGGER_SELECTOR = "[data-ccg-global-search-trigger]";
    const COMMAND_CLASS = "ccg-home-search-command";
    const PROMOTED_CLASS = "ccg-global-search-trigger--home";

    function getMain() {
        return document.querySelector("main.ccg-main, .ccg-main");
    }

    function promoteTrigger() {
        const trigger = document.querySelector(TRIGGER_SELECTOR);
        const main = getMain();
        if (!(trigger instanceof HTMLElement) || !(main instanceof HTMLElement)) return false;

        const existingCommand = trigger.closest(`.${COMMAND_CLASS}`);
        if (existingCommand && existingCommand.parentElement === main) {
            trigger.classList.add(PROMOTED_CLASS);
            return true;
        }

        let command = document.querySelector(`.${COMMAND_CLASS}`);
        if (!(command instanceof HTMLElement)) {
            command = document.createElement("div");
            command.className = COMMAND_CLASS;
            command.setAttribute("role", "search");
            command.setAttribute("aria-label", "Search the CCG website");
        }

        trigger.classList.add(PROMOTED_CLASS);
        command.appendChild(trigger);

        if (main.firstElementChild !== command) {
            main.insertBefore(command, main.firstChild);
        }

        return true;
    }

    function init() {
        if (promoteTrigger()) return;

        const observer = new MutationObserver(() => {
            if (promoteTrigger()) observer.disconnect();
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