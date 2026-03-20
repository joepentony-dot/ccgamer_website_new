(function () {
  function ensureNamespace() {
    if (typeof window === "undefined") {
      return null;
    }
    window.CCGSharedMusicPlayer = window.CCGSharedMusicPlayer || {};
    return window.CCGSharedMusicPlayer;
  }

  function formatTime(seconds) {
    const safeSeconds = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
    const mins = Math.floor(safeSeconds / 60);
    const secs = Math.floor(safeSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function syncPlayerPlayback(audio, playBtn) {
    if (!audio || !playBtn) {
      return;
    }
    playBtn.textContent = audio.paused ? "▶" : "⏸";
  }

  function pauseOtherPlayers(activeAudio) {
    document.querySelectorAll("audio[data-ccg-custom-player='omega']").forEach((audioEl) => {
      if (audioEl !== activeAudio && !audioEl.paused) {
        audioEl.pause();
      }
    });
  }

  function decorateWithOmegaPlayer(wrapper, audio) {
    if (!wrapper || !audio) {
      return null;
    }

    audio.controls = false;
    audio.dataset.ccgCustomPlayer = "omega";
    audio.setAttribute("aria-hidden", "true");
    audio.tabIndex = -1;

    // ALWAYS build UI
    const playerUI = document.createElement("div");
    playerUI.className = "ccg-omega-player";

    playerUI.innerHTML = `
      <button class="ccg-btn-play" type="button" aria-label="Play or pause track">▶</button>
      <div class="ccg-progress-wrap" role="progressbar" aria-label="Track progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="ccg-progress-bar"></div>
      </div>
      <span class="ccg-time">0:00</span>
    `;

    wrapper.appendChild(playerUI);

    const playBtn = playerUI.querySelector(".ccg-btn-play");
    const progressWrap = playerUI.querySelector(".ccg-progress-wrap");
    const progressBar = playerUI.querySelector(".ccg-progress-bar");
    const timeDisplay = playerUI.querySelector(".ccg-time");

    playBtn.addEventListener("click", () => {
      if (audio.paused) {
        audio.play().catch(() => {
          syncPlayerPlayback(audio, playBtn);
        });
      } else {
        audio.pause();
      }
    });

    audio.addEventListener("play", () => {
      pauseOtherPlayers(audio);
      syncPlayerPlayback(audio, playBtn);
    });
    audio.addEventListener("pause", () => syncPlayerPlayback(audio, playBtn));
    audio.addEventListener("ended", () => {
      syncPlayerPlayback(audio, playBtn);
      if (progressBar) {
        progressBar.style.width = "0%";
      }
      if (progressWrap) {
        progressWrap.setAttribute("aria-valuenow", "0");
      }
      if (timeDisplay) {
        timeDisplay.textContent = "0:00";
      }
    });
    audio.addEventListener("loadedmetadata", () => {
      if (!audio.duration || Number.isNaN(audio.duration)) {
        playerUI.style.display = "none";
        return;
      }
      playerUI.style.display = "";
      if (timeDisplay) {
        timeDisplay.textContent = formatTime(audio.currentTime);
      }
    });
    audio.addEventListener("timeupdate", () => {
      if (!audio.duration) return;

      const percent = (audio.currentTime / audio.duration) * 100;
      progressBar.style.width = percent + "%";
      progressWrap.setAttribute("aria-valuenow", `${Math.round(percent)}`);

      const mins = Math.floor(audio.currentTime / 60);
      const secs = Math.floor(audio.currentTime % 60).toString().padStart(2, "0");
      timeDisplay.textContent = `${mins}:${secs}`;
    });

    progressWrap.addEventListener("click", (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (!rect.width || !audio.duration) {
        return;
      }
      const percent = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      audio.currentTime = percent * audio.duration;
    });

    return playerUI;
  }

  function createAudioPlayer(options = {}) {
    const src = typeof options.src === "string" ? options.src.trim() : "";
    if (!src) {
      return null;
    }

    const audio = document.createElement("audio");
    audio.controls = false;
    audio.preload = options.preload || "none";
    audio.className = options.playerClass || "ccg-game-audio-player";
    audio.style.width = "100%";

    const source = document.createElement("source");
    source.src = src;
    source.type = options.sourceType || "audio/mpeg";
    audio.appendChild(source);

    if (typeof options.onError === "function") {
      audio.addEventListener("error", () => {
        options.onError(audio);
      }, { once: true });
    }

    const wrapper = document.createElement("div");
    wrapper.className = options.wrapperClass || "ccg-shared-audio-player";

    if (options.slotClass) {
      const slot = document.createElement("div");
      slot.className = options.slotClass;
      slot.appendChild(audio);
      wrapper.appendChild(slot);
      decorateWithOmegaPlayer(slot, audio);
    } else {
      wrapper.appendChild(audio);
      decorateWithOmegaPlayer(wrapper, audio);
    }

    return wrapper;
  }

  const api = ensureNamespace();
  if (!api) {
    return;
  }

  api.createAudioPlayer = createAudioPlayer;
})();
