// js/engine.js
// Minimal, safe engine script: raster bars + SID intro + cursor fix

document.addEventListener("DOMContentLoaded", () => {
    try {
        restoreCursor();
        initRasterBars();
        initSidIntro();
    } catch (e) {
        console.error("Engine init error:", e);
    }
});

// Ensure the cursor is visible (override any old CSS that hid it)
function restoreCursor() {
    document.body.style.cursor = "auto";
}

// =======================
//  RASTER BAR BACKGROUND
// =======================
function initRasterBars() {
    const canvas = document.getElementById("raster-canvas");
    if (!canvas) return; // no raster canvas on this page

    const ctx = canvas.getContext("2d");
    let width, height, time = 0;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    function draw() {
        if (!width || !height) return;

        const barHeight = 8;
        const speed = 0.03;

        ctx.clearRect(0, 0, width, height);

        for (let y = 0; y < height; y += barHeight) {
            const phase = (y / height) * Math.PI * 2 + time * speed;
            const intensity = Math.floor(128 + 127 * Math.sin(phase));
            const r = 0;
            const g = intensity;
            const b = 255;

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(0, y, width, barHeight);
        }

        time++;
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
}

// =======================
//   SID INTRO AUDIO
// =======================
function initSidIntro() {
    const audio = document.getElementById("sid-intro");
    if (!audio) return;

    // Only play once per browser session
    if (sessionStorage.getItem("ccg_sid_played") === "1") return;

    // Try to play; if the browser blocks it, we just fail silently
    audio.volume = 0.7;
    audio.play()
        .then(() => {
            sessionStorage.setItem("ccg_sid_played", "1");
        })
        .catch(() => {
            // Autoplay blocked – no drama, user can trigger manually if needed
            console.warn("SID intro autoplay blocked by browser.");
        });
}
