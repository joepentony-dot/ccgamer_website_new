/* CCG EASTER EGG E6 — LOCAL ZX SPECTRUM */
(() => {
    "use strict";

    const root = document.querySelector("[data-zx-spectrum]");
    if (!root) return;

    const screen = root.querySelector(".zx__screen");
    const boot = root.querySelector("[data-zx-boot]");
    const checks = root.querySelector("[data-zx-checks]");
    const status = root.querySelector("[data-zx-status]");
    const basic = root.querySelector("[data-zx-basic]");
    const program = root.querySelector("[data-zx-program]");
    const loadingCopy = root.querySelector("[data-zx-loading-copy]");
    const reveal = root.querySelector("[data-zx-reveal]");
    const finalCard = root.querySelector("[data-zx-final]");
    const footer = root.querySelector("[data-zx-footer]");
    const voice = root.querySelector("[data-zx-voice]");
    const soundButton = root.querySelector('[data-zx-action="sound"]');

    let timers = [];
    let soundEnabled = true;
    let audioContext = null;
    let loadingNoise = null;

    const later = (callback, delay) => {
        const timer = window.setTimeout(callback, delay);
        timers.push(timer);
        return timer;
    };

    const clearTimers = () => {
        timers.forEach(window.clearTimeout);
        timers = [];
    };

    const context = () => {
        if (!soundEnabled) return null;
        try {
            audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
            return audioContext;
        } catch (_) {
            return null;
        }
    };

    const tone = (frequency, duration = 0.07, gainValue = 0.025) => {
        const ctx = context();
        if (!ctx) return;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(gainValue, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + duration);
    };

    const stopLoadingNoise = () => {
        if (!loadingNoise) return;
        try {
            loadingNoise.oscillator.stop();
            loadingNoise.modulator.stop();
        } catch (_) {}
        loadingNoise = null;
    };

    const startLoadingNoise = () => {
        stopLoadingNoise();
        const ctx = context();
        if (!ctx) return;

        const oscillator = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        const gain = ctx.createGain();

        oscillator.type = "square";
        oscillator.frequency.value = 1240;
        modulator.type = "square";
        modulator.frequency.value = 27;
        modGain.gain.value = 430;
        gain.gain.value = 0.018;

        modulator.connect(modGain).connect(oscillator.frequency);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start();
        modulator.start();
        loadingNoise = { oscillator, modulator };
    };

    const setStage = stage => {
        screen.classList.remove("is-pilot", "is-data");
        if (stage) screen.classList.add(stage);
    };

    const hideAll = () => {
        boot.hidden = true;
        basic.hidden = true;
        reveal.hidden = true;
        finalCard.hidden = true;
        program.hidden = true;
        loadingCopy.hidden = true;
    };

    const closeEasterEgg = () => {
        window.parent.postMessage({ type: "ccg-easter-egg-close" }, window.location.origin);
    };

    const showReveal = () => {
        stopLoadingNoise();
        setStage("");
        hideAll();
        reveal.hidden = false;
        footer.textContent = "EMULATION INTERRUPTED";
        tone(165, 0.18, 0.035);

        if (soundEnabled && voice) {
            voice.currentTime = 0;
            voice.play().catch(() => {});
        }

        later(() => {
            reveal.hidden = true;
            finalCard.hidden = false;
            footer.textContent = "COMMODORE MODE RESTORED";
        }, 3100);

        later(closeEasterEgg, 6100);
    };

    const beginTapeLoad = () => {
        status.textContent = "ROM READY";
        boot.hidden = true;
        basic.hidden = false;
        program.hidden = false;
        loadingCopy.hidden = false;
        footer.textContent = "TAPE INPUT: CHEEKY_EMULATOR";
        setStage("is-pilot");
        startLoadingNoise();

        later(() => {
            setStage("is-data");
            footer.textContent = "LOADING SNAPSHOT...";
        }, 1900);

        later(() => {
            loadingCopy.textContent = "Loading BASIC...";
        }, 3000);

        later(() => {
            loadingCopy.textContent = "Loading ROM...";
        }, 3850);

        later(() => {
            loadingCopy.textContent = "Loading Interface...";
        }, 4650);

        later(() => {
            loadingCopy.textContent = "Please wait...";
        }, 5350);

        later(showReveal, 6400);
    };

    const startSequence = () => {
        clearTimers();
        stopLoadingNoise();
        if (voice) {
            voice.pause();
            voice.currentTime = 0;
        }

        setStage("");
        hideAll();
        boot.hidden = false;
        checks.textContent = "";
        status.textContent = "INITIALISING...";
        footer.textContent = "ROM READY";

        const checkLines = [
            "Checking ROM........OK",
            "Checking RAM........OK",
            "Initialising ULA....OK",
            "Loading Keyboard....OK",
            "Loading Tape I/O....OK",
            "Mounting Emulator...OK"
        ];

        checkLines.forEach((line, index) => {
            later(() => {
                checks.textContent += `${line}\n`;
                tone(520 + (index * 35), 0.045);
            }, 650 + (index * 420));
        });

        later(() => {
            status.textContent = "ZX SPECTRUM 48K READY";
            tone(880, 0.09);
        }, 3300);

        later(() => {
            hideAll();
            basic.hidden = false;
            footer.textContent = "48K BASIC — OK";
            tone(660, 0.06);
        }, 4050);

        later(beginTapeLoad, 5250);
    };

    const toggleSound = () => {
        soundEnabled = !soundEnabled;
        soundButton.setAttribute("aria-pressed", String(soundEnabled));
        soundButton.textContent = `SOUND: ${soundEnabled ? "ON" : "OFF"}`;
        if (!soundEnabled) {
            stopLoadingNoise();
            if (voice) voice.pause();
        } else {
            tone(700, 0.05);
            if (screen.classList.contains("is-pilot") || screen.classList.contains("is-data")) {
                startLoadingNoise();
            }
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
        stopLoadingNoise();
    }, { once: true });

    screen.focus({ preventScroll: true });
    later(startSequence, 250);
})();
