// C64 Intro Controller for Cheeky Commodore Gamer
// - Plays SID speech immediately
// - Animates "CHEEKY COMMODORE GAMER" text
// - Runs loading bars
// - Auto-jumps to home.html when finished
// - Skip button in top-right

document.addEventListener("DOMContentLoaded", () => {
    const audio = new Audio("resources/audio/c64_speech_stayawhile.mp3");
    audio.preload = "auto";

    const skipButton = document.getElementById("skip-intro");
    const overlay = document.getElementById("intro-tap-overlay");
    const overlayBtn = document.getElementById("intro-overlay-btn");
    const titleSpan = document.getElementById("intro-title-text");

    const TITLE_TEXT = "CHEEKY COMMODORE GAMER";
    let hasEnded = false;
    let textIndex = 0;
    let textTimer = null;

    function goHome() {
        if (hasEnded) return;
        hasEnded = true;

        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (e) {
            // ignore
        }

        window.location.href = "home.html";
    }

    function startTextAnimation() {
        if (!titleSpan) return;

        textTimer = setInterval(() => {
            if (textIndex <= TITLE_TEXT.length) {
                titleSpan.textContent = TITLE_TEXT.substring(0, textIndex);
                textIndex++;
            } else {
                clearInterval(textTimer);
            }
        }, 80); // typing speed
    }

    function startIntroAudio() {
        audio.currentTime = 0;
        audio.volume = 1;

        audio.play()
            .then(() => {
                // Autoplay succeeded
            })
            .catch(() => {
                // Autoplay blocked: show click-to-start overlay
                if (overlay) {
                    overlay.classList.add("visible");
                }
            });
    }

    function beginIntroSequence() {
        // only called once
        startIntroAudio();
        startTextAnimation();
    }

    // Skip button → stop audio + go home
    if (skipButton) {
        skipButton.addEventListener("click", () => {
            goHome();
        });
    }

    // Audio end → go home
    audio.addEventListener("ended", () => {
        goHome();
    });

    // Safety timeout (in case ended never fires)
    setTimeout(() => {
        if (!hasEnded) {
            goHome();
        }
    }, 15000); // 15 seconds safety

    // Overlay button if autoplay blocked
    if (overlayBtn) {
        overlayBtn.addEventListener("click", () => {
            if (overlay) overlay.classList.remove("visible");
            beginIntroSequence();
        });
    }

    // Kick things off immediately:
    beginIntroSequence();
});
