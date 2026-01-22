(() => {
    const init = () => {
        if (typeof window !== "undefined" && typeof window.ccgInitNavScrollIndicator === "function") {
            window.ccgInitNavScrollIndicator();
        }
    };

    const runInit = () => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init, { once: true });
        } else {
            init();
        }
    };

    const root = document.documentElement;
    const isMobileLite = root.classList.contains("ccg-mobile-lite");

    if (!isMobileLite) {
        runInit();
        return;
    }

    if (root.classList.contains("ccg-visuals-ready")) {
        runInit();
        return;
    }

    document.addEventListener("ccg-visuals-ready", runInit, { once: true });
})();
