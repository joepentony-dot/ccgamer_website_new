// C64 Loader Intro for Cheeky Commodore Gamer
// Sequence:
// 1) Logo + CLICK TO POWER ON
// 2) C64 BASIC boot text
// 3) LOAD "", PRESS PLAY ON TAPE
// 4) SEARCHING / LOADING "CHEEKY COMMODORE GAMER"
// 5) SID speech + raster bars
// 6) Auto-jump to home.html (or via Skip)

document.addEventListener("DOMContentLoaded", () => {
    const powerScreen = document.getElementById("powerScreen");
    const bootScreen  = document.getElementById("bootScreen");
    const c64TextEl   = document.getElementById("c64Text");
    const rasterBars  = document.getElementById("rasterBars");
    const sidAudio    = document.getElementById("sidAudio");
    const skipBtn     = document.getElementById("skipIntro");

    let hasStarted   = false;
    let hasFinished  = false;
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

    const TYPE_DELAY = 40;   // ms between characters
    const LINE_PAUSE = 380;  // ms between lines

    function goHome() {
        if (hasFinished) return;
        hasFinished = true;

        try {
            sidAudio.pause();
            sidAudio.currentTime = 0;
        } catch (e) { /* ignore */ }

        window.location.href = "home.html";
    }

    function startSpeechAndRaster() {
        if (speechStarted) return;
        speechStarted = true;

        rasterBars.style.display = "flex";

        try {
            sidAudio.currentTime = 0;
            sidAudio.play().catch(() => {
                // If, for some weird reason, playback still fails,
                // we just let the loader run visually and fall back to timeout.
            });
        } catch (e) { /* ignore */ }
    }

    function runBootSequence() {
        let lineIndex = 0;
        let charIndex = 0;

        function typeNextChar() {
            if (lineIndex >= LINES.length) {
                // All lines printed; now just wait for SID to end or the safety timeout
                return;
            }

            const currentLine = LINES[lineIndex];

            if (charIndex < currentLine.length) {
                c64TextEl.textContent += currentLine.charAt(charIndex);
                charIndex++;
                setTimeout(typeNextChar, TYPE_DELAY);
            } else {
                c64TextEl.textContent += "\n";

                // When we reach the LOADING line, start SID + raster bars
                if (lineIndex === 8) {
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
        if (hasStarted) return;
        hasStarted = true;

        // Hide logo screen, show C64 boot screen
        powerScreen.style.display = "none";
        bootScreen.classList.add("active");

        runBootSequence();

        // If SID finishes, jump to home
        sidAudio.addEventListener("ended", () => {
            goHome();
        });

        // Safety timeout in case something never fires
        setTimeout(() => {
            if (!hasFinished) {
                goHome();
            }
        }, 20000); // 20 seconds
    }

    // Clicking anywhere on the power screen starts the whole thing
    powerScreen.addEventListener("click", beginIntro);

    // Skip button at any time
    skipBtn.addEventListener("click", () => {
        goHome();
    });
});
