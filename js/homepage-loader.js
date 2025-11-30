/* ===========================================================
   CHEEKY COMMODORE GAMER — HOMEPAGE INTRO CONTROLLER
   Authentic C64 loading-style raster flicker + SID speech
   =========================================================== */

let rasterCanvas, rasterCtx;
let rasterAnimId = null;
let introRunning = true;

// Classic-ish C64 palette
const C64_COLORS = [
  '#000000', // black
  '#ffffff', // white
  '#68372b', // brown
  '#70a4b2', // light red-ish cyan
  '#6f3d86', // purple
  '#588d43', // green
  '#352879', // dark blue
  '#b8c76f', // light green
  '#6f4f25', // dark brown
  '#433900', // dark grey-ish brown
  '#9a6759', // light brown
  '#444444', // dark grey
  '#6c6c6c', // medium grey
  '#9ad284', // pale green
  '#6c5eb5', // light blue
  '#959595'  // light grey
];

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('intro-overlay');
  const homepage = document.getElementById('homepage-content');
  const skipBtn = document.getElementById('skip-intro');
  const audio = document.getElementById('intro-audio');

  rasterCanvas = document.getElementById('raster-canvas');
  if (rasterCanvas) {
    rasterCtx = rasterCanvas.getContext('2d');
    handleResize();
    window.addEventListener('resize', handleResize);
  }

  if (homepage) {
    // Keep homepage hidden until intro finishes
    homepage.classList.remove('homepage-show');
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      endIntro(true);
    });
  }

  if (audio) {
    audio.addEventListener('ended', () => {
      endIntro(false);
    });
  }

  // Phase 1: show boot screen for ~2 seconds
  setTimeout(() => {
    if (!introRunning) return;
    overlay.classList.add('phase-raster');
    startRaster();
    attemptPlayAudio();
  }, 2200);

  // Safety timeout: if audio never fires, end intro after 12s
  setTimeout(() => {
    if (introRunning) {
      endIntro(false);
    }
  }, 12000);
});

function handleResize() {
  if (!rasterCanvas) return;
  const rect = rasterCanvas.getBoundingClientRect();
  rasterCanvas.width = rect.width;
  rasterCanvas.height = rect.height;
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

  // Flickery loading-style stripes
  let y = 0;
  while (y < h) {
    const barHeight = 3 + Math.floor(Math.random() * 10); // 3–12px
    const color = C64_COLORS[Math.floor(Math.random() * C64_COLORS.length)];

    rasterCtx.fillStyle = color;
    rasterCtx.fillRect(0, y, w, barHeight);

    // Occasional thin black divider to mimic CRT noise
    if (Math.random() < 0.35) {
      rasterCtx.fillStyle = '#000000';
      rasterCtx.fillRect(0, y + barHeight - 1, w, 1);
    }

    y += barHeight;
  }

  // Slight extra noise overlay
  if (Math.random() < 0.5) {
    rasterCtx.globalAlpha = 0.08;
    rasterCtx.fillStyle = '#000000';
    rasterCtx.fillRect(0, 0, w, h);
    rasterCtx.globalAlpha = 1.0;
  }

  rasterAnimId = requestAnimationFrame(drawRasterFrame);
}

async function attemptPlayAudio() {
  const audio = document.getElementById('intro-audio');
  if (!audio) return;

  try {
    await audio.play();
  } catch (err) {
    // Browser blocked autoplay; keep everything visual only
    console.warn('Intro audio autoplay was blocked by the browser:', err);
    document.body.classList.add('intro-muted');
  }
}

function endIntro(fromSkip) {
  if (!introRunning) return;
  introRunning = false;

  if (rasterAnimId !== null) {
    cancelAnimationFrame(rasterAnimId);
    rasterAnimId = null;
  }

  const overlay = document.getElementById('intro-overlay');
  const homepage = document.getElementById('homepage-content');
  const audio = document.getElementById('intro-audio');

  if (audio && !audio.paused) {
    audio.pause();
    audio.currentTime = 0;
  }

  if (overlay) {
    overlay.classList.add('intro-fade-out');
    // Remove from DOM after fade
    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 900);
  }

  if (homepage) {
    homepage.classList.add('homepage-show');
  }
}
