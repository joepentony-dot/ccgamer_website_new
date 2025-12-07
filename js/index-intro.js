// ======================================================================
// Omega C64 Intro Controller — Centered & Neon Speech, Audio-Synced
// ======================================================================

document.addEventListener("DOMContentLoaded", () => {
    const overlay        = document.getElementById("introOverlay");
    const idle           = document.getElementById("introIdle");
    const c64Screen      = document.getElementById("introC64");
    const typedLinesWrap = document.getElementById("typedLines");
    const fadeLayer      = document.getElementById("introFade");
    const skipBtn        = document.getElementById("skipIntro");
    const speechBox      = document.getElementById("speechText");
    const loaderVideo    = document.getElementById("loaderVideo");

    let introStarted     = false;
    let finished         = false;
    const timers         = [];
    let speechDurationMs = 0;

    // BASIC typed lines (left aligned, neon blue in CSS)
    const typedLines = [
        'LOAD"*",8,1',
        "PRESS PLAY ON TAPE",
        "LOADING",
        'FOUND "CHEEKY COMMODORE GAMER"'
    ];

    // SID speech audio
    const speechAudio = new Audio("resources/css/audio/c64_speech_stayawhile.mp3");
    speechAudio.preload = "auto";
    speechAudio.volume  = 0.7;

    speechAudio.addEventListener("loadedmetadata", () => {
        if (!isNaN(speechAudio.duration) && speechAudio.duration > 0) {
            speechDurationMs = speechAudio.duration * 1000;
        }
    });

    // Prime audio on first body click (for mobile / browser policies)
    document.body.addEventListener(
        "click",
        () => {
            speechAudio
                .play()
                .then(() => {
                    speechAudio.pause();
                    speechAudio.currentTime = 0;
                })
                .catch(() => {});
        },
        { once: true }
    );

    function addTimer(fn, delay) {
        const id = window.setTimeout(fn, delay);
        timers.push(id);
    }

    function clearTimers() {
        while (timers.length) {
            window.clearTimeout(timers.pop());
        }
    }

    /* START INTRO ------------------------------------------------------- */

    function startIntro() {
        if (introStarted || finished) return;
        introStarted = true;

        if (idle) {
            idle.classList.add("intro-idle--hidden");
        }

        if (c64Screen) {
            c64Screen.classList.add("intro-c64-screen--visible");
        }

        if (loaderVideo && loaderVideo.paused) {
            loaderVideo.play().catch(() => {});
        }

        addTimer(beginTyping, 650);
    }

    /* TYPING SEQUENCE --------------------------------------------------- */

    function beginTyping() {
        let lineIndex = 0;

        function typeNextLine() {
            if (finished) return;

            if (lineIndex >= typedLines.length) {
                // After typing finishes, move into SID speech
                addTimer(startSpeech, 450);
                return;
            }

            const text = typedLines[lineIndex];
            const el   = document.createElement("div");
            el.className = "intro-c64-line intro-c64-line--typed";
            typedLinesWrap.appendChild(el);

            let charIndex = 0;

            function step() {
                if (finished) return;

                el.textContent = text.slice(0, charIndex);
                charIndex++;

                if (charIndex <= text.length) {
                    addTimer(step, 55); // typing speed
                } else {
                    lineIndex++;
                    addTimer(typeNextLine, 230); // pause between lines
                }
            }

            step();
        }

        typeNextLine();
    }

    /* SPEECH TEXT HELPERS ----------------------------------------------- */

    function showSpeech(text) {
        if (!speechBox) return;
        speechBox.classList.remove("intro-speech-text--visible");
        void speechBox.offsetWidth; // force reflow to reset animation
        speechBox.textContent = text;
        speechBox.classList.add("intro-speech-text--visible");
    }

    function hideSpeech() {
        if (!speechBox) return;
        speechBox.classList.remove("intro-speech-text--visible");
    }

    /* SPEECH SEQUENCE --------------------------------------------------- */

    function startSpeech() {
        if (finished) return;

        // Hide BASIC panel while speech plays
        if (c64Screen) {
            c64Screen.classList.remove("intro-c64-screen--visible");
            c64Screen.classList.add("intro-c64-screen--hidden");
        }

        try {
            speechAudio.currentTime = 0;
            speechAudio.play().catch(() => {});
        } catch (e) {}

        const duration =
            speechDurationMs && speechDurationMs > 0 ? speechDurationMs : 8000;

        hideSpeech();

        // ANOTHER VISITOR...
        addTimer(() => {
            if (!finished) showSpeech("ANOTHER VISITOR...");
        }, 250);

        // STAY AWHILE...
        addTimer(() => {
            if (!finished) showSpeech("STAY AWHILE...");
        }, 1900);

        // STAY FOREVER...
        addTimer(() => {
            if (!finished) showSpeech("STAY FOREVER...");
        }, 3600);

        const fadeOutAt = Math.max(duration - 400, 4800);
        addTimer(() => {
            if (!finished) {
                hideSpeech();
            }
        }, fadeOutAt);

        speechAudio.onended = () => {
            if (!finished) {
                finishIntro(false);
            }
        };

        // Hard fallback if onended never fires
        addTimer(() => {
            if (!finished) {
                finishIntro(false);
            }
        }, duration + 600);
    }

    /* FINISH INTRO ------------------------------------------------------ */

    function finishIntro(skipInstant) {
        if (finished) return;
        finished = true;
        clearTimers();

        try {
            speechAudio.pause();
            speechAudio.currentTime = 0;
        } catch (e) {}

        hideSpeech();

        if (c64Screen) {
            c64Screen.classList.add("intro-c64-screen--hidden");
        }

        if (fadeLayer) {
            fadeLayer.classList.add("intro-fade--active");
        }

        const delay = skipInstant ? 120 : 550;

        addTimer(() => {
            window.location.href = "home.html";
        }, delay);
    }

    /* EVENT WIRING ------------------------------------------------------ */

    function handleGlobalClick(e) {
        if (finished || introStarted) return;

        // Don’t treat clicks on Skip as power-on
        if (skipBtn && e.target.closest && e.target.closest("#skipIntro")) {
            return;
        }
        startIntro();
    }

    if (overlay) {
        overlay.addEventListener("click", handleGlobalClick);
    } else {
        document.addEventListener("click", handleGlobalClick);
    }

    if (skipBtn) {
        skipBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            finishIntro(true);
        });
    }
});
