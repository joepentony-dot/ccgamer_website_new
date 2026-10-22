/* ============================================================
   CCG ADAPTIVE DESKTOP NAVIGATION
   ------------------------------------------------------------
   Desktop More is owned here and nowhere else. Archive destinations
   appear by relevance, followed by merchandise, installation, CCG
   Games, About Me and Contact. The canonical lists and mobile drawer
   remain unchanged.
============================================================ */

(function () {
    "use strict";

    if (window.CCG_NAV_FIT_READY) return;
    window.CCG_NAV_FIT_READY = true;

    const CSS_PATH = "/resources/css/ccg-nav-fit.css";
    const DESKTOP_QUERY = "(min-width: 1200px)";
    const desktopMedia = window.matchMedia ? window.matchMedia(DESKTOP_QUERY) : null;
    const PINNED_MORE_LABELS = new Set(["ccg games", "install ccg app", "about", "about me", "contact"]);
    const UX_PINNED_MORE_LABELS = new Set(["browse by genre", "publishers", "collections", "music hub", "find me a game", "zzap!64 reviews & awards", "quiz", "emulation"]);
    /* The More menu prioritises game discovery, with supporting links last.
       This does not change canonical source lists or the mobile drawer. */
    const MORE_ARCHIVE_ORDER = [
        "browse by genre",
        "publishers",
        "collections",
        "find me a game",
        "music hub",
        "zzap!64 reviews & awards",
        "quiz",
        "emulation"
    ];
    const BASE_MORE_LINKS = [
        ["Merch Shop", "https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp"],
        ["Install CCG App", "/install-app.html"],
        ["CCG Games", "/games/ccg-games/"],
        ["About Me", "/about.html"],
        ["Contact", "/contact.html"]
    ];
    let fitFrame = 0;
    let fitTimer = 0;
    let fitting = false;
    let lastFitSignature = "";
    let lastFittedNav = null;
    const menuSignatures = new WeakMap();

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
        if (label.includes("install")) return 14;
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

    function supportsPopover(menu) {
        return Boolean(menu && typeof menu.showPopover === "function" && typeof menu.hidePopover === "function");
    }

    function isPopoverOpen(menu) {
        if (!supportsPopover(menu)) return false;
        try { return menu.matches(":popover-open"); }
        catch (_error) { return false; }
    }

    function clearPopoverPosition(menu) {
        if (!menu) return;
        menu.style.removeProperty("left");
        menu.style.removeProperty("top");
        menu.removeAttribute("data-ccg-more-top-layer");
    }

    function positionPopover(toggle, menu) {
        if (!toggle || !menu || !isPopoverOpen(menu)) return;

        const gap = 8;
        const edge = 8;
        const toggleRect = toggle.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

        let left = toggleRect.right - menuRect.width;
        left = Math.max(edge, Math.min(left, viewportWidth - menuRect.width - edge));

        let top = toggleRect.bottom + gap;
        if (top + menuRect.height > viewportHeight - edge) {
            top = Math.max(edge, toggleRect.top - gap - menuRect.height);
        }

        menu.style.left = `${Math.round(left)}px`;
        menu.style.top = `${Math.round(top)}px`;
        menu.setAttribute("data-ccg-more-top-layer", "true");
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

        if (isPopoverOpen(menu)) {
            try { menu.hidePopover(); }
            catch (_error) {}
        }
        clearPopoverPosition(menu);
        menu.hidden = true;
        setMoreOpenState(toggle, menu, false);
    }

    function openMore(toggle, menu) {
        if (!toggle || !menu || !menuHasOverflowLinks(menu)) return false;

        menu.hidden = false;
        toggle.setAttribute("aria-expanded", "true");

        if (supportsPopover(menu)) {
            try {
                if (menu.getAttribute("popover") !== "manual") menu.setAttribute("popover", "manual");
                if (!isPopoverOpen(menu)) menu.showPopover();
                positionPopover(toggle, menu);
            } catch (_error) {
                menu.removeAttribute("popover");
                clearPopoverPosition(menu);
            }
        }

        setMoreOpenState(toggle, menu, true);
        return true;
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
                if (nav && more && menu) {
                    populateMore(menu, []);
                    syncMoreAvailability(nav, more, toggle, menu);
                }
                return;
            }

            if (menu.hidden) openMore(toggle, menu);
            else closeMore(toggle, menu);
        }, true);

        header.addEventListener("click", (event) => {
            const target = event.target instanceof Element ? event.target : null;
            const link = target?.closest("[data-ccg-more-menu] a[href]");
            if (!link || !header.contains(link)) return;
            const nav = header.querySelector(".ccg-nav");
            closeMore(
                nav?.querySelector("[data-ccg-more-toggle]"),
                nav?.querySelector("[data-ccg-more-menu]")
            );
        });

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

    function measureFitBounds(header) {
        const inner = header.querySelector(".ccg-header-inner");
        return {
            allowed: Math.max(0, Math.floor(inner?.clientWidth || window.innerWidth)),
            innerRect: inner?.getBoundingClientRect() || null
        };
    }

    function isOverflowing(nav, bounds) {
        const allowed = Number(bounds?.allowed || 0);
        const required = Math.ceil(nav.scrollWidth);
        const navRect = nav.getBoundingClientRect();
        const innerRect = bounds?.innerRect || null;
        const clippedRight = innerRect ? navRect.right > innerRect.right + 1 : false;
        const clippedLeft = innerRect ? navRect.left < innerRect.left - 1 : false;
        return required > allowed + 2 || clippedRight || clippedLeft;
    }

    function allNavItems(nav) {
        return Array.from(nav.querySelectorAll(
            "[data-ccg-nav-primary] > li, [data-ccg-nav-secondary] > li"
        )).filter((item) => item.querySelector(".ccg-nav__link"));
    }

    function isPinnedMoreItem(item) {
        const label = normalizeLabel(item?.querySelector(".ccg-nav__link")?.textContent);
        return PINNED_MORE_LABELS.has(label) || UX_PINNED_MORE_LABELS.has(label);
    }

    function restoreItems(items) {
        items.forEach((item) => {
            item.hidden = false;
            item.removeAttribute("data-ccg-nav-fit-overflow");
            item.removeAttribute("data-ccg-nav-fit-pinned");
        });
    }

    function appendMoreLink(menu, label, href, seen) {
        const absolute = new URL(href, window.location.href).href;
        if (seen.has(absolute)) return;
        const link = document.createElement("a");
        link.href = href;
        link.className = "ccg-nav__link ccg-nav-fit__link";
        link.textContent = label;
        link.setAttribute("role", "menuitem");
        if (label === "Merch Shop") {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.setAttribute("data-ccg-revenue-link", "fourthwall-merch");
            link.setAttribute("aria-label", "Open the official CCG merch shop (new tab)");
        }
        menu.appendChild(link);
        seen.add(absolute);
    }

    function populateMore(menu, hiddenItems) {
        const signature = hiddenItems.map(item => item.querySelector(".ccg-nav__link")?.outerHTML || "").join("\n");
        if (menuSignatures.get(menu) === signature && menu.children.length) return;
        menuSignatures.set(menu, signature);
        menu.textContent = "";
        const seen = new Set();
        const supportingHrefs = new Set(BASE_MORE_LINKS.map(([, href]) => new URL(href, window.location.href).href));

        /* The full archive comes first even when it spans primary and
           secondary canonical lists. Unknown overflow links stay behind the
           named archive destinations, but ahead of supporting links. */
        const sortedItems = hiddenItems
            .map((item, index) => {
                const source = item.querySelector(".ccg-nav__link");
                const label = normalizeLabel(source?.textContent);
                const rank = MORE_ARCHIVE_ORDER.indexOf(label);
                return { source, index, rank: rank < 0 ? MORE_ARCHIVE_ORDER.length : rank };
            })
            .sort((a, b) => a.rank - b.rank || a.index - b.index);

        sortedItems.forEach(({ source }) => {
            if (!source) return;
            const absolute = new URL(source.href, window.location.href).href;
            if (seen.has(absolute) || supportingHrefs.has(absolute)) return;
            const link = source.cloneNode(true);
            link.classList.add("ccg-nav-fit__link");
            link.removeAttribute("id");
            link.setAttribute("role", "menuitem");
            menu.appendChild(link);
            seen.add(absolute);
        });

        /* Merchandise, installation, CCG Games and information belong at
           the foot, with About Me and Contact always the final two links. */
        BASE_MORE_LINKS.forEach(([label, href]) => appendMoreLink(menu, label, href, seen));
    }

    function announceFitted(nav) {
        document.dispatchEvent(new CustomEvent("ccg:navigation-fitted", { detail: { nav } }));
    }

    /* A single direct Play C64 action uses the existing header styling;
       secondary archive destinations remain in the existing More menu. */
    function ensurePlayOnlineLink(nav) {
        const bar = nav?.querySelector(".ccg-nav__bar");
        const more = bar?.querySelector(".ccg-nav__more");
        if (!bar || !more) return;
        let link = bar.querySelector("[data-ccg-play-online-link]");
        if (link) return;
        link = document.createElement("a");
        link.href = "/emulator/c64/";
        link.className = "ccg-nav__link ccg-nav-fit__play";
        link.setAttribute("data-ccg-play-online-link", "true");
        link.textContent = "Play C64";
        bar.insertBefore(link, more);
    }

    function fitNavigation() {
        if (fitting) return;
        const header = document.querySelector("[data-ccg-header]");
        const nav = header?.querySelector(".ccg-nav");
        const more = nav?.querySelector(".ccg-nav__more");
        const toggle = nav?.querySelector("[data-ccg-more-toggle]");
        const menu = nav?.querySelector("[data-ccg-more-menu]");
        if (!header || !nav || !more || !toggle || !menu) return;

        const desktop = isDesktop();
        const items = allNavItems(nav);
        const signature = `${window.innerWidth}|${desktop}|${document.fonts?.status}|${items.map(item => item.querySelector(".ccg-nav__link")?.outerHTML || "").join("\n")}`;
        if (lastFittedNav === nav && lastFitSignature === signature) return;
        lastFittedNav = nav;
        lastFitSignature = signature;
        if (desktop) ensurePlayOnlineLink(nav);
        nav.classList.toggle("ccg-nav--ux-compact", desktop);
        const restoreOpen = desktop
            && toggle.getAttribute("aria-expanded") === "true"
            && !menu.hidden;

        fitting = true;
        restoreItems(items);
        nav.classList.remove("ccg-nav--fit-compact", "ccg-nav--fit-tight", "ccg-nav--has-overflow");
        closeMore(toggle, menu);

        if (!desktop) {
            more.hidden = true;
            toggle.disabled = true;
            toggle.setAttribute("aria-hidden", "true");
            syncMoreAvailability(nav, more, toggle, menu);
            fitting = false;
            announceFitted(nav);
            return;
        }

        /* Keep the desktop More slot reserved throughout fitting. CSS has
           already hidden the pinned secondary copies before first paint. */
        more.hidden = false;
        toggle.disabled = false;
        toggle.setAttribute("aria-hidden", "false");

        const hiddenItems = [];
        items.filter(isPinnedMoreItem).forEach((item) => {
            item.hidden = true;
            item.setAttribute("data-ccg-nav-fit-pinned", "true");
            hiddenItems.push(item);
        });

        populateMore(menu, hiddenItems);
        syncMoreAvailability(nav, more, toggle, menu);

        /*
         * ccg-nav-fit.css owns the settled desktop density from first paint,
         * so do not mutate compact/tight classes and immediately re-measure.
         * Capture the stable header bounds once, then only re-read the nav
         * itself when overflow candidates are actually removed.
         */
        const fitBounds = measureFitBounds(header);

        if (isOverflowing(nav, fitBounds)) {
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
                if (!isOverflowing(nav, fitBounds) || visibleCount <= 5) break;
                candidate.item.hidden = true;
                candidate.item.setAttribute("data-ccg-nav-fit-overflow", "true");
                hiddenItems.push(candidate.item);
            }
        }

        hiddenItems.sort((a, b) => items.indexOf(a) - items.indexOf(b));
        populateMore(menu, hiddenItems);
        const available = syncMoreAvailability(nav, more, toggle, menu);
        if (restoreOpen && available) openMore(toggle, menu);
        fitting = false;
        announceFitted(nav);
    }

    function scheduleFit(delay = 0) {
        if (fitFrame) cancelAnimationFrame(fitFrame);
        if (fitTimer) {
            clearTimeout(fitTimer);
            fitTimer = 0;
        }

        const run = () => {
            fitFrame = requestAnimationFrame(() => {
                fitFrame = 0;
                fitNavigation();
            });
        };

        if (delay > 0) fitTimer = window.setTimeout(() => {
            fitTimer = 0;
            run();
        }, delay);
        else run();
    }

    function init() {
        ensureCss();
        const header = document.querySelector("[data-ccg-header]");
        const nav = header?.querySelector(".ccg-nav");
        if (!header || !nav) return;

        bindMoreControls(header);
        scheduleFit();

        if (document.fonts?.ready) {
            document.fonts.ready.then(() => { lastFitSignature = ""; scheduleFit(); }).catch(() => {});
        }
        window.addEventListener("load", () => scheduleFit(), { once: true, passive: true });
        window.addEventListener("resize", () => scheduleFit(30), { passive: true });
        window.addEventListener("orientationchange", () => scheduleFit(60), { passive: true });
        window.addEventListener("pageshow", () => scheduleFit(20), { passive: true });
        document.addEventListener("ccg:navigation-ready", () => { lastFitSignature = ""; scheduleFit(); });
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