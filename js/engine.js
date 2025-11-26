// =========================================================
//  C64 / Amiga Boot Sequence Engine (Phase C - Part 3)
// =========================================================

window.addEventListener("DOMContentLoaded", () => {
    ccgInitBoot();
});

// GLOBAL STATE
let ccgBootFinished = false;
let ccgCurrentTheme = "c64"; // default fallback
let ccgAudioEnabled = true;

// ---------------------------------------------------------
// MAIN BOOT SEQUENCE
// ---------------------------------------------------------

async function ccgInitBoot() {
    try {
        await ccgLoadSavedTheme();
        await ccgBootIntro();
        ccgEnableSite();
    } catch (err) {
        console.error("Boot Error:", err);
        ccgEnableSite(); // continue anyway
    }
}

// ---------------------------------------------------------
// LOAD SAVED THEME
// ---------------------------------------------------------

async function ccgLoadSavedTheme() {
    const saved = localStorage.getItem("ccgTheme");
    if (saved) ccgCurrentTheme = saved;
    document.body.setAttribute("data-theme", ccgCurrentTheme);
}

// ---------------------------------------------------------
// BOOT INTRO LOGIC
// ---------------------------------------------------------

async function ccgBootIntro() {
    if (ccgBootFinished) return;

    const bootContainer = document.querySelector(".boot-sequence");
    const bootText = document.querySelector(".boot-text");
    const bootLogo = document.querySelector(".boot-logo");
    const raster = document.querySelector(".raster-bars");
    const crt = document.querySelector(".crt-overlay");

    if (!bootContainer) {
        console.warn("No .boot-sequence found, skipping boot.");
        return;
    }

    bootContainer.style.display = "block";
    crt.style.opacity = 0;

    // Play boot audio
    if (ccgAudioEnabled) {
        try {
            const audio = new Audio("resources/audio/c64_boot.mp3");
            audio.volume = 0.9;
            await audio.play();
        } catch (err) {
            console.warn("Boot audio blocked:", err);
        }
    }

    // STAGE 1 – C64 Text + Flash
    bootText.innerHTML = "**** COMMODORE 64 BASIC V2 ****<br>64K RAM SYSTEM  38911 BASIC BYTES FREE";
    await ccgWait(1500);

    // STAGE 2 – Raster Bars
    raster.classList.add("active");
    await ccgWait(1800);

    // STAGE 3 – Flash White
    bootContainer.classList.add("flash");
    await ccgWait(500);
    bootContainer.classList.remove("flash");

    // STAGE 4 – Amiga Blue Screen
    bootText.innerHTML = "";
    bootLogo.classList.add("amiga");
    bootLogo.style.opacity = 1;

    await ccgWait(900);

    // STAGE 5 – Fade into site + apply scanlines
    raster.classList.remove("active");
    crt.style.opacity = 1;
    bootContainer.style.opacity = 0;

    await ccgWait(600);

    bootContainer.style.display = "none";
    ccgBootFinished = true;
}

// ---------------------------------------------------------
// ENABLE FULL SITE
// ---------------------------------------------------------

function ccgEnableSite() {
    document.body.classList.add("site-ready");

    const powerButton = document.querySelector(".ccg-power");
    if (powerButton) {
        powerButton.addEventListener("click", ccgToggleTheme);
    }

    // Keyboard skip boot
    document.addEventListener("keydown", (e) => {
        if (!ccgBootFinished) {
            const bootContainer = document.querySelector(".boot-sequence");
            const raster = document.querySelector(".raster-bars");
            const crt = document.querySelector(".crt-overlay");

            raster?.classList.remove("active");
            bootContainer?.setAttribute("style", "display:none;");
            crt.style.opacity = 1;
            ccgBootFinished = true;
        }
    });
}

// ---------------------------------------------------------
// THEME SWITCHER (C64 / AMIGA)
// ---------------------------------------------------------

function ccgToggleTheme() {
    ccgCurrentTheme = ccgCurrentTheme === "c64" ? "amiga" : "c64";
    localStorage.setItem("ccgTheme", ccgCurrentTheme);
    document.body.setAttribute("data-theme", ccgCurrentTheme);
}

// ---------------------------------------------------------
// HELPER: WAIT
// ---------------------------------------------------------

function ccgWait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
