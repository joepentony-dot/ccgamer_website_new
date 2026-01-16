(() => {
    const header = document.querySelector("[data-ccg-header]");
    const drawer = document.querySelector("[data-ccg-nav-drawer]");
    const panel = drawer?.querySelector(".ccg-nav-drawer__panel");

    if (!header || !drawer || !panel) return;

    const phoneQuery = typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 640px) and (pointer: coarse)")
        : null;

    const STORAGE_KEY = "ccgNavScrollHintSeen";

    const readStoredFlag = () => {
        try {
            return sessionStorage.getItem(STORAGE_KEY) === "true";
        } catch (error) {
            try {
                return localStorage.getItem(STORAGE_KEY) === "true";
            } catch (fallbackError) {
                return false;
            }
        }
    };

    const writeStoredFlag = () => {
        try {
            sessionStorage.setItem(STORAGE_KEY, "true");
        } catch (error) {
            try {
                localStorage.setItem(STORAGE_KEY, "true");
            } catch (fallbackError) {
                return;
            }
        }
    };

    const isPhoneViewport = () => phoneQuery ? phoneQuery.matches : window.innerWidth <= 640;

    const isNavOpen = () => header.classList.contains("ccg-header--nav-open") || drawer.getAttribute("aria-hidden") === "false";

    const shouldShowHint = () => {
        if (!isPhoneViewport()) return false;
        const hasOverflow = panel.scrollHeight - panel.clientHeight > 12;
        const atTop = panel.scrollTop <= 6;
        return hasOverflow && atTop;
    };

    const clearHintClasses = () => {
        panel.classList.remove(
            "ccg-nav-drawer__panel--scroll-hint",
            "ccg-nav-drawer__panel--scroll-hint-first",
            "ccg-nav-drawer__panel--scroll-hint-repeat"
        );
    };

    const applyHintClass = (variant) => {
        clearHintClasses();
        if (!shouldShowHint()) return;
        panel.classList.add("ccg-nav-drawer__panel--scroll-hint", variant);
    };

    let hasSeenAttention = readStoredFlag();
    let scrollHandler = null;
    let attentionTimeout = null;

    const showAttentionHint = () => {
        applyHintClass("ccg-nav-drawer__panel--scroll-hint-first");
        if (!hasSeenAttention) {
            hasSeenAttention = true;
            writeStoredFlag();
        }
        if (attentionTimeout) {
            window.clearTimeout(attentionTimeout);
        }
        attentionTimeout = window.setTimeout(() => {
            attentionTimeout = null;
            if (isNavOpen() && shouldShowHint()) {
                applyHintClass("ccg-nav-drawer__panel--scroll-hint-repeat");
            } else {
                clearHintClasses();
            }
        }, 2000);
    };

    const showRepeatHint = () => {
        applyHintClass("ccg-nav-drawer__panel--scroll-hint-repeat");
    };

    const handleNavOpen = () => {
        if (!isPhoneViewport()) {
            clearHintClasses();
            return;
        }

        if (!scrollHandler) {
            scrollHandler = () => {
                if (!isNavOpen()) return;
                if (panel.classList.contains("ccg-nav-drawer__panel--scroll-hint-first")) {
                    if (!shouldShowHint()) {
                        clearHintClasses();
                    }
                    return;
                }
                if (shouldShowHint()) {
                    showRepeatHint();
                } else {
                    clearHintClasses();
                }
            };
            panel.addEventListener("scroll", scrollHandler, { passive: true });
            panel.addEventListener("touchmove", scrollHandler, { passive: true });
        }

        if (!shouldShowHint()) {
            clearHintClasses();
            return;
        }

        if (!hasSeenAttention) {
            showAttentionHint();
        } else if (!panel.classList.contains("ccg-nav-drawer__panel--scroll-hint-first")) {
            showRepeatHint();
        }
    };

    const handleNavClose = () => {
        clearHintClasses();
        if (attentionTimeout) {
            window.clearTimeout(attentionTimeout);
            attentionTimeout = null;
        }
    };

    const refreshHint = () => {
        if (!isNavOpen()) {
            handleNavClose();
            return;
        }
        handleNavOpen();
    };

    const observer = new MutationObserver(() => {
        if (isNavOpen()) {
            requestAnimationFrame(() => handleNavOpen());
        } else {
            handleNavClose();
        }
    });

    observer.observe(header, { attributes: true, attributeFilter: ["class"] });
    observer.observe(drawer, { attributes: true, attributeFilter: ["aria-hidden"] });

    if (phoneQuery?.addEventListener) {
        phoneQuery.addEventListener("change", () => refreshHint());
    } else if (phoneQuery?.addListener) {
        phoneQuery.addListener(() => refreshHint());
    }

    window.addEventListener("resize", () => refreshHint());
    window.addEventListener("orientationchange", () => refreshHint());

    if (isNavOpen()) {
        handleNavOpen();
    }
})();
