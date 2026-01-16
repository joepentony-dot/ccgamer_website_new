(() => {
    const init = () => {
        if (typeof window !== "undefined" && typeof window.ccgInitNavScrollIndicator === "function") {
            window.ccgInitNavScrollIndicator();
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
