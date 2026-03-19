(function () {
  function ensureNamespace() {
    if (typeof window === "undefined") {
      return null;
    }
    window.CCGSharedMusicPlayer = window.CCGSharedMusicPlayer || {};
    return window.CCGSharedMusicPlayer;
  }

  function createAudioPlayer(options = {}) {
    const src = typeof options.src === "string" ? options.src.trim() : "";
    if (!src) {
      return null;
    }

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = options.preload || "none";
    audio.className = options.playerClass || "ccg-game-audio-player";

    const source = document.createElement("source");
    source.src = src;
    source.type = options.sourceType || "audio/mpeg";
    audio.appendChild(source);

    if (typeof options.onError === "function") {
      audio.addEventListener("error", () => {
        options.onError(audio);
      }, { once: true });
    }

    if (!options.wrapperClass) {
      return audio;
    }

    const wrapper = document.createElement("div");
    wrapper.className = options.wrapperClass;

    if (options.slotClass) {
      const slot = document.createElement("div");
      slot.className = options.slotClass;
      slot.appendChild(audio);
      wrapper.appendChild(slot);
    } else {
      wrapper.appendChild(audio);
    }

    return wrapper;
  }

  const api = ensureNamespace();
  if (!api) {
    return;
  }

  api.createAudioPlayer = createAudioPlayer;
})();
