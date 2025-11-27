/* ============================================================
   CHEEKY COMMODORE GAMER — engine.js
   Complete, stable version
   Handles:
   - Boot overlay
   - Raster bars
   - Audio intro ("Stay a while… stay FOREVER!")
   - Fade transitions
   ============================================================ */

/* ---------------------------------------
   1. CONFIGURATION
   --------------------------------------- */

const BOOT_DURATION = 4200;   // ms until fade-out
const AUDIO_DELAY   = 700;    // ms after load to play sound
const RASTER_SPEED  = 18;     // lower = faster movement

/* ---------------------------------------
   2. Boot Overlay HTML Injection
   --------------------------------------- */

function createBootOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "ccg-boot-overlay";
    overlay.innerHTML = `
        <div class="ccg-boot-center">
            <div class="ccg-boot-text">
                <span>*** COMMODORE 64 SYSTEM BOOT ***</span><br>
                <span>READY.</span>
            </div>
            <canvas id="ccg-raster-bars"></canvas>
        </div>
    `;
    document.body.appendChild(overlay);
}

/* ---------------------------------------
   3. Raster Bars Effect (Canvas)
   --------------------------------------- */

function startRasterBars() {
    const canvas = document.getElementById("ccg-raster-bars");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth * 0.6;
    canvas.height = 120;

    const bars = [
        "#ff0040",
        "#ff8000",
        "#ffff00",
        "#00ff00",
        "#00ffff",
        "#0080ff",
        "#8000ff",
        "#ff00ff"
    ];

    let offset = 0;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barHeight = canvas.height / bars.length;

        for (let i = 0; i < bars.length; i++) {
            ctx.fillStyle = bars[(i + offset) % bars.length];
            ctx.fillRect(0, i * barHeight, canvas.width, barHeight);
        }

        offset = (offset + 1) % bars.length;
    }

    return setInterval(draw, RASTER_SPEED);
}

/* ---------------------------------------
   4. Play Classic C64 Sample
   --------------------------------------- */

function playIntroAudio() {
    const audio = new Audio("../../resources/audio/stay_a_while.mp3");

    audio.volume = 0.65;

    audio.play().catch(() => {
        console.warn("Autoplay blocked — user gesture required.");
    });
}

/* ---------------------------------------
   5. Fade Out Boot Overlay
   --------------------------------------- */

function fadeOutBootOverlay() {
    const overlay = document.getElementById("ccg-boot-overlay");
    if (!overlay) return;

    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 1.2s ease";

    setTimeout(() => overlay.remove(), 1600);
}

/* ---------------------------------------
   6. Initialise Boot Sequence
   --------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    createBootOverlay();

    const rasterInterval = startRasterBars();

    // Audio playback (slightly delayed)
    setTimeout(() => {
        playIntroAudio();
    }, AUDIO_DELAY);

    // End boot sequence
    setTimeout(() => {
        fadeOutBootOverlay();
        clearInterval(rasterInterval);
    }, BOOT_DURATION);
});
