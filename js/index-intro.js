// Cheeky Commodore Gamer — C64 Loader Intro
// Sequence:
// 1) Power screen with logo + CLICK TO POWER ON
// 2) C64 BASIC screen appears
// 3) Types:
//    **** COMMODORE 64 BASIC V2 ****
//     64K RAM SYSTEM  38911 BASIC BYTES FREE
//    READY.
//    LOAD ""
//    PRESS PLAY ON TAPE
//    SEARCHING FOR CHEEKY COMMODORE GAMER
//    LOADING "CHEEKY COMMODORE GAMER"
// 4) When LOADING starts -> SID speech + raster overlay
// 5) When speech ends (or timeout) -> home.html
// 6) SKIP INTRO always works, at any point.

document.addEventListener("DOMContentLoaded", () => {
    const powerScreen   = document.getElementById("power-screen");
    const c64Wrapper    = document.getElementById("c64-wrapper");
    const c64TextEl     = document.getElementById("c64-text");
    const rasterOverlay = document.getElementById("raster-overlay");
    const sidAudio      = document.getElementById("sidAudio");
    const skipBtn       = document.getElementById("skipIntro");

    let introStarted  = false;
    let introFinished = false;
    let speechStarted = false;

    const LINES = [
        "**** COMMODORE 64 BASIC V2 ****",
        " 64K RAM SYSTEM  38911 BASIC BYTES FREE",
        "READY.",
        "",
        "LOAD \"\"",
        "PRESS PLAY ON TAPE",
        "",
        "SEARCHING FOR CHEEKY COMMODORE GAMER",
        "LOADING \"CHEEKY COMMODORE GAMER\"",
        ""
    ];

    // Medium-epic timing (roughly 9–12 seconds with speech)
    const CHAR_DELAY = 28;   // ms between characters
    const LINE_PAUSE = 260;  // ms between lines

    function goHome() {
        if (introFinished) return;
        introFinished = true;

        try {
            sidAudio.pause();
            sidAudio.currentTime = 0;
        } catch (e) {
            // ignore
        }

        window.location.href = "home.html";
    }

    function startSpeechAndRaster() {
        if (speechStarted) return;
        speechStarted = true;

        rasterOverlay.classList.add("active");

        try {
            sidAudio.currentTime = 0;
            sidAudio.play().catch(() => {
                // If playback is blocked, we still keep the visual effect
            });
        } catch (e) {
            // ignore
        }
    }

    function runC64Typing() {
        let lineIndex = 0;
        let charIndex = 0;

        function typeNextChar() {
            if (lineIndex >= LINES.length) {
                // Done with text, rely on speech end or timeout.
                return;
            }

            const currentLine = LINES[lineIndex] || "";

            if (charIndex < currentLine.length) {
                c64TextEl.textContent += currentLine.charAt(charIndex);
                charIndex++;
                setTimeout(typeNextChar, CHAR_DELAY);
            } else {
                // line finished
                c64TextEl.textContent += "\n";

                // As soon as we start LOADING line, launch SID + raster
                if (lineIndex === 8) { // "LOADING" index
                    startSpeechAndRaster();
                }

                lineIndex++;
                charIndex = 0;
                setTimeout(typeNextChar, LINE_PAUSE);
            }
        }

        typeNextChar();
    }

    function beginIntro() {
        if (introStarted) return;
        introStarted = true;

        // Hide logo, reveal C64 screen
        powerScreen.style.display = "none";
        c64Wrapper.classList.add("active");

        // Start the text typing
        runC64Typing();

        // When SID ends, go home
        sidAudio.addEventListener("ended", () => {
            goHome();
        });

        // Safety timeout (in case 'ended' never fires, or audio blocked completely)
        setTimeout(() => {
            if (!introFinished) {
                goHome();
            }
        }, 16000); // 16s max
    }

    // Clicking the power screen starts the whole thing (user gesture for audio)
    powerScreen.addEventListener("click", beginIntro);

    // SKIP INTRO ALWAYS WORKS
    skipBtn.addEventListener("click", () => {
        goHome();
    });
});
