(() => {
    const header = document.querySelector("[data-ccg-header]");
    const drawer = document.querySelector("[data-ccg-nav-drawer]");
    const panel = drawer?.querySelector(".ccg-nav-drawer__panel");

    if (!header || !drawer || !panel) return;

    const phoneQuery = typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 640px) and (pointer: coarse)")
        : null;

    const STORAGE_KEY = "ccgNavScrollIndicatorSeen";

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

    const hasOverflow = () => panel.scrollHeight - panel.clientHeight > 12;

    const atTop = () => panel.scrollTop <= 0;

    const INDICATOR_CLASS = "ccg-menu-scroll-indicator";
    const VISIBLE_CLASS = "ccg-menu-scroll-indicator--visible";
    const ATTENTION_CLASS = "ccg-menu-scroll-indicator--attention";
    const SUBTLE_CLASS = "ccg-menu-scroll-indicator--subtle";
    const DISMISSED_CLASS = "ccg-menu-scroll-indicator--dismissed";

    let indicator = null;
    let hasSeenAttention = readStoredFlag();
    let attentionTimeout = null;
    let scrollHandler = null;
    let dismissedForOpen = false;

    const ensureIndicator = () => {
        if (indicator && indicator.parentElement) return indicator;
        const wrapper = document.createElement("div");
        wrapper.className = INDICATOR_CLASS;
        wrapper.setAttribute("aria-hidden", "true");

        const chevronTop = document.createElement("span");
        chevronTop.className = `${INDICATOR_CLASS}__chevron`;
        const chevronBottom = document.createElement("span");
        chevronBottom.className = `${INDICATOR_CLASS}__chevron`;

        wrapper.appendChild(chevronTop);
        wrapper.appendChild(chevronBottom);
        panel.appendChild(wrapper);
        indicator = wrapper;
        return indicator;
    };

    const clearIndicatorClasses = () => {
        if (!indicator) return;
        indicator.classList.remove(
            VISIBLE_CLASS,
            ATTENTION_CLASS,
            SUBTLE_CLASS,
            DISMISSED_CLASS
        );
    };

    const hideIndicator = () => {
        if (!indicator) return;
        indicator.classList.remove(VISIBLE_CLASS, ATTENTION_CLASS, SUBTLE_CLASS);
        indicator.classList.add(DISMISSED_CLASS);
    };

    const showIndicator = (variant) => {
        if (!indicator) return;
        indicator.classList.remove(ATTENTION_CLASS, SUBTLE_CLASS, DISMISSED_CLASS);
        indicator.classList.add(VISIBLE_CLASS, variant);
    };

    const handleAttentionTimeout = () => {
        if (attentionTimeout) {
            window.clearTimeout(attentionTimeout);
        }
        attentionTimeout = window.setTimeout(() => {
            attentionTimeout = null;
            if (isNavOpen() && hasOverflow() && atTop() && !dismissedForOpen) {
                showIndicator(SUBTLE_CLASS);
            } else {
                hideIndicator();
            }
        }, 2000);
    };

    const updateIndicator = () => {
        if (!indicator) return;
        if (!isPhoneViewport() || !isNavOpen()) {
            hideIndicator();
            return;
        }

        if (!hasOverflow()) {
            hideIndicator();
            return;
        }

        if (!atTop() || dismissedForOpen) {
            hideIndicator();
            return;
        }

        if (!hasSeenAttention) {
            showIndicator(ATTENTION_CLASS);
            hasSeenAttention = true;
            writeStoredFlag();
            handleAttentionTimeout();
            return;
        }

        showIndicator(SUBTLE_CLASS);
    };

    const handleNavOpen = () => {
        if (!isPhoneViewport()) {
            clearIndicatorClasses();
            return;
        }

        ensureIndicator();

        if (!scrollHandler) {
            scrollHandler = () => {
                if (!isNavOpen()) return;
                if (panel.scrollTop > 0) {
                    dismissedForOpen = true;
                    hideIndicator();
                    return;
                }
                updateIndicator();
            };
            panel.addEventListener("scroll", scrollHandler, { passive: true });
            panel.addEventListener("touchmove", scrollHandler, { passive: true });
        }

        dismissedForOpen = false;
        updateIndicator();
    };

    const handleNavClose = () => {
        if (attentionTimeout) {
            window.clearTimeout(attentionTimeout);
            attentionTimeout = null;
        }
        if (indicator?.parentElement) {
            indicator.parentElement.removeChild(indicator);
        }
        indicator = null;
    };

    const refreshIndicator = () => {
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
        phoneQuery.addEventListener("change", () => refreshIndicator());
    } else if (phoneQuery?.addListener) {
        phoneQuery.addListener(() => refreshIndicator());
    }

    window.addEventListener("resize", () => refreshIndicator());
    window.addEventListener("orientationchange", () => refreshIndicator());

    if (isNavOpen()) {
        handleNavOpen();
    }
})();
