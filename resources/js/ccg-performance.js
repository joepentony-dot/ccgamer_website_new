(function () {
    "use strict";

    const desktopQuery = window.matchMedia?.("(min-width: 1024px)");
    const finePointerQuery = window.matchMedia?.("(pointer: fine)");
    if (!desktopQuery || !desktopQuery.matches) return;
    if (finePointerQuery && !finePointerQuery.matches) return;

    const root = document.documentElement;
    const body = document.body;
    const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const state = {
        idle: false,
        scrolling: false,
        visible: !document.hidden
    };

    root.classList.add("ccg-perf-desktop");

    let idleTimer = null;
    let scrollTimer = null;
    const idleDelay = 5000;
    const scrollIdleDelay = 150;

    function shouldPause() {
        if (!state.visible) return true;
        return state.idle && !state.scrolling;
    }

    function applyPauseState() {
        root.classList.toggle("ccg-perf-paused", shouldPause());
    }

    function markActive() {
        state.idle = false;
        applyPauseState();
        resetIdleTimer();
    }

    function resetIdleTimer() {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = window.setTimeout(() => {
            state.idle = true;
            applyPauseState();
        }, idleDelay);
    }

    function handleScroll() {
        state.scrolling = true;
        body?.classList.add("scrolling");
        applyPauseState();
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(() => {
            state.scrolling = false;
            body?.classList.remove("scrolling");
            applyPauseState();
        }, scrollIdleDelay);
    }

    function handleVisibility() {
        state.visible = !document.hidden;
        applyPauseState();
    }

    window.addEventListener("mousemove", markActive, { passive: true });
    window.addEventListener("pointermove", markActive, { passive: true });
    window.addEventListener("pointerdown", markActive, { passive: true });
    window.addEventListener("keydown", markActive, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("focus", markActive, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    resetIdleTimer();
    applyPauseState();

    const originalRaf = window.requestAnimationFrame.bind(window);
    const throttleFps = reducedMotionQuery?.matches ? 30 : 45;
    const frameInterval = 1000 / throttleFps;
    let lastFrameTime = 0;

    window.requestAnimationFrame = function (callback) {
        if (!desktopQuery.matches || !shouldPause()) {
            return originalRaf(callback);
        }

        const wrapped = (timestamp) => {
            if (timestamp - lastFrameTime >= frameInterval) {
                lastFrameTime = timestamp;
                callback(timestamp);
                return;
            }
            originalRaf(wrapped);
        };

        return originalRaf(wrapped);
    };
})();
