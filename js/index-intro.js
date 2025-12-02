// js/index-intro.js
//
// Cheeky Commodore Gamer — EPIC C64 INTRO FLOW
// Built on your original logic: same config, same fundamentals,
// but now driving the new pure-raster intro.

/* ============================================================
   CONFIG
============================================================ */
const NEXT_URL = "home.html";
const LOADING_SOUND_URL = "resources/audio/c64_speech_stayawhile.mp3";

/* State */
let loadingAborted = false;
let audio = null;
let redirectTimeout = null;
const timers = [];

/* ============================================================
   UTILITIES
============================================================ */

function schedule(fn, ms) {
    if (loadingAborted) return;
    const id = setTimeout(() => {
        if (!loadingAborted) fn();
    }, ms);
    timers.push(id);
}

function clearAllTimers() {
    timers.forEach(id => clearTimeout(id));
    timers.length = 0;
}

function delay(ms) {
    return new Promise(resolve => {
        schedule(resolve, ms);
    });
}

function typeText(elementId, text, delayMs = 55) {
    return new Promise(resolve => {
        const el = document.getElementById(elementId);
        if (!el || loadingAborted) {
            resolve();
            return;
        }

        let i = 0;
        const timer = setInterval(() => {
            if (loadingAborted) {
                clearInterval(timer);
                resolve();
                return;
            }
            el.textContent += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(timer);
                resolve();
            }
        }, delayMs);
        timers.push(timer);
    });
}

/* ============================================================
   MAIN INTRO LOGIC
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    const powerOverlay = document.getElementById("powerOverlay");
    const c64Wrapper   = document.getElementById("c64Wrapper");
    const c64TextEl    = document.getElementById("c64Text");
    const raster       = document.getElementById("rasterOverlay");
    const flashOverlay = document.getElementById("flashOverlay");
    const sidAudio     = document.getElementById("sidAudio");
    const sidText      = document.getElementById("sidText");
    const skipBtn      = document.getElementById("skipIntroBtn");

    if (!powerOverlay || !c64Wrapper || !c64TextEl || !raster || !sidAudio || !sidText) {
        console.error("Intro DOM elements missing");
        return;
    }

    const basicText =
`**** COMMODORE 64 BASIC V2 ****
 64K RAM SYSTEM  38911 BASIC BYTES FREE

READY.

`;

    function showBasic() {
        c64TextEl.textContent = basicText;
    }

    function appendLine(text) {
        c64TextEl.textContent += text + "\n";
    }

    function flashSID(msg, delayMs) {
        schedule(() => {
            sidText.textContent = msg;
            sidText.classList.add("sidTextVisible");
        }, delayMs);

        schedule(() => {
            sidText.classList.remove("sidTextVisible");
        }, delayMs + 3200);
    }

    function triggerMicroFlash() {
        if (!flashOverlay) return;
        flashOverlay.classList.remove("flash-active");
        // Force reflow so animation can retrigger
        void flashOverlay.offsetWidth;
        flashOverlay.classList.add("flash-active");
    }

    function startRasterAndSID() {
        // Hide C64 blue screen
        c64Wrapper.classList.add("hidden");

        // Tiny white/blue flash, then raster
        triggerMicroFlash();
        schedule(() => {
            raster.classList.add("raster-active");
        }, 60);

        // SID text beats
        flashSID("ANOTHER VISITOR...", 200);
        flashSID("...STAY A WHILE...", 2200);
        flashSID("STAY FOREVER!", 4200);

        // Play audio
        try {
            audio = sidAudio;
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } catch (e) {}

        // Redirect when SID ends (main behaviour)
        audio.onended = () => {
            if (!loadingAborted) {
                window.location.href = NEXT_URL;
            }
        };

        // Fallback redirect in case audio fails
        redirectTimeout = setTimeout(() => {
            if (!loadingAborted) {
                window.location.href = NEXT_URL;
            }
        }, 9000);
    }

    async function runLoadingSequence() {
        if (loadingAborted) return;

        // BASIC header already shown
        await delay(600);

        // LOAD ""
        await typeText("c64Text", 'LOAD ""', 70);
        appendLine(""); // newline

        // PRESS PLAY ON TAPE
        await delay(500);
        appendLine("PRESS PLAY ON TAPE");

        // OK
        await delay(700);
        appendLine("OK");

        // SEARCHING
        await delay(500);
        appendLine("SEARCHING");

        // FOUND "CHEEKY COMMODORE GAMER"
        await delay(800);
        appendLine('FOUND "CHEEKY COMMODORE GAMER"');

        // LOADING
        await delay(600);
        appendLine("LOADING");

        // Straight into raster + SID
        await delay(400);
        if (!loadingAborted) {
            startRasterAndSID();
        }
    }

    function beginIntro() {
        if (loadingAborted) return;
        if (powerOverlay.classList.contains("hidden")) return;

        powerOverlay.classList.add("hidden");
        c64Wrapper.classList.remove("hidden");

        showBasic();
        runLoadingSequence();
    }

    function skipIntro() {
        loadingAborted = true;
        clearAllTimers();

        try {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        } catch (e) {}

        if (redirectTimeout) {
            clearTimeout(redirectTimeout);
            redirectTimeout = null;
        }

        window.location.href = NEXT_URL;
    }

    // Events
    powerOverlay.addEventListener("click", () => {
        beginIntro();
    });

    if (skipBtn) {
        skipBtn.addEventListener("click", skipIntro);
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            skipIntro();
        }
        if (e.key === "Enter" && !powerOverlay.classList.contains("hidden")) {
            beginIntro();
        }
    });
});
