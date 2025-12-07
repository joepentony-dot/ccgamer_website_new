// Omega C64 Intro Controller — FINAL

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("introOverlay");
  const idle = document.getElementById("introIdle");
  const c64Screen = document.getElementById("introC64");
  const typedLinesWrap = document.getElementById("typedLines");
  const fadeLayer = document.getElementById("introFade");
  const skipBtn = document.getElementById("skipIntro");
  const speechBox = document.getElementById("speechText");
  const loaderVideo = document.getElementById("loaderVideo");

  let introStarted = false;
  let finished = false;
  const timers = [];

  const typedLines = [
    'LOAD"*",8,1',
    "PRESS PLAY ON TAPE",
    "LOADING",
    'FOUND "CHEEKY COMMODORE GAMER"'
  ];

  const speechAudio = new Audio("resources/css/audio/c64_speech_stayawhile.mp3");
  speechAudio.preload = "auto";
  speechAudio.volume = 0.6;

  function addTimer(fn, delay) {
    const id = window.setTimeout(fn, delay);
    timers.push(id);
  }

  function clearTimers() {
    timers.forEach(id => clearTimeout(id));
    timers.length = 0;
  }

  function startIntro() {
    if (introStarted || finished) return;
    introStarted = true;

    if (idle) idle.classList.add("intro-idle--hidden");
    if (c64Screen) c64Screen.classList.add("intro-c64-screen--visible");
    if (loaderVideo && loaderVideo.paused) {
      loaderVideo.play().catch(() => {});
    }

    addTimer(beginTyping, 600);
  }

  function beginTyping() {
    let lineIndex = 0;

    function typeNextLine() {
      if (finished) return;
      if (lineIndex >= typedLines.length) {
        addTimer(startSpeech, 400);
        return;
      }

      const text = typedLines[lineIndex];
      const lineEl = document.createElement("div");
      lineEl.className = "intro-c64-line intro-c64-line--typed";
      typedLinesWrap.appendChild(lineEl);

      let charIndex = 0;
      function step() {
        if (finished) return;
        lineEl.textContent = text.slice(0, charIndex);
        charIndex++;
        if (charIndex <= text.length) {
          addTimer(step, 55);
        } else {
          lineIndex++;
          addTimer(typeNextLine, 220);
        }
      }
      step();
    }

    typeNextLine();
  }

  function showSpeech(text) {
    if (!speechBox) return;
    speechBox.innerHTML = text;
    speechBox.classList.add("intro-speech-text--visible");
  }

  function hideSpeech() {
    if (!speechBox) return;
    speechBox.classList.remove("intro-speech-text--visible");
  }

  function startSpeech() {
    if (finished) return;

    if (c64Screen) {
      c64Screen.classList.add("intro-c64-screen--hidden");
    }

    try {
      speechAudio.currentTime = 0;
      speechAudio.play().catch(() => {});
    } catch (e) {}

    hideSpeech();
    addTimer(() => showSpeech("ANOTHER VISITOR..."), 400);
    addTimer(() => showSpeech("STAY A WHILE..."), 2000);
    addTimer(() => showSpeech("STAY FOREVER..."), 3600);
    addTimer(finishIntro, 5600);
  }

  function finishIntro(skipInstant) {
    if (finished) return;
    finished = true;
    clearTimers();

    try {
      speechAudio.pause();
      speechAudio.currentTime = 0;
    } catch (e) {}

    if (fadeLayer) {
      fadeLayer.classList.add("intro-fade--active");
    }

    const delay = skipInstant ? 200 : 500;
    addTimer(() => {
      window.location.href = "home.html";
    }, delay);
  }

  function handleGlobalClick(event) {
    if (finished || introStarted) return;
    if (skipBtn && event.target.closest && event.target.closest("#skipIntro")) return;
    startIntro();
  }

  if (overlay) {
    overlay.addEventListener("click", handleGlobalClick);
  } else {
    document.addEventListener("click", handleGlobalClick);
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      finishIntro(true);
    });
  }
});
