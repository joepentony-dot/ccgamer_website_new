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
      progressBar.style.width = `${percent}%`;
      progressWrap.setAttribute("aria-valuenow", `${Math.round(percent)}`);
      timeDisplay.textContent = formatTime(audio.currentTime);
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

    if (typeof options.onReady === "function") {
      audio.addEventListener("loadedmetadata", () => options.onReady(audio), { once: true });
    }

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

(function (global) {
  if (!global) {
    return;
  }

  global.CCGSharedMusicPlayer = global.CCGSharedMusicPlayer || {};
  const NS = global.CCGSharedMusicPlayer;

  const _probeCache = NS._probeCache instanceof Map ? NS._probeCache : new Map();
  NS._probeCache = _probeCache;

  function resolveMp3Url(slug) {
    if (typeof NS.getMp3Url === "function") return NS.getMp3Url(slug);
    return `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;
  }

  function probeAudioMetadata(url, { timeoutMs = 6000, logCtx = "" } = {}) {
    if (_probeCache.has(url)) return _probeCache.get(url);

    const p = new Promise((resolve) => {
      const a = new Audio();
      a.preload = "metadata";
      a.src = url;

      let done = false;
      let timeoutId = null;

      const cleanup = () => {
        a.removeEventListener("loadedmetadata", onOk);
        a.removeEventListener("error", onErr);
        if (timeoutId) {
          global.clearTimeout(timeoutId);
        }
        a.src = "";
      };

      const finish = (result) => {
        if (done) return;
        done = true;
        cleanup();
        resolve(result);
      };

      const onOk = () => {
        const duration = Number.isFinite(a.duration) ? a.duration : undefined;
        finish({ ok: true, duration });
      };

      const onErr = () => finish({ ok: false });

      a.addEventListener("loadedmetadata", onOk, { once: true });
      a.addEventListener("error", onErr, { once: true });

      try {
        a.load();
      } catch (_) {}

      timeoutId = global.setTimeout(() => {
        if (!done) {
          console.warn(`[CCG MUSIC][probe] timeout ${timeoutMs}ms ${logCtx} url=${url}`);
          finish({ ok: false });
        }
      }, timeoutMs);
    });

    _probeCache.set(url, p);
    return p;
  }

  NS.renderIfPlayable = async function renderIfPlayable(container, slug, opts = {}) {
    const { onPlayable, onMissing, logCtx = "" } = opts;

    if (!container || !slug) return false;

    const url = resolveMp3Url(slug);
    const result = await probeAudioMetadata(url, { timeoutMs: 6000, logCtx });

    if (!result.ok) {
      container.innerHTML = "";
      if (typeof onMissing === "function") onMissing();
      console.log(`[CCG MUSIC][renderIfPlayable] missing/unplayable ${logCtx} slug=${slug}`);
      return false;
    }

    container.innerHTML = "";

    if (global.ccgGameMusic && typeof global.ccgGameMusic.renderGameMusicPlayer === "function") {
      global.ccgGameMusic.renderGameMusicPlayer(container, slug, {
        omegaMode: true,
        logCtx
      });
      if (typeof onPlayable === "function") onPlayable(result);
      console.log(`[CCG MUSIC][renderIfPlayable] rendered Omega ${logCtx} slug=${slug}`);
      return true;
    }

    if (typeof onMissing === "function") onMissing();
    return false;
  };

  NS._probeAudioMetadata = probeAudioMetadata;
  NS._resolveMp3Url = resolveMp3Url;
})(window);

(function (global) {
  global.CCGSharedMusicPlayer = global.CCGSharedMusicPlayer || {};
  const NS = global.CCGSharedMusicPlayer;

  const _probeCache = new Map();

  function resolveMp3Url(slug) {
    if (typeof NS.getMp3Url === "function") return NS.getMp3Url(slug);
    return `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;
  }

  function probePlayable(url, timeoutMs = 6000) {
    if (_probeCache.has(url)) return _probeCache.get(url);

    const p = new Promise((resolve) => {
      const a = new Audio();
      a.preload = "metadata";
      a.src = url;

      let done = false;
      let timeoutId = null;

      const finish = (ok) => {
        if (done) return;
        done = true;
        if (timeoutId) {
          global.clearTimeout(timeoutId);
        }
        a.src = "";
        resolve(ok);
      };

      a.addEventListener("loadedmetadata", () => finish(true), { once: true });
      a.addEventListener("error", () => finish(false), { once: true });

      try { a.load(); } catch (_) {}

      timeoutId = global.setTimeout(() => finish(false), timeoutMs);
    });

    _probeCache.set(url, p);
    return p;
  }

  NS.renderIfPlayableOnGamePage = async function (container, slug, opts = {}) {
    const { logCtx = "" } = opts;
    if (!container || !slug) return false;

    const url = resolveMp3Url(slug);
    const ok = await probePlayable(url, 6000);

    if (!ok) {
      container.innerHTML = "";
      console.log(`[CCG MUSIC] missing/unplayable ${logCtx} slug=${slug}`);
      return false;
    }

    container.innerHTML = "";
    if (
      window.ccgGameMusic &&
      typeof window.ccgGameMusic.renderOmegaGameMusicPlayer === "function"
    ) {
      window.ccgGameMusic.renderOmegaGameMusicPlayer(container, slug, { logCtx });
      console.log(`[CCG MUSIC] rendered Omega game player ${logCtx} slug=${slug}`);
      return true;
    }

    return false;
  };
})(window);
