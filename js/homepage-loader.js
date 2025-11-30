// ================================================================
// CHEEKY COMMODORE GAMER – HOMEPAGE INTRO CONTROLLER (FINAL)
// ------------------------------------------------
// - C64 boot screen → raster bars → audio speech
// - Autoplay on first visit (desktop); graceful fallback
// - Skip Intro button
// - Remembers if user has seen intro (localStorage)
// - "Replay Intro" button in footer
// ================================================================

(function () {
  const BOOT_TEXT = [
    "**** COMMODORE 64 BASIC V2 ****",
    " 64K RAM SYSTEM  38911 BASIC BYTES FREE",
    "",
    "READY.",
    'LOAD "CCG",8,1',
    "RUN"
  ].join("\n");

  const INTRO_KEY = "ccg_intro_seen";

  const body = document.body;
  const overlay = document.getElementById("intro-overlay");
  const bootPhase = document.getElementById("boot-phase");
  const rasterPhase = document.getElementById("raster-phase");
  const bootTextEl = document.getElementById("boot-text");
  const audioEl = document.getElementById("intro-audio");
  const skipBtn = document.getElementById("skip-intro");
  const enableSoundBtn = document.getElementById("enable-sound");
  const replayBtn = document.getElementById("replay-intro");

  let bootTimer = null;
  let rasterTimeout = null;
  let typingIndex = 0;

  function hasSeenIntro() {
    try {
      return localStorage.getItem(INTRO_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markIntroSeen() {
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch (e) {
      // ignore
    }
  }

  function clearTimers() {
    if (bootTimer) clearInterval(bootTimer);
    if (rasterTimeout) clearTimeout(rasterTimeout);
  }

  function showBootPhase() {
    bootPhase.classList.remove("hidden");
    rasterPhase.classList.add("hidden");
    bootTextEl.textContent = "";
    typingIndex = 0;

    const text = BOOT_TEXT;
    bootTimer = setInterval(() => {
      bootTextEl.textContent = text.slice(0, typingIndex);
      typingIndex++;
      if (typingIndex > text.length) {
        clearInterval(bootTimer);
        // small pause then move to raster
        rasterTimeout = setTimeout(showRasterPhase, 800);
      }
    }, 35);
  }

  function showRasterPhase() {
    bootPhase.classList.add("hidden");
    rasterPhase.classList.remove("hidden");

    // Try autoplay audio
    if (audioEl) {
      audioEl.currentTime = 0;
      const playPromise = audioEl.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => {
          // Autoplay blocked → show "Enable Sound" button
          if (enableSoundBtn) {
            enableSoundBtn.classList.remove("hidden");
          }
        });
      }
      audioEl.onended = () => {
        // When the speech finishes, finish the intro
        finishIntro();
      };
    }

    // Failsafe: if audio doesn't end for any reason, exit after ~12s
    rasterTimeout = setTimeout(() => {
      finishIntro();
    }, 12000);
  }

  function finishIntro() {
    clearTimers();
    markIntroSeen();

    if (audioEl) {
      audioEl.onended = null;
      try {
        audioEl.pause();
      } catch (e) {}
    }

    if (overlay) {
      overlay.classList.add("intro-hidden");
      // Allow CSS transition to finish then remove
      setTimeout(() => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 800);
    }

    body.classList.remove("intro-active");
  }

  function startFullIntro() {
    if (!overlay) {
      body.classList.remove("intro-active");
      return;
    }
    body.classList.add("intro-active");
    overlay.classList.remove("intro-hidden");

    showBootPhase();
  }

  function skipIntro() {
    finishIntro();
  }

  function enableSound() {
    if (!audioEl) return;
    enableSoundBtn.classList.add("hidden");
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {
      // If still blocked, just continue the intro silently
    });
  }

  function replayIntro() {
    // Clear the flag and reload page to re-run
    try {
      localStorage.removeItem(INTRO_KEY);
    } catch (e) {}
    window.location.reload();
  }

  // ------------------------------------------------
  // Init on DOM ready
  // ------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    const seen = hasSeenIntro();

    if (!overlay) {
      // No overlay present → just show site
      body.classList.remove("intro-active");
      return;
    }

    if (seen) {
      // User has already seen the epic intro → skip immediately
      body.classList.remove("intro-active");
      overlay.classList.add("intro-hidden");
      setTimeout(() => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 800);
    } else {
      startFullIntro();
    }

    if (skipBtn) {
      skipBtn.addEventListener("click", skipIntro);
    }

    if (enableSoundBtn) {
      enableSoundBtn.addEventListener("click", enableSound);
    }

    if (replayBtn) {
      replayBtn.addEventListener("click", replayIntro);
    }

    // Also allow any key or click during boot to jump to raster
    if (bootPhase) {
      bootPhase.addEventListener("click", showRasterPhase);
      document.addEventListener("keydown", (e) => {
        if (body.classList.contains("intro-active") &&
            !rasterPhase.classList.contains("hidden")) {
          // Already in raster phase → let skip handle it
          return;
        }
        if (body.classList.contains("intro-active")) {
          showRasterPhase();
        }
      });
    }
  });
})();
