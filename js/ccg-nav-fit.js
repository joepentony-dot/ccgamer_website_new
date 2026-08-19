/* ============================================================
   CCG ADAPTIVE DESKTOP NAVIGATION
   ------------------------------------------------------------
   Desktop More is owned here and nowhere else. About Me + Contact
   are deliberately reserved for More, with additional destinations
   moved there only when the visible navigation genuinely overflows.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_NAV_FIT_READY) return;
    window.CCG_NAV_FIT_READY = true;

    const CSS_PATH = "/resources/css/ccg-nav-fit.css";
    const DESKTOP_QUERY = "(min-width: 1200px)";
    const desktopMedia = window.matchMedia ? window.matchMedia(DESKTOP_QUERY) : null;
    const PINNED_MORE_LABELS = new Set(["about", "about me", "contact"]);
    let fitFrame = 0;
    let fitting = false;

    function ensureCss() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_PATH;
        document.head.appendChild(link);
    }

    function normalizeLabel(value) {
        return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function linkPriority(link) {
        const label = normalizeLabel(link?.textContent);
        if (label === "home") return 100;
        if (label.includes("browse games")) return 96;
        if (label.includes("genre")) return 92;
        if (label.includes("publisher")) return 88;
        if (label.includes("collection")) return 84;
        if (label.includes("music")) return 80;
        if (label.includes("find me a game")) return 76;
        if (label.includes("zzap")) return 72;
        if (label.includes("quiz")) return 56;
        if (label.includes("emulation")) return 46;
        if (label.includes("about")) return 12;
        if (label.includes("contact")) return 10;
        return 42;
    }

    function isDesktop() {
        if (desktopMedia) return desktopMedia.matches;
        return window.innerWidth >= 1200;
    }

    function menuHasOverflowLinks(menu) {
        return Boolean(menu?.querySelector(".ccg-nav-fit__link"));
    }

    function setMoreOpenState(toggle, menu, open) {
        const nav = toggle?.closest(".ccg-nav");
        const header = nav?.closest("[data-ccg-header]");
        const isOpen = Boolean(open && menu && !menu.hidden && menuHasOverflowLinks(menu));
        nav?.classList.toggle("ccg-nav--more-open", isOpen);
        header?.classList.toggle("ccg-header--more-open", isOpen);
    }

    function closeMore(toggle, menu) {
        if (!toggle || !menu) return;
        toggle.setAttribute("aria-expanded", "false");
        menu.hidden = true;
        setMoreOpenState(toggle, menu, false);
    }

    function syncMoreAvailability(nav, more, toggle, menu) {
        if (!nav || !more || !toggle || !menu) return false;
        const hasOverflow = Boolean(isDesktop() && menuHasOverflowLinks(menu));
        nav.classList.toggle("ccg-nav--has-overflow", hasOverflow);
        more.hidden = !hasOverflow;
        toggle.disabled = !hasOverflow;
        toggle.setAttribute("aria-hidden", hasOverflow ? "false" : "true");
        if (!hasOverflow) closeMore(toggle, menu);
        return hasOverflow;
    }

    function bindMoreControls(header) {
        if (!header || header.dataset.ccgNavFitControlsBound === "true") return;
        header.dataset.ccgNavFitControlsBound = "true";

        /* Capture phase deliberately wins over the historical delegated More
           handler in ccg-global.js. This prevents two scripts toggling the same
           menu in opposite directions on one click. */
        header.addEventListener("click", (event) => {
            const target = event.target instanceof Element ? event.target : null;
            const toggle = target?.closest("[data-ccg-more-toggle]");
            if (!toggle || !header.contains(toggle)) return;

            event.preventDefault();
            event.stopImmediatePropagation();

            const nav = toggle.closest(".ccg-nav");
            const more = toggle.closest(".ccg-nav__more");
            const menu = nav?.querySelector("[data-ccg-more-menu]");
            if (!nav || !more || !menu || !menuHasOverflowLinks(menu)) {
                if (nav && more && menu) syncMoreAvailability(nav, more, toggle, menu);
                return;
            }

            const opening = menu.hidden;
            menu.hidden = !opening;
            toggle.setAttribute("aria-expanded", opening ? "true" : "false");
            setMoreOpenState(toggle, menu, opening);
        }, true);

        document.addEventListener("click", (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest("[data-ccg-more-toggle], [data-ccg-more-menu]")) return;
            const nav = header.querySelector(".ccg-nav");
            closeMore(
                nav?.querySelector("[data-ccg-more-toggle]"),
                nav?.querySelector("[data-ccg-more-menu]")
            );
        });

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            const nav = header.querySelector(".ccg-nav");
            const toggle = nav?.querySelector("[data-ccg-more-toggle]");
            const menu = nav?.querySelector("[data-ccg-more-menu]");
            if (!toggle || !menu || menu.hidden) return;
            closeMore(toggle, menu);
            toggle.focus({ preventScroll: true });
        });
    }

    function availableWidth(header) {
        const inner = header.querySelector(".ccg-header-inner");
        return Math.max(0, Math.floor((inner?.clientWidth || window.innerWidth) - 12));
    }

    function isOverflowing(header, nav) {
        const allowed = availableWidth(header);
        const required = Math.ceil(nav.scrollWidth);
        const navRect = nav.getBoundingClientRect();
        const innerRect = header.querySelector(".ccg-header-inner")?.getBoundingClientRect();
        const clippedRight = innerRect ? navRect.right > innerRect.right + 1 : false;
        const clippedLeft = innerRect ? navRect.left < innerRect.left - 1 : false;
        return required > allowed || clippedRight || clippedLeft;
    }

    function allNavItems(nav) {
        return Array.from(nav.querySelectorAll(
            "[data-ccg-nav-primary] > li, [data-ccg-nav-secondary] > li"
        )).filter((item) => item.querySelector(".ccg-nav__link"));
    }

    function isPinnedMoreItem(item) {
        return PINNED_MORE_LABELS.has(normalizeLabel(item?.querySelector(".ccg-nav__link")?.textContent));
    }

    function restoreItems(items) {
        items.forEach((item) => {
            item.hidden = false;
            item.removeAttribute("data-ccg-nav-fit-overflow");
            item.removeAttribute("data-ccg-nav-fit-pinned");
        });
    }

    function populateMore(menu, hiddenItems) {
        menu.textContent = "";
        hiddenItems.forEach((item) => {
            const source = item.querySelector(".ccg-nav__link");
            if (!source) return;
            const link = source.cloneNode(true);
            link.classList.add("ccg-nav-fit__link");
            link.removeAttribute("id");
            link.setAttribute("role", "menuitem");
            menu.appendChild(link);
        });
    }

    function fitNavigation() {
        if (fitting) return;
        const header = document.querySelector("[data-ccg-header]");
        const nav = header?.querySelector(".ccg-nav");
        const more = nav?.querySelector(".ccg-nav__more");
        const toggle = nav?.querySelector("[data-ccg-more-toggle]");
        const menu = nav?.querySelector("[data-ccg-more-menu]");
        if (!header || !nav || !more || !toggle || !menu) return;

        fitting = true;
        const items = allNavItems(nav);
        restoreItems(items);
        nav.classList.remove("ccg-nav--fit-compact", "ccg-nav--fit-tight", "ccg-nav--has-overflow");
        more.hidden = true;
        toggle.disabled = true;
        toggle.setAttribute("aria-hidden", "true");
        menu.textContent = "";
        closeMore(toggle, menu);

        if (!isDesktop()) {
            syncMoreAvailability(nav, more, toggle, menu);
            fitting = false;
            return;
        }

        const hiddenItems = [];
        items.filter(isPinnedMoreItem).forEach((item) => {
            item.hidden = true;
            item.setAttribute("data-ccg-nav-fit-pinned", "true");
            hiddenItems.push(item);
        });

        if (hiddenItems.length) {
            populateMore(menu, hiddenItems);
            syncMoreAvailability(nav, more, toggle, menu);
        }

        if (isOverflowing(header, nav)) {
            nav.classList.add("ccg-nav--fit-compact");
        }
        if (isOverflowing(header, nav)) {
            nav.classList.add("ccg-nav--fit-tight");
        }

        if (isOverflowing(header, nav)) {
            const candidates = items
                .filter((item) => !hiddenItems.includes(item))
                .map((item, index) => {
                    const link = item.querySelector(".ccg-nav__link");
                    const active = link?.matches("[aria-current='page'], .ccg-nav__link--active") ? 1000 : 0;
                    return { item, index, priority: linkPriority(link) + active };
                })
                .sort((a, b) => a.priority - b.priority || b.index - a.index);

            for (const candidate of candidates) {
                const visibleCount = items.length - hiddenItems.length;
                if (!isOverflowing(header, nav) || visibleCount <= 5) break;
                candidate.item.hidden = true;
                candidate.item.setAttribute("data-ccg-nav-fit-overflow", "true");
                hiddenItems.push(candidate.item);
            }
        }

        hiddenItems.sort((a, b) => items.indexOf(a) - items.indexOf(b));
        populateMore(menu, hiddenItems);
        syncMoreAvailability(nav, more, toggle, menu);
        fitting = false;
    }

    function scheduleFit(delay) {
        if (fitFrame) cancelAnimationFrame(fitFrame);
        const run = () => {
            fitFrame = requestAnimationFrame(() => {
                fitFrame = 0;
                fitNavigation();
            });
        };
        if (delay) window.setTimeout(run, delay);
        else run();
    }

    function init() {
        ensureCss();
        const header = document.querySelector("[data-ccg-header]");
        const nav = header?.querySelector(".ccg-nav");
        if (!header || !nav) return;

        bindMoreControls(header);
        scheduleFit();
        scheduleFit(80);
        scheduleFit(240);

        window.addEventListener("resize", () => scheduleFit(30), { passive: true });
        window.addEventListener("orientationchange", () => scheduleFit(60), { passive: true });
        window.addEventListener("pageshow", () => scheduleFit(20), { passive: true });
        document.addEventListener("ccg:navigation-ready", () => scheduleFit(0));
        desktopMedia?.addEventListener?.("change", () => scheduleFit());

        const lists = nav.querySelectorAll("[data-ccg-nav-primary], [data-ccg-nav-secondary]");
        const listObserver = new MutationObserver(() => {
            if (!fitting) scheduleFit(10);
        });
        lists.forEach((list) => listObserver.observe(list, { childList: true, subtree: true }));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
