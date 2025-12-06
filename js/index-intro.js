// ============================================================
// index-intro.js — Omega C64 Loading Intro Controller
// - Static C64 header
// - Typed commands under READY with blinking cursor
// - Syncs big neon text with SID speech
// - Handles Skip Intro + fade-out to home.html
// Target total runtime: ~8 seconds
// ============================================================

(function () {
    const overlay = document.getElementById("introOverlay");
    const idle = document.getElementById("introIdle");
    const c64Screen = document.getElementById("introC64");
    const fadeLayer = document.getElementById("introFade");
    const skipBtn = document.getElementById("skipIntro");
    const speechText = document.getElementById("speechText");
    const loaderVideo = document.getElementById("loaderVideo");
    const typedLinesContainer = document.getElementById("typedLines");

    // SID speech audio
    const speechAudio = new Audio("resources/css/audio/c64_speech_stayawhile.mp3");
    speechAudio.preload = "auto";
    speechAudio.volume = 0.55; // softer so neon text dominates

    let introStarted = false;
    let finished = false;
    let timers = [];
    let speechStage = 0;

    // Lines to type under READY (in order)
    const typedLines = [
        'LOAD"*",8,1',
        'PRESS PLAY ON TAPE',
        'LOADING',
        'FOUND "CHEEKY COMMODORE GAMER"'
    ];

    // Approx typing speed (ms per character)
    const TYPE_SPEED = 70; // fast but readable

    function addTimer(fn, delay) {
        const id = window.setTimeout(fn, delay);
        timers.push(id);
        return id;
    }

    function clearTimers() {
        timers.forEach(id => window.clearTimeout(id));
        timers = [];
    }

    function showC64Screen() {
        c64Screen.classList.add("intro-c64-screen--visible", "intro-c64-screen--cursor-on");
    }

    function updateSpeechText(text, isForever) {
        speechText.innerHTML = "";
        const span = document.createElement("span");
        span.textContent = text;
        if (isForever) {
            span.classList.add("intro-forever");
        }
        speechText.appendChild(span);
        speechText.classList.add("intro-speech-text--visible");
    }

    function clearSpeechText() {
        speechText.classList.remove("intro-speech-text--visible");
    }

    function startSpeechSync() {
        try {
            speechAudio.currentTime = 0;
            speechAudio.play().catch(() => { /* ignore autoplay issues */ });
        } catch (e) {
            console.warn("Speech audio error:", e);
        }

        // Basic timing based on typical sample:
        // Another Visitor ~0.8s, Stay a while ~2.0-3.0s, Stay Forever ~4.0-5.0s
        speechStage = 0;

        const sync = () => {
            const t = speechAudio.currentTime;

            if (speechStage === 0 && t >= 0.8) {
                speechStage = 1;
                updateSpeechText("ANOTHER VISITOR", false);
            } else if (speechStage === 1 && t >= 2.4) {
                speechStage = 2;
                updateSpeechText("STAY A WHILE", false);
            } else if (speechStage === 2 && t >= 4.2) {
                speechStage = 3;
                updateSpeechText("STAY FOREVER...", true);
            }
        };

        speechAudio.addEventListener("timeupdate", sync);

        speechAudio.addEventListener("ended", () => {
            clearSpeechText();
            addTimer(finishIntro, 900);
        });
    }

    function finishIntro(skip) {
        if (finished) return;
        finished = true;

        clearTimers();
        try { speechAudio.pause(); } catch (e) {}
        speechAudio.currentTime = 0;

        fadeLayer.classList.add("intro-fade--active");

        const delay = skip ? 250 : 750;
        window.setTimeout(() => {
            window.location.href = "home.html";
        }, delay);
    }

    // Type lines under READY, then start speech
    function startTypingSequence() {
        if (!typedLinesContainer) return;

        let lineIndex = 0;

        const typeNextLine = () => {
            if (lineIndex >= typedLines.length) {
                // Slight pause, then start speech
                addTimer(startSpeechSync, 500);
                return;
            }

            const text = typedLines[lineIndex];
            const lineEl = document.createElement("div");
            lineEl.className = "intro-c64-line intro-c64-line--cursor";
            typedLinesContainer.appendChild(lineEl);

            let charIndex = 0;

            const typeChar = () => {
                if (finished) return; // safety

                if (charIndex <= text.length) {
                    lineEl.textContent = text.slice(0, charIndex);
                    charIndex++;
                    addTimer(typeChar, TYPE_SPEED);
                } else {
                    // Line finished; stop cursor on this line after short delay
                    lineEl.classList.remove("intro-c64-line--cursor");
                    lineIndex++;
                    addTimer(typeNextLine, 200);
                }
            };

            typeChar();
        };

        typeNextLine();
    }

    function startIntroSequence() {
        if (introStarted || finished) return;
        introStarted = true;

        document.body.classList.add("intro-started");

        // Ensure video is playing
        if (loaderVideo && loaderVideo.paused) {
            loaderVideo.play().catch(() => {});
        }

        // Show C64 READY screen immediately
        showC64Screen();

        // Short delay, then start typing under READY
        addTimer(startTypingSequence, 250);
    }

    // Handle click to power on (anywhere on overlay except skip button)
    if (overlay) {
        overlay.addEventListener("click", (e) => {
            // If click was on Skip button, don't start intro again
            if (e.target === skipBtn) return;
            startIntroSequence();
        });
    }

    // Skip Intro button
    if (skipBtn) {
        skipBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // prevent triggering startIntroSequence
            finishIntro(true);
        });
    }
})();
