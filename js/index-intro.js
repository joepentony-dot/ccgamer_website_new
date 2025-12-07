// ======================================================================
// index-intro.js — Omega C64 Cinematic Intro (TUNED)
// ======================================================================

(function () {

    // DOM refs
    const overlay        = document.getElementById("introOverlay");
    const idle           = document.getElementById("introIdle");
    const c64Screen      = document.getElementById("introC64");
    const typedLinesWrap = document.getElementById("typedLines");
    const fadeLayer      = document.getElementById("introFade");
    const skipBtn        = document.getElementById("skipIntro");
    const speechBox      = document.getElementById("speechText");
    const loaderVideo    = document.getElementById("loaderVideo");

    // SID speech audio
    const speechAudio = new Audio("resources/css/audio/c64_speech_stayawhile.mp3");
    speechAudio.preload = "auto";
    speechAudio.volume  = 0.55;  // Subtle, letting neon dominate

    let introStarted = false;
    let finished     = false;
    let timers       = [];

    // Typed lines under READY
    const typedLines = [
        'LOAD"*",8,1',
        'PRESS PLAY ON TAPE',
        'LOADING',
        'FOUND "CHEEKY COMMODORE GAMER"'
    ];

    const TYPE_SPEED = 70;  // Fast typing

    // --------------------------------------------------------------
    // Timer helpers (so we can clear them when skipping)
    // --------------------------------------------------------------
    function addTimer(fn, delay) {
        const id = setTimeout(fn, delay);
        timers.push(id);
    }

    function clearTimers() {
        timers.forEach(id => clearTimeout(id));
        timers = [];
    }

    // --------------------------------------------------------------
    // Utility: Show / hide speech text
    // --------------------------------------------------------------
    function showSpeech(text, isFinal = false) {
        if (!speechBox) return;

        speechBox.textContent = text || "";
        speechBox.classList.remove("intro-speech-text--hidden");
        speechBox.classList.add("intro-speech-text--visible");

        if (isFinal) {
            speechBox.classList.add("intro-speech-text--final");
        }
    }

    function hideSpeech() {
        speechBox.classList.remove("intro-speech-text--visible");
        speechBox.classList.add("intro-speech-text--hidden");
    }

    // --------------------------------------------------------------
    // Begin speech audio + fade-out of C64 panel
    // --------------------------------------------------------------
    function startSpeech() {
        if (!speechAudio) return;

        // Fade out C64 panel as speech begins
        c64Screen.classList.add("intro-c64-screen--fadeout");

        speechAudio.currentTime = 0;
        speechAudio.play().catch(() => {});

        // Timings (approx)
        // Another Visitor: 0.8s
        // Stay A While:    ~2.4s
        // Stay Forever:    ~4.2s

        // "ANOTHER VISITOR"
        addTimer(() => {
            showSpeech("ANOTHER VISITOR");
        }, 800);

        addTimer(() => {
            hideSpeech();
        }, 800 + 900);

        // "STAY A WHILE"
        addTimer(() => {
            showSpeech("STAY A WHILE");
        }, 800 + 900 + 400);

        addTimer(() => {
            hideSpeech();
        }, 800 + 900 + 400 + 900);

        // "STAY FOREVER..."
        addTimer(() => {
            showSpeech("STAY FOREVER...", true);
        }, 800 + 900 + 400 + 900 + 400);

        // Hold final phrase, then fade out + leave intro
        addTimer(() => {
            hideSpeech();
        }, 4200 + 1500);

        addTimer(() => {
            finishIntro();
        }, 4200 + 1500 + 400);
    }

    // --------------------------------------------------------------
    // Finish intro (skip or auto)
    // --------------------------------------------------------------
    function finishIntro(skip = false) {
        if (finished) return;
        finished = true;

        clearTimers();

        try { speechAudio.pause(); } catch (e) {}
        speechAudio.currentTime = 0;

        fadeLayer.classList.add("intro-fade--active");

        setTimeout(() => {
            window.location.href = "home.html";
        }, skip ? 250 : 700);
    }

    // --------------------------------------------------------------
    // Typing engine
    // --------------------------------------------------------------
    function beginTyping() {
        let lineIndex = 0;

        function typeNextLine() {
            if (lineIndex >= typedLines.length) {
                addTimer(startSpeech, 300);
                return;
            }

            const text = typedLines[lineIndex];
            const el = document.createElement("div");
            el.className = "intro-c64-line intro-c64-line--cursor";
            typedLinesWrap.appendChild(el);

            let charIndex = 0;

            function typeChar() {
                if (finished) return;

                if (charIndex <= text.length) {
                    el.textContent = text.slice(0, charIndex);
                    charIndex++;
                    addTimer(typeChar, TYPE_SPEED);
                } else {
                    el.classList.remove("intro-c64-line--cursor");
                    lineIndex++;
                    addTimer(typeNextLine, 200);
                }
            }

            typeChar();
        }

        typeNextLine();
    }

    // --------------------------------------------------------------
    // Start the intro
    // --------------------------------------------------------------
    function startIntro() {
        if (introStarted || finished) return;
        introStarted = true;

        document.body.classList.add("intro-started");

        if (idle) {
            idle.style.display = "none";
        }

        if (loaderVideo && loaderVideo.paused) {
            loaderVideo.play().catch(() => {});
        }

        // Show C64 panel
        c64Screen.classList.add("intro-c64-screen--visible", "intro-c64-screen--cursor-on");

        // Begin typing after slight delay
        addTimer(beginTyping, 250);
    }

    // --------------------------------------------------------------
    // Event Listeners
    // --------------------------------------------------------------

    // Global click — ensure ANY click can start the intro,
    // even if the overlay element isn't catching it.
    document.addEventListener("click", (e) => {
        if (introStarted || finished) return;

        // Ignore clicks on the Skip Intro button
        if (e.target && e.target.closest && e.target.closest("#skipIntro")) {
            return;
        }

        startIntro();
    });

    if (overlay) {
        overlay.addEventListener("click", (e) => {
            // If click was on Skip Intro or inside it, don't start intro
            if (e.target && e.target.closest && e.target.closest("#skipIntro")) {
                return;
            }
            startIntro();
        });
    }

    if (skipBtn) {
        skipBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            finishIntro(true);
        });
    }

})();
