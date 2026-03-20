// Ensure global namespace exists (CRITICAL FIX)
window.ccgGameMusic = window.ccgGameMusic || {};

window.ccgGameMusic.buildTrackUrl = function (slug) {
  return `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;
};

// Game Music Player Renderer
window.ccgGameMusic.renderGameMusicPlayer = function (container, slug, options = {}) {
  if (!container || !slug) return null;

  const url = window.ccgGameMusic.buildTrackUrl(slug);
  const onReady = typeof options.onReady === "function" ? options.onReady : null;
  const onError = typeof options.onError === "function" ? options.onError : null;

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "game-music omega-player";

  const status = document.createElement("div");
  status.className = "omega-player-status";
  status.textContent = "● TRACK READY";

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "none";
  audio.className = "ccg-game-audio-player";

  const source = document.createElement("source");
  source.src = url;
  source.type = "audio/mpeg";

  audio.appendChild(source);
  wrapper.appendChild(status);
  wrapper.appendChild(audio);
  container.appendChild(wrapper);

  let settled = false;
  const settleReady = () => {
    if (settled) return;
    settled = true;
    if (onReady) onReady({ wrapper, audio, status, url });
  };
  const settleError = () => {
    if (settled) return;
    settled = true;
    wrapper.remove();
    if (onError) onError({ container, slug, url });
  };

  audio.addEventListener("loadedmetadata", settleReady, { once: true });
  audio.addEventListener("canplay", settleReady, { once: true });
  audio.addEventListener("play", () => {
    status.textContent = "● NOW PLAYING";
    wrapper.classList.add("is-playing");
  });

  audio.addEventListener("pause", () => {
    status.textContent = "● TRACK READY";
    wrapper.classList.remove("is-playing");
  });

  audio.addEventListener("ended", () => {
    status.textContent = "● TRACK READY";
    wrapper.classList.remove("is-playing");
  });

  audio.addEventListener("error", settleError, { once: true });

  return { wrapper, audio, status, url };
};
