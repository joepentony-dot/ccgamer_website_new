/* ===========================================================
   CHEEKY COMMODORE GAMER — EPIC INTRO CONTROLLER
   Phase 1: Fast fullscreen C64 typing boot
   Phase 2: Chaotic loading-style raster bars + SID speech
   Phase 3: Fade to homepage when MP3 ends or user skips
   =========================================================== */

let rasterCanvas, rasterCtx;
let rasterAnimId = null;
let introRunning = true;

// Rough C64-ish palette
const C64_COLORS = [
  "#000000", // black
  "#ffffff", // white
  "#68372b", // brown
  "#70a4b2", // light cyan
  "#6f3d86", // purple
  "#588d43", // green
  "#352879", // dark blue
  "#b8c76f", // light green
  "#6f4f25", // dark brown
  "#433900", // dark grey-brown
  "#9a6759", // light brown
  "#444444", // dark grey
  "#6c6c6c", // medium grey
  "#9ad284", // pale green
  "#6c5eb5", // light blue
  "#959595"  // light grey
];

document.addEventListener("DOMContentLoaded", () => {
  const overlay  = document.getElementById("intro-overlay");
  const homepage = document.getElementById("homepage-content");
  const skipBtn  = document.getElementById("skip-intro");
  const audio    = document.getElementById("intro-audio");

  rasterCanvas = document.getElementById("raster-canvas");
  if (rasterCanvas) {
    rasterCtx = rasterCanvas.getContext("2d");
    handleResize();
    window.addEventListener("resize", handleResize);
  }

  if (homepage) {
    homepage.classList.remove("homepage-show");
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      endIntro(true);
    });
  }

  if (audio) {
    audio.addEventListener("ended", () => {
      // When SID sample finishes, go straight to homepage
      endIntro(false);
    });
  }

  // Phase 1: fast C64 typing boot
  startBootTyping(() => {
    if (!introRunning) return;

    // Phase 2: raster chaos + SID audio
    overlay.classList.add("phase-raster");
    startRaster();
    attemptPlayAudio();
  });

  // Safety: if nothing ends the intro naturally, auto-quit after 12s
  setTimeout(() => {
    if (introRunning) {
      endIntro(false);
    }
  }, 12000);
});

/* ========== C64 BOOT TYPING ========== */
function startBootTyping(onComplete) {
  const bootEl = document.getElementById("boot-text");
  if (!bootEl) {
    if (onComplete) onComplete();
    return;
  }

  const lines = [
    "**** COMMODORE 64 BASIC V2 ****",
    " 64K RAM SYSTEM  38911 BASIC BYTES FREE",
    "",
    "READY.",
    'LOAD "CCGAMER",8,1',
    "SEARCHING FOR CCGAMER",
    "LOADING",
    "RUN"
  ];

  const fullText = lines.join("\n");
  let index = 0;
  const totalDuration = 1600; // ~1.6s total (fast boot)
  const baseDelay = totalDuration / fullText.length;

  function typeStep() {
    if (!introRunning) return;

    const slice = fullText.slice(0, index + 1);
    bootEl.textContent = slice;

    index++;
    if (index < fullText.length) {
      const jitter = (Math.random() - 0.5) * baseDelay * 0.5;
      const delay = Math.max(8, baseDelay + jitter);
      setTimeout(typeStep, delay);
    } else {
      // Add READY-style cursor blink briefly
      const cursor = document.createElement("span");
      cursor.id = "boot-cursor";
      cursor.textContent = "_";
      cursor.classList.add("blink");
      bootEl.appendChild(cursor);

      setTimeout(() => {
        if (onComplete) onComplete();
      }, 200);
    }
  }

  typeStep();
}

/* ========== RASTER CHAOS ========== */
function handleResize() {
  if (!rasterCanvas) return;
  rasterCanvas.width = window.innerWidth;
  rasterCanvas.height = window.innerHeight;
}

function startRaster() {
  if (!rasterCtx || !rasterCanvas) return;
  introRunning = true;
  drawRasterFrame();
}

function drawRasterFrame() {
  if (!introRunning || !rasterCtx || !rasterCanvas) return;

  const w = rasterCanvas.width;
  const h = rasterCanvas.height;

  let y = 0;
  while (y < h) {
    const barHeight = 3 + Math.floor(Math.random() * 12); // 3–14px
    const color = C64_COLORS[Math.floor(Math.random() * C64_COLORS.length)];

    rasterCtx.fillStyle = color;
    rasterCtx.fillRect(0, y, w, barHeight);

    // Thin black "tear" lines
    if (Math.random() < 0.45) {
      rasterCtx.fillStyle = "#000000";
      rasterCtx.fillRect(0, y + barHeight - 1, w, 1);
    }

    y += barHeight;
  }

  // Slight extra dark overlay to feel unstable
  if (Math.random() < 0.6) {
    rasterCtx.globalAlpha = 0.08;
    rasterCtx.fillStyle = "#000000";
    rasterCtx.fillRect(0, 0, w, h);
    rasterCtx.globalAlpha = 1.0;
  }

  rasterAnimId = requestAnimationFrame(drawRasterFrame);
}

/* ========== AUDIO HANDLING ========== */
async function attemptPlayAudio() {
  const audio = document.getElementById("intro-audio");
  if (!audio) return;

  try {
    await audio.play();
  } catch (err) {
    // Browser blocked autoplay; fail silently.
    // (We can later add a "tap to unmute" overlay if you want.)
    console.warn("Intro audio autoplay was blocked by the browser:", err);
  }
}

/* ========== END INTRO ========== */
function endIntro(fromSkip) {
  if (!introRunning) return;
  introRunning = false;

  if (rasterAnimId !== null) {
    cancelAnimationFrame(rasterAnimId);
    rasterAnimId = null;
  }

  const overlay  = document.getElementById("intro-overlay");
  const homepage = document.getElementById("homepage-content");
  const audio    = document.getElementById("intro-audio");

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  if (overlay) {
    overlay.classList.add("intro-fade-out");
    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 420); // matches the 0.4s fade
  }

  if (homepage) {
    homepage.classList.add("homepage-show");
  }
}
