/* ============================================================
   CCG PUBLIC NAVIGATION AUTHORITY
   ------------------------------------------------------------
   One final public navigation structure for every page. This runs
   after the historical nav normaliser so visitors never depend on
   page-specific or late shortcut injection for primary navigation.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_NAV_AUTHORITY_READY) return;
    window.CCG_NAV_AUTHORITY_READY = true;

    const PRIMARY = [
        ["Home", "/home.html"],
        ["Browse Games", "/games/"],
        ["Browse by Genre", "/games/genres/"],
        ["Publishers", "/games/publishers/"],
        ["Collections", "/games/collections/"],
        ["Music Hub", "/music/"]
    ];

    const SECONDARY = [
        ["Find Me a Game", "/games/discover/"],
        ["Zzap!64 Reviews & Awards", "/zzap64/"],
        ["Quiz", "/quiz/quiz.html"],
        ["Emulation", "/emulation.html"],
        ["About Me", "/about.html"],
        ["Contact", "/contact.html"]
    ];

    function buildList(list, links) {
        if (!list) return;
        const fragment = document.createDocumentFragment();
        links.forEach(([label, href]) => {
            const item = document.createElement("li");
            const link = document.createElement("a");
            link.href = href;
            link.className = "ccg-nav__link";
            link.textContent = label;
            item.appendChild(link);
            fragment.appendChild(item);
        });
        list.replaceChildren(fragment);
    }

    function finaliseNavigation() {
        const header = document.querySelector("[data-ccg-header]");
        const nav = header?.querySelector(".ccg-nav");
        if (!header || !nav) {
            document.documentElement.classList.remove("ccg-nav-syncing");
            document.documentElement.classList.add("ccg-nav-ready");
            return;
        }

        buildList(nav.querySelector("[data-ccg-nav-primary]"), PRIMARY);
        buildList(nav.querySelector("[data-ccg-nav-secondary]"), SECONDARY);

        const menu = nav.querySelector("[data-ccg-more-menu]");
        if (menu) {
            menu.replaceChildren();
            menu.hidden = true;
        }

        const toggle = nav.querySelector("[data-ccg-more-toggle]");
        if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
        }

        if (typeof window.ccgMarkNavigationActive === "function") {
            window.ccgMarkNavigationActive(header);
        }
        if (typeof window.applyNavGlowPatch === "function") {
            window.applyNavGlowPatch();
        }

        document.documentElement.classList.remove("ccg-nav-syncing");
        document.documentElement.classList.add("ccg-nav-ready");
        document.dispatchEvent(new CustomEvent("ccg:navigation-ready", { detail: { header, nav } }));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", finaliseNavigation, { once: true });
    } else {
        finaliseNavigation();
    }
})();
