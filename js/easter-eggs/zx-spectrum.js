/* CCG EASTER EGG E6 — LOCAL ZX SPECTRUM */
(() => {
    "use strict";

    const root = document.querySelector("[data-zx-spectrum]");
    if (!root) return;

    const loaderOne = root.querySelector("[data-zx-loader-one]");
    const loaderTwo = root.querySelector("[data-zx-loader-two]");
    const teamCard = root.querySelector("[data-zx-team]");
    const reveal = root.querySelector("[data-zx-reveal]");
    const finalCard = root.querySelector("[data-zx-final]");
    const footer = root.querySelector("[data-zx-footer]");
    const voice = root.querySelector("[data-zx-voice]");
    const soundButton = root.querySelector('[data-zx-action="sound"]');

    let timers = [];
    let soundEnabled = true;
    let audioContext = null;
    let tapeNodes = null;

    const later = (callback, delay) => {
        const timer = window.setTimeout(callback, delay);
        timers.push(timer);
        return timer;
    };

    const clearTimers = () => {
        timers.forEach(window.clearTimeout);
        timers = [];
    };

    const getAudioContext = () => {
        if (!soundEnabled) return null;
        try {
            audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
            return audioContext;
        } catch (_) {
            return null;
        }
    };

    const stopTapeSound = () => {
        if (!tapeNodes) return;
        try {
            tapeNodes.carrier.stop();
            tapeNodes.modulator.stop();
            tapeNodes.chatter.stop();
        } catch (_) {}
        tapeNodes = null;
    };

    const startTapeSound = () => {
        stopTapeSound();
        const context = getAudioContext();
        if (!context) return;

        const carrier = context.createOscillator();
        const modulator = context.createOscillator();
        const chatter = context.createOscillator();
        const modGain = context.createGain();
        const chatterGain = context.createGain();
        const output = context.createGain();

        carrier.type = "square";
        carrier.frequency.value = 1250;
        modulator.type = "square";
        modulator.frequency.value = 24;
        modGain.gain.value = 390;
        chatter.type = "square";
        chatter.frequency.value = 2050;
        chatterGain.gain.value = 0.006;
        output.gain.value = 0.022;

        modulator.connect(modGain).connect(carrier.frequency);
        carrier.connect(output).connect(context.destination);
        chatter.connect(chatterGain).connect(context.destination);

        carrier.start();
        modulator.start();
        chatter.start();
        tapeNodes = { carrier, modulator, chatter };
    };

    const hideAll = () => {
        loaderOne.hidden = true;
        loaderTwo.hidden = true;
        teamCard.hidden = true;
        reveal.hidden = true;
        finalCard.hidden = true;
    };

    const closeEasterEgg = () => {
        stopTapeSound();
        window.parent.postMessage({ type: "ccg-easter-egg-close" }, window.location.origin);
    };

    const showClive = () => {
        hideAll();
        reveal.hidden = false;
        footer.textContent = "ZX SPECTRUM OVERRULED";

        if (soundEnabled && voice) {
            voice.currentTime = 0;
            voice.play().catch(() => {});
        }
    };

    const startSequence = () => {
        clearTimers();
        stopTapeSound();
        if (voice) {
            voice.pause();
            voice.currentTime = 0;
        }

        hideAll();
        loaderOne.hidden = false;
        footer.textContent = "LOADING FROM TAPE...";
        startTapeSound();

        later(() => {
            loaderOne.hidden = true;
            loaderTwo.hidden = false;
            footer.textContent = "PROGRAM LOADED";
        }, 5000);

        later(() => {
            stopTapeSound();
            hideAll();
            teamCard.hidden = false;
            footer.textContent = "SYSTEM CHECK";
        }, 10000);

        later(showClive, 11600);

        later(() => {
            hideAll();
            finalCard.hidden = false;
            footer.textContent = "COMMODORE MODE RESTORED";
        }, 15100);

        later(closeEasterEgg, 17800);
    };

    const toggleSound = () => {
        soundEnabled = !soundEnabled;
        soundButton.setAttribute("aria-pressed", String(soundEnabled));
        soundButton.textContent = `SOUND: ${soundEnabled ? "ON" : "OFF"}`;

        if (!soundEnabled) {
            stopTapeSound();
            if (voice) voice.pause();
        } else if (!loaderOne.hidden || !loaderTwo.hidden) {
            startTapeSound();
        }
    };

    root.addEventListener("click", event => {
        const button = event.target.closest("[data-zx-action]");
        if (!button) return;
        if (button.dataset.zxAction === "restart") startSequence();
        if (button.dataset.zxAction === "sound") toggleSound();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === "r" || event.key === "R") startSequence();
        if (event.key === "Escape") closeEasterEgg();
    });

    window.addEventListener("pagehide", () => {
        clearTimers();
        stopTapeSound();
    }, { once: true });

    later(startSequence, 250);
})();
