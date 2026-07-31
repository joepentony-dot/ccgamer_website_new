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
    let voiceBuffer = null;
    let voiceBufferPromise = null;
    let voiceSource = null;

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
            if (audioContext.state === "suspended") {
                audioContext.resume().catch(() => {});
            }
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

    const stopVoice = () => {
        if (voiceSource) {
            try {
                voiceSource.stop();
            } catch (_) {}
            try {
                voiceSource.disconnect();
            } catch (_) {}
            voiceSource = null;
        }

        if (voice) {
            voice.pause();
            voice.currentTime = 0;
        }
    };

    const loadVoiceBuffer = () => {
        if (voiceBuffer) return Promise.resolve(voiceBuffer);
        if (voiceBufferPromise) return voiceBufferPromise;

        const context = getAudioContext();
        const sourceUrl = voice?.currentSrc || voice?.getAttribute("src");
        if (!context || !sourceUrl) return Promise.resolve(null);

        voiceBufferPromise = fetch(sourceUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Voice audio failed: ${response.status}`);
                return response.arrayBuffer();
            })
            .then(arrayBuffer => context.decodeAudioData(arrayBuffer.slice(0)))
            .then(buffer => {
                voiceBuffer = buffer;
                return buffer;
            })
            .catch(() => null);

        return voiceBufferPromise;
    };

    const playVoice = async () => {
        stopVoice();
        if (!soundEnabled) return;

        const context = getAudioContext();
        const buffer = await loadVoiceBuffer();

        if (context && buffer && soundEnabled) {
            if (context.state === "suspended") {
                await context.resume().catch(() => {});
            }

            if (context.state === "running") {
                const source = context.createBufferSource();
                source.buffer = buffer;
                source.connect(context.destination);
                source.addEventListener("ended", () => {
                    if (voiceSource === source) voiceSource = null;
                }, { once: true });
                source.start(0);
                voiceSource = source;
                return;
            }
        }

        if (voice && soundEnabled) {
            voice.currentTime = 0;
            voice.play().catch(() => {});
        }
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
        stopVoice();
        window.parent.postMessage({ type: "ccg-easter-egg-close" }, window.location.origin);
    };

    const showClive = () => {
        stopTapeSound();
        hideAll();
        reveal.hidden = false;
        footer.textContent = "ZX SPECTRUM OVERRULED";
        void playVoice();
    };

    const startSequence = () => {
        clearTimers();
        stopTapeSound();
        stopVoice();

        hideAll();
        loaderOne.hidden = false;
        footer.textContent = "LOADING FROM TAPE...";
        startTapeSound();
        void loadVoiceBuffer();

        later(() => {
            stopTapeSound();
            loaderOne.hidden = true;
            loaderTwo.hidden = false;
            footer.textContent = "PROGRAM LOADED";
        }, 5000);

        later(() => {
            hideAll();
            teamCard.hidden = false;
            footer.textContent = "SYSTEM CHECK";
        }, 10000);

        later(showClive, 11600);

        later(() => {
            stopVoice();
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
            stopVoice();
        } else if (!loaderOne.hidden) {
            startTapeSound();
            void loadVoiceBuffer();
        } else if (!reveal.hidden) {
            void playVoice();
        }
    };

    root.addEventListener("click", event => {
        const button = event.target.closest("[data-zx-action]");
        if (!button) return;
        if (button.dataset.zxAction === "restart") startSequence();
        if (button.dataset.zxAction === "sound") toggleSound();
    });

    root.addEventListener("pointerdown", () => {
        const context = getAudioContext();
        if (context?.state === "suspended") {
            context.resume().catch(() => {});
        }
        void loadVoiceBuffer();
    }, { once: true });

    document.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === "r" || event.key === "R") startSequence();
        if (event.key === "Escape") closeEasterEgg();
    });

    window.addEventListener("pagehide", () => {
        clearTimers();
        stopTapeSound();
        stopVoice();
    }, { once: true });

    later(startSequence, 250);
})();
