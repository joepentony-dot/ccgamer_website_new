/* ==========================================================
   OMEGA INTRO SEQUENCE — FINAL PATCHED VERSION
   Cheeky Commodore Gamer 😇🕹️👌
   Fixes included:
   - Skip Intro works instantly at all stages
   - Click-anywhere progression for ALL phases
   - C64 typing stage now continues properly
   - Unified stage controller
   - No stuck states
   - No blocked events
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* -------------------------------------------------------
       ELEMENT HOOKS
    ------------------------------------------------------- */
    const overlay = document.getElementById("intro-overlay");
    const powerOnText = document.getElementById("power-on-text");
    const skipIntroBtn = document.getElementById("skip-intro-btn");
    const c64Container = document.getElementById("c64-container");
    const c64TextArea = document.getElementById("c64-text");
    const c64Cursor = document.getElementById("c64-cursor");

    /* -------------------------------------------------------
       STATE CONTROL
    ------------------------------------------------------- */
    let stage = 0;
    let typingDone = false;
    let typingIndex = 0;
    let typingTimer = null;

    /* C64 BASIC lines (EDITABLE) */
    const basicLines = [
        "**** COMMODORE 64 BASIC V2 ****",
        "64K RAM SYSTEM  38911 BASIC BYTES FREE",
        "READY.",
        "",
        "LOAD\"*\",8,1",
        "PRESS PLAY ON TAPE"
    ];

    /* -------------------------------------------------------
       UNIVERSAL CLICK HANDLER
       - Moves through ALL stages
       - Never traps the user
    ------------------------------------------------------- */
    function globalClickAdvance() {
        switch (stage) {
            case 0:
                beginBootSequence();
                break;
            case 1:
                if (typingDone) {
                    proceedToSpeechPhase();
                }
                break;
            case 2:
                finishIntro();
                break;
            default:
                finishIntro();
                break;
        }
    }

    document.addEventListener("click", globalClickAdvance);


    /* -------------------------------------------------------
       SKIP INTRO — ALWAYS WORKS IMMEDIATELY
    ------------------------------------------------------- */
    skipIntroBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        finishIntro();
    });

    /* -------------------------------------------------------
       START — CLICK TO POWER ON
    ------------------------------------------------------- */
    function beginBootSequence() {
        stage = 1;

        // Hide "Click to Power On"
        powerOnText.classList.add("fade-out");

        // Delay then reveal C64 screen
        setTimeout(() => {
            overlay.classList.add("fade-out");
            c64Container.classList.add("visible");
            startTyping();
        }, 800);
    }


    /* -------------------------------------------------------
       TYPING ENGINE — C64 ACCURATE
    ------------------------------------------------------- */
    function startTyping() {
        let output = "";
        typingDone = false;
        typingIndex = 0;

        function typeLine() {
            if (typingIndex >= basicLines.length) {
                typingDone = true;
                c64Cursor.classList.add("blink");
                return;
            }

            // Add line
            output += basicLines[typingIndex] + "\n";
            c64TextArea.textContent = output;

            typingIndex++;

            typingTimer = setTimeout(typeLine, 300);
        }

        typeLine();
    }

    /* -------------------------------------------------------
       PROCEED TO SPEECH PHASE
       (Another Visitor / Stay A While / Stay Forever)
    ------------------------------------------------------- */
    function proceedToSpeechPhase() {
        if (!typingDone) return;

        stage = 2;
        c64Cursor.classList.remove("blink");

        // Fade out C64 block
        c64Container.classList.add("fade-out");

        // Play the speech MP3 after fade
        setTimeout(() => {
            const audio = new Audio("resources/css/audio/c64_speech_stayawhile.mp3");
            audio.volume = 0.55;
            audio.play();

            // After speech: finish intro
            audio.onended = () => {
                finishIntro();
            };
        }, 1200);
    }

    /* -------------------------------------------------------
       FINAL EXIT TO HOME PAGE
    ------------------------------------------------------- */
    function finishIntro() {
        stage = 3;

        // Remove all intro content gracefully
        document.body.classList.add("intro-complete");

        // Small delay then redirect
        setTimeout(() => {
            window.location.href = "home.html";
        }, 700);
    }

});
