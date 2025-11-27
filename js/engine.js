/* ============================================================
   CHEEKY COMMODORE GAMER — ENGINE.JS (FULL FILE, UPDATED AUDIO)
   Handles:
   - Boot overlay creation
   - Fixed raster bars (scaled correctly)
   - “Stay a While… Stay FOREVER!” audio
   - Smooth fade-out
   ============================================================ */

const BOOT_DURATION = 4200;   // ms until fade-out
const AUDIO_DELAY   = 700;    // ms before voice plays

/* ---------------------------------------
   1. Inject Boot Overlay
   --------------------------------------- */
function createBootOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "ccg-boot-overlay";
    overlay.innerHTML = `
        <div class="ccg-boot-center">
            <div class="ccg-boot-text">
                *** COMMODORE 64 SYSTEM BOOT ***<br>
                READY.
            </div>
            <canvas id="ccg-raster-bars"></canvas>
        </div>
    `;
    document.body.appendChild(overlay);
}

/* ---------------------------------------
   2. Start Raster Bars (Fixed Proportions)
   --------------------------------------- */
function startRasterBars() {
    const canvas = document.getElementById("ccg-raster-bars");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // FIXED pixel size for correct C64 look
    canvas.width  = 540;
    canvas.height = 90;

    // C64-inspired colour bars
    const bars = [
        "#00e0ff",  // cyan
        "#0099ff",  // blue
        "#7640ff",  // purple
        "#ff40ff",  // magenta
        "#ff8040",  // orange
        "#ffe000",  // yellow
        "#40ff40"   // green
    ];

    const barHeight = canvas.height / bars.length;
    let offset = 0;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < bars.length; i++) {
            ctx.fillStyle = bars[(i + offset) % bars.length];
            ctx.fillRect(0, i * barHeight, canvas.width, barHeight);
        }

        offset = (offset + 1) % bars.length;
    }

    return setInterval(draw, 60); // smooth, classic speed
}

/* ---------------------------------------
   3. Audio: “Stay a While… Stay FOREVER!”
   --------------------------------------- */
function playIntroAudio() {
    const audio = new Audio("resources/audio/c64_speech_stayawhile.mp3");
    audio.volume = 0.65;
    audio.play().catch(() => {
        console.warn("Autoplay blocked by browser.");
    });
}

/* ---------------------------------------
   4. Fade Out Boot Screen
   --------------------------------------- */
function fadeOutBootOverlay() {
    const overlay = document.getElementById("ccg-boot-overlay");
    if (!overlay) return;

    overlay.classList.add("fade-out");

    setTimeout(() => overlay.remove(), 1600);
}

/* ---------------------------------------
   5. Initialise Boot Sequence
   --------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    createBootOverlay();
    const rasterInterval = startRasterBars();

    // Play voice line
    setTimeout(playIntroAudio, AUDIO_DELAY);

    // Then fade everything out
    setTimeout(() => {
        fadeOutBootOverlay();
        clearInterval(rasterInterval);
    }, BOOT_DURATION);
});
