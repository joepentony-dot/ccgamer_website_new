// ======================================================================
// index-intro.js — Omega C64 Cinematic Intro (FINAL)
// ----------------------------------------------------------------------
// Sequence:
// 1) User clicks → Start intro
// 2) Show static C64 header
// 3) Type LOAD, PRESS PLAY, LOADING, FOUND lines (fast)
// 4) On speech start → fade out C64 panel
// 5) Fade IN "ANOTHER VISITOR", fade OUT
// 6) Fade IN "STAY A WHILE", fade OUT
// 7) Fade IN "STAY FOREVER...", HOLD, fade OUT
// 8) Fade to home.html
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

    // --------------------------------------------------------------
    // Typed lines under READY
    // --------------------------------------------------------------
    const typedLines = [
        'LOAD"*",8,1',
        'PRESS PLAY ON TAPE',
        'LOADING',
        'FOUND "CHEEKY COMMODORE GAMER"'
    ];

    const TYPE_SPEED = 70;  // Fast typing

    function addTimer(fn, delay) {
        const id = setTimeout(fn, delay);
        timers.push(id);
        return id;
    }

    function clearTimers() {
        for (const id of timers) clearTimeout(id);
        timers = [];
    }

    // --------------------------------------------------------------
    // Fade-in/out neon speech phrases
    // --------------------------------------------------------------
    function showSpeech(text, isForeverLine = false) {
        speechBox.innerHTML = "";

        const span = document.createElement("span");
        span.textContent = text;
        if (isForeverLine) span.classList.add("intro-forever");
        speechBox.appendChild(span);

        // Fade IN
        speechBox.classList.remove("intro-speech-text--hidden");
        speechBox.classList.add("intro-speech-text--visible");
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

        // Fade out C64 panel instantly as speech begins
        c64Screen.classList.add("intro-c64-screen--fadeout");

        speechAudio.currentTime = 0;
        speechAudio.play().catch(() => {});

        // TIMING OF PHRASES:
        // Another Visitor: 0.8s
        // Stay A While:    ~2.4s
        // Stay Forever:    ~4.2s

        // "ANOTHER VISITOR"
        addTimer(() => {
            showSpeech("ANOTHER VISITOR");
        }, 800);

        addTimer(() => {
            hideSpeech();
        }, 800 + 900); // fade out after ~0.9s hold

        // "STAY A WHILE"
        addTimer(() => {
            showSpeech("STAY A WHILE");
        }, 2400);

        addTimer(() => {
            hideSpeech();
        }, 2400 + 900);

        // "STAY FOREVER..."
        addTimer(() => {
            showSpeech("STAY FOREVER...", true);
        }, 4200);

        // Hold final phrase, then fade out + leave intro
        addTimer(() => {
            hideSpeech();
        }, 4200 + 1500); // hold for 1.5s

        // After final fade, go to homepage
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
                // After typed lines complete, small pause then start speech
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
                    // End of line
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
    overlay.addEventListener("click", (e) => {
        if (e.target === skipBtn) return;
        startIntro();
    });

    skipBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        finishIntro(true);
    });

})();
