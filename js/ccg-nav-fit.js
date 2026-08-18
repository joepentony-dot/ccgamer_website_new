/* ============================================================
   CCG ADAPTIVE DESKTOP NAVIGATION
   ------------------------------------------------------------
   Compresses the desktop navigation only when required and
   moves lower-priority destinations into the existing More
   menu before any link can be clipped off-screen.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_NAV_FIT_READY) return;
    window.CCG_NAV_FIT_READY = true;

    const CSS_PATH = "/resources/css/ccg-nav-fit.css";
    const DESKTOP_QUERY = "(min-width: 1200px)";
    const desktopMedia = window.matchMedia ? window.matchMedia(DESKTOP_QUERY) : null;
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
        if (label.includes("zzap")) return 80;
        if (label.includes("music")) return 76;
        if (label.includes("find me a game")) return 72;
        if (label.includes("quiz")) return 56;
        if (label.includes("emulation")) return 46;
        if (label.includes("about")) return 36;
        if (label.includes("contact")) return 26;
        return 42;
    }

    function setMoreOpenState(toggle, menu, open) {
        const nav = toggle?.closest(".ccg-nav");
        const header = nav?.closest("[data-ccg-header]");
        const isOpen = Boolean(open && menu && !menu.hidden);
        nav?.classList.toggle("ccg-nav--more-open", isOpen);
        header?.classList.toggle("ccg-header--more-open", isOpen);
    }

    function closeMore(toggle, menu) {
        if (!toggle || !menu) return;
        toggle.setAttribute("aria-expanded", "false");
        menu.hidden = true;
        setMoreOpenState(toggle, menu, false);
    }

    function hasMoreItems(menu) {
        return Boolean(menu?.querySelector("a[href]"));
    }

    function setMoreAvailability(nav, more, toggle, menu, available) {
        const enabled = Boolean(available && hasMoreItems(menu));
        if (enabled) {
            more.dataset.ccgNavFitHasItems = "true";
            more.hidden = false;
            nav.classList.add("ccg-nav--has-overflow");
            return;
        }

        delete more.dataset.ccgNavFitHasItems;
        more.hidden = true;
        nav.classList.remove("ccg-nav--has-overflow");
        closeMore(toggle, menu);
    }

    function bindMoreControls(toggle, menu) {
        if (!toggle || !menu || toggle.dataset.ccgNavFitBound === "true") return;
        toggle.dataset.ccgNavFitBound = "true";

        toggle.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!hasMoreItems(menu)) {
                closeMore(toggle, menu);
                return;
            }
            const opening = menu.hidden;
            menu.hidden = !opening;
            toggle.setAttribute("aria-expanded", opening ? "true" : "false");
            setMoreOpenState(toggle, menu, opening);
        });

        document.addEventListener("click", (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest("[data-ccg-more-toggle], [data-ccg-more-menu]")) return;
            closeMore(toggle, menu);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape" || menu.hidden) return;
            closeMore(toggle, menu);
            toggle.focus({ preventScroll: true });
        });
    }

    function isDesktop() {
        if (desktopMedia) return desktopMedia.matches;
        return window.innerWidth >= 1200;
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

    function restoreItems(items) {
        items.forEach((item) => {
            item.hidden = false;
            item.removeAttribute("data-ccg-nav-fit-overflow");
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
        delete more.dataset.ccgNavFitHasItems;
        more.hidden = true;
        menu.textContent = "";
        closeMore(toggle, menu);

        if (!isDesktop()) {
            fitting = false;
            return;
        }

        if (isOverflowing(header, nav)) {
            nav.classList.add("ccg-nav--fit-compact");
        }
        if (isOverflowing(header, nav)) {
            nav.classList.add("ccg-nav--fit-tight");
        }

        const hiddenItems = [];
        if (isOverflowing(header, nav)) {
            // Reserve space for the More control while deciding which lower
            // priority links must move into it. The final availability check
            // below hides it again unless at least one real link was moved.
            more.dataset.ccgNavFitHasItems = "true";
            more.hidden = false;
            nav.classList.add("ccg-nav--has-overflow");

            const candidates = items
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

        if (hiddenItems.length) {
            hiddenItems.sort((a, b) => items.indexOf(a) - items.indexOf(b));
            populateMore(menu, hiddenItems);
            setMoreAvailability(nav, more, toggle, menu, true);
        } else {
            setMoreAvailability(nav, more, toggle, menu, false);
        }

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
        const nav = document.querySelector("[data-ccg-header] .ccg-nav");
        if (!nav) return;

        const more = nav.querySelector(".ccg-nav__more");
        const toggle = nav.querySelector("[data-ccg-more-toggle]");
        const menu = nav.querySelector("[data-ccg-more-menu]");
        bindMoreControls(toggle, menu);

        if (more && menu) {
            delete more.dataset.ccgNavFitHasItems;
            more.hidden = true;
            closeMore(toggle, menu);
        }

        scheduleFit();
        scheduleFit(120);
        scheduleFit(500);

        window.addEventListener("resize", () => scheduleFit(40), { passive: true });
        window.addEventListener("orientationchange", () => scheduleFit(80), { passive: true });
        desktopMedia?.addEventListener?.("change", () => scheduleFit());

        const lists = nav.querySelectorAll("[data-ccg-nav-primary], [data-ccg-nav-secondary]");
        const observer = new MutationObserver(() => scheduleFit(20));
        lists.forEach((list) => observer.observe(list, { childList: true, subtree: true }));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
