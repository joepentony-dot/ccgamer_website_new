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

    const CLIVE_REVEAL_DELAY_MS = 11600;

    let timers = [];
    let soundEnabled = true;
    let audioContext = null;
    let tapeNodes = null;
    let voiceBuffer = null;
    let voiceBufferPromise = null;
    let voiceSchedulePromise = null;
    let voiceSource = null;
    let voiceArmed = false;
    let sequenceStartedAt = 0;
    let sequenceRunId = 0;

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

    const stopVoiceSource = () => {
        if (!voiceSource) return;
        try {
            voiceSource.stop();
        } catch (_) {}
        try {
            voiceSource.disconnect();
        } catch (_) {}
        voiceSource = null;
    };

    const stopVoice = () => {
        stopVoiceSource();
        voiceArmed = false;

        if (voice) {
            voice.pause();
            voice.currentTime = 0;
        }
    };

    const getVoiceUrl = () => {
        const source = voice?.getAttribute("src");
        if (!source) return "";
        return new URL(source, document.baseURI).href;
    };

    const loadVoiceBuffer = () => {
        if (voiceBuffer) return Promise.resolve(voiceBuffer);
        if (voiceBufferPromise) return voiceBufferPromise;

        const context = getAudioContext();
        const sourceUrl = getVoiceUrl();
        if (!context || !sourceUrl) return Promise.resolve(null);

        voiceBufferPromise = fetch(sourceUrl, { cache: "force-cache" })
            .then(response => {
                if (!response.ok) throw new Error(`Voice audio failed: ${response.status}`);
                return response.arrayBuffer();
            })
            .then(arrayBuffer => context.decodeAudioData(arrayBuffer.slice(0)))
            .then(buffer => {
                voiceBuffer = buffer;
                return buffer;
            })
            .catch(error => {
                voiceBufferPromise = null;
                console.warn("[CCG E6] Sir Clive audio preload failed.", error);
                return null;
            });

        return voiceBufferPromise;
    };

    const createVoiceSource = (context, buffer, startDelaySeconds = 0) => {
        stopVoiceSource();

        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.addEventListener("ended", () => {
            if (voiceSource === source) {
                voiceSource = null;
                voiceArmed = false;
            }
        }, { once: true });
        source.start(context.currentTime + Math.max(0, startDelaySeconds));
        voiceSource = source;
        voiceArmed = true;
    };

    const scheduleVoiceForReveal = runId => {
        if (!soundEnabled || voiceArmed) return Promise.resolve(voiceArmed);
        if (voiceSchedulePromise) return voiceSchedulePromise;

        voiceSchedulePromise = (async () => {
            const context = getAudioContext();
            const buffer = await loadVoiceBuffer();

            if (
                runId !== sequenceRunId ||
                !soundEnabled ||
                voiceArmed ||
                !context ||
                !buffer
            ) {
                return false;
            }

            if (context.state === "suspended") {
                await context.resume().catch(() => {});
            }
            if (context.state !== "running") return false;

            const elapsedMs = performance.now() - sequenceStartedAt;
            const remainingSeconds = Math.max(0, CLIVE_REVEAL_DELAY_MS - elapsedMs) / 1000;
            createVoiceSource(context, buffer, remainingSeconds);
            return true;
        })().finally(() => {
            voiceSchedulePromise = null;
        });

        return voiceSchedulePromise;
    };

    const playVoice = async () => {
        if (!soundEnabled || voiceArmed) return;

        const context = getAudioContext();
        const buffer = await loadVoiceBuffer();

        if (context && buffer && soundEnabled) {
            if (context.state === "suspended") {
                await context.resume().catch(() => {});
            }
            if (context.state === "running") {
                createVoiceSource(context, buffer);
                return;
            }
        }

        if (!voice || !soundEnabled) return;

        try {
            voice.currentTime = 0;
            await voice.play();
            voiceArmed = true;
        } catch (error) {
            console.warn("[CCG E6] Sir Clive audio playback was blocked.", error);
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
        sequenceRunId += 1;
        stopTapeSound();
        stopVoice();
        window.parent.postMessage({ type: "ccg-easter-egg-close" }, window.location.origin);
    };

    const showClive = () => {
        stopTapeSound();
        hideAll();
        reveal.hidden = false;
        footer.textContent = "ZX SPECTRUM OVERRULED";

        if (!voiceArmed) {
            void playVoice();
        }
    };

    const startSequence = () => {
        clearTimers();
        stopTapeSound();
        stopVoice();

        const runId = ++sequenceRunId;
        sequenceStartedAt = performance.now();

        hideAll();
        loaderOne.hidden = false;
        footer.textContent = "LOADING FROM TAPE...";
        startTapeSound();
        void scheduleVoiceForReveal(runId);

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
            return;
        }

        if (!loaderOne.hidden) {
            startTapeSound();
        }

        if (!finalCard.hidden) return;

        if (!reveal.hidden) {
            void playVoice();
        } else {
            void scheduleVoiceForReveal(sequenceRunId);
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
        void scheduleVoiceForReveal(sequenceRunId);
    }, { once: true });

    if (voice) {
        voice.addEventListener("ended", () => {
            voiceArmed = false;
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === "r" || event.key === "R") startSequence();
        if (event.key === "Escape") closeEasterEgg();
    });

    window.addEventListener("pagehide", () => {
        sequenceRunId += 1;
        clearTimers();
        stopTapeSound();
        stopVoice();
    }, { once: true });

    later(startSequence, 250);
})();
