/* CCG EASTER EGG E6 — LOCAL ZX SPECTRUM */
(() => {
    "use strict";

    const root = document.querySelector("[data-zx-spectrum]");
    if (!root) return;

    const screen = root.querySelector(".zx__screen");
    const message = root.querySelector("[data-zx-message]");
    const soundButton = root.querySelector('[data-zx-action="sound"]');
    let loadingTimer = 0;
    let finishTimer = 0;
    let soundEnabled = true;
    let audioContext = null;

    const tone = (frequency, duration = 0.08) => {
        if (!soundEnabled) return;
        try {
            audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.type = "square";
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0.035, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
            oscillator.connect(gain).connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + duration);
        } catch (_) {}
    };

    const reset = () => {
        window.clearTimeout(loadingTimer);
        window.clearTimeout(finishTimer);
        screen.classList.remove("is-loading");
        message.hidden = true;
        tone(440, 0.05);
    };

    const showInterruption = () => {
        screen.classList.remove("is-loading");
        message.hidden = false;
        tone(165, 0.18);
        finishTimer = window.setTimeout(() => {
            window.parent.postMessage({ type: "ccg-easter-egg-close" }, window.location.origin);
        }, 4200);
    };

    const load = () => {
        reset();
        screen.classList.add("is-loading");
        tone(620, 0.05);
        loadingTimer = window.setTimeout(showInterruption, 5200);
    };

    const run = () => {
        reset();
        tone(520, 0.06);
        loadingTimer = window.setTimeout(showInterruption, 900);
    };

    const toggleSound = () => {
        soundEnabled = !soundEnabled;
        soundButton.setAttribute("aria-pressed", String(soundEnabled));
        soundButton.textContent = `SOUND: ${soundEnabled ? "ON" : "OFF"}`;
        if (soundEnabled) tone(700, 0.05);
    };

    root.addEventListener("click", event => {
        const button = event.target.closest("[data-zx-action]");
        if (!button) return;
        const action = button.dataset.zxAction;
        if (action === "load") load();
        if (action === "run") run();
        if (action === "reset") reset();
        if (action === "sound") toggleSound();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "l" || event.key === "L") load();
        if (event.key === "r" || event.key === "R") run();
        if (event.key === "Escape") reset();
    });

    window.addEventListener("pagehide", reset, { once: true });
    screen.focus({ preventScroll: true });
})();
