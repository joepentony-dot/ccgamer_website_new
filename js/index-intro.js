/* =====================================================================
   OMEGA INTRO SEQUENCE — FINAL STABLE BUILD
   Smooth C64 boot → typing → SID speech → fade → homepage
   ===================================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* --------------------------------------------------------------
       ELEMENT REFERENCES
    -------------------------------------------------------------- */
    const introIdle = document.getElementById("introIdle");
    const introC64 = document.getElementById("introC64");
    const typedLines = document.getElementById("typedLines");
    const skipBtn = document.getElementById("skipIntro");
    const overlay = document.getElementById("introOverlay");
    const speechText = document.getElementById("speechText");
    const fadeLayer = document.getElementById("introFade");

    /* --------------------------------------------------------------
       AUDIO (lazy-loaded after user gesture)
    -------------------------------------------------------------- */
    let speechAudio = new Audio("resources/audio/another_visitor.mp3");
    speechAudio.preload = "auto";

    /* --------------------------------------------------------------
       TYPED COMMAND SEQUENCE
       Appears AFTER READY line.
    -------------------------------------------------------------- */
    const commandLines = [
        `LOAD"*",8,1`,
        `PRESS PLAY ON TAPE`,
        `LOADING`,
        `FOUND "CHEEKY COMMODORE GAMER"`
    ];

    let currentLine = 0;
    let typingActive = false;

    /* --------------------------------------------------------------
       START INTRO — triggered by click anywhere on idle area
    -------------------------------------------------------------- */
    introIdle.addEventListener("click", startBootSequence);

    function startBootSequence() {
        introIdle.classList.add("intro-idle--hidden");

        // Reveal the blue panel
        setTimeout(() => {
            introC64.classList.add("intro-c64-screen--visible");
        }, 400);

        // Start typing after headers settle
        setTimeout(() => {
            typingActive = true;
            typeNextLine();
        }, 1500);
    }

    /* --------------------------------------------------------------
       TYPEWRITER EFFECT (LEFT-ALIGNED)
    -------------------------------------------------------------- */
    function typeNextLine() {
        if (!typingActive) return;
        if (currentLine >= commandLines.length) {
            revealSpeech();
            return;
        }

        let line = commandLines[currentLine];
        let div = document.createElement("div");
        div.className = "intro-c64-line intro-c64-line--typed";
        typedLines.appendChild(div);

        let i = 0;

        const typer = setInterval(() => {
            div.textContent = line.substring(0, i);
            i++;

            if (i > line.length) {
                clearInterval(typer);
                currentLine++;
                setTimeout(typeNextLine, 300);
            }
        }, 45);
    }

    /* --------------------------------------------------------------
       SID SPEECH + NEON TEXT SEQUENCE
    -------------------------------------------------------------- */
    function revealSpeech() {
        setTimeout(() => {
            speechAudio.play().catch(() => {});
        }, 300);

        // Sequence: Another visitor... Stay awhile... Stay forever!
        const speechLines = [
            "ANOTHER VISITOR...",
            "STAY AWHILE...",
            "STAY FOREVER!"
        ];

        let idx = 0;

        function showLine() {
            if (idx >= speechLines.length) {
                fadeOutToHome();
                return;
            }

            speechText.textContent = speechLines[idx];
            speechText.classList.add("intro-speech-text--visible");

            setTimeout(() => {
                speechText.classList.remove("intro-speech-text--visible");
                setTimeout(() => {
                    idx++;
                    showLine();
                }, 300);
            }, 1600);
        }

        setTimeout(showLine, 600);
    }

    /* --------------------------------------------------------------
       FINAL TRANSITION TO HOME PAGE
    -------------------------------------------------------------- */
    function fadeOutToHome() {
        fadeLayer.classList.add("intro-fade--active");

        setTimeout(() => {
            window.location.href = "home.html";
        }, 700);
    }

    /* --------------------------------------------------------------
       SKIP BUTTON — INSTANT EXIT
    -------------------------------------------------------------- */
    skipBtn.addEventListener("click", () => {
        typingActive = false;

        speechAudio.pause();
        speechAudio.currentTime = 0;

        fadeLayer.classList.add("intro-fade--active");

        setTimeout(() => {
            window.location.href = "home.html";
        }, 300);
    });

});
