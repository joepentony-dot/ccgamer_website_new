(() => {
    "use strict";

    const root = document.querySelector("[data-ccg-pacman]");
    if (!root) return;

    const focusGame = () => {
        try {
            window.focus();
            if (!document.body.hasAttribute("tabindex")) document.body.tabIndex = -1;
            document.body.focus({ preventScroll: true });
        } catch (_) {}
    };

    const keyMap = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down"
    };

    const pressDirection = direction => {
        const button = root.querySelector(`[data-direction="${direction}"]`);
        if (!button) return;
        button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    };

    window.addEventListener("load", () => {
        window.setTimeout(focusGame, 50);
    }, { once: true });

    root.addEventListener("pointerdown", focusGame, { passive: true });
    root.addEventListener("click", focusGame, { passive: true });

    window.addEventListener("message", event => {
        if (!event.data || event.data.type !== "ccg-pacman-key") return;
        const direction = keyMap[event.data.key];
        if (direction) pressDirection(direction);
    });

    document.addEventListener("keydown", event => {
        const direction = keyMap[event.key];
        if (!direction) return;
        event.preventDefault();
        pressDirection(direction);
    }, { capture: true });
})();
