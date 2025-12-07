// Omega C64 Intro Controller — Final Neon Edition

document.addEventListener("DOMContentLoaded", () => {
    const overlay        = document.getElementById("introOverlay");
    const idle           = document.getElementById("introIdle");
    const c64Screen      = document.getElementById("introC64");
    const typedLinesWrap = document.getElementById("typedLines");
    const fadeLayer      = document.getElementById("introFade");
    const skipBtn        = document.getElementById("skipIntro");
    const speechBox      = document.getElementById("speechText");
    const loaderVideo    = document.getElementById("loaderVideo");

    let introStarted = false;
    let finished      = false;
    const timers      = [];

    // BASIC typed lines
    const typedLines = [
        'LOAD"*",8,1',
        "PRESS PLAY ON TAPE",
        "LOADING",
        'FOUND "CHEEKY COMMODORE GAMER"'
    ];

    // SID speech audio
    const speechAudio = new Audio("resources/css/audio/c64_speech_stayawhile.mp3");
    speechAudio.preload = "auto";
    speechAudio.volume = 0.7;

    // Prime audio on first click so browser allows later playback
    document.body.addEventListener("click", () => {
        speechAudio.play().then(() => {
            speechAudio.pause();
            speechAudio.currentTime = 0;
        }).catch(() => {});
    }, { once: true });

    function addTimer(fn, delay) {
        const id = window.setTimeout(fn, delay);
        timers.push(id);
    }

    function clearTimers() {
        while (timers.length) {
            clearTimeout(timers.pop());
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
                    addTimer(step, 55);
                } else {
                    lineIndex++;
                    addTimer(typeNextLine, 230);
                }
            }

            step();
        }

        typeNextLine();
    }

    /* SPEECH SEQUENCE --------------------------------------------------- */

    function showSpeech(text) {
        if (!speechBox) return;
        speechBox.innerHTML = text;
        speechBox.classList.add("intro-speech-text--visible");
    }

    function hideSpeech() {
        if (!speechBox) return;
        speechBox.classList.remove("intro-speech-text--visible");
    }

    function startSpeech() {
        if (finished) return;

        // Fade out C64 panel so only raster bars remain
        if (c64Screen) {
            c64Screen.classList.add("intro-c64-screen--hidden");
        }

        // Play SID speech
        try {
            speechAudio.currentTime = 0;
            speechAudio.play().catch(() => {});
        } catch (e) {}

        hideSpeech();
        addTimer(() => showSpeech("ANOTHER VISITOR..."), 300);
        addTimer(() => showSpeech("STAY AWHILE..."),        1900);
        addTimer(() => showSpeech("STAY FOREVER..."),       3500);
        addTimer(finishIntro,                               5500);
    }

    /* FINISH INTRO ------------------------------------------------------ */

    function finishIntro(skipInstant) {
        if (finished) return;
        finished = true;
        clearTimers();

        try {
            speechAudio.pause();
        } catch (e) {}

        if (fadeLayer) {
            fadeLayer.classList.add("intro-fade--active");
        }

        const delay = skipInstant ? 250 : 550;
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
