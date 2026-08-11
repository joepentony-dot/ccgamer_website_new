// Ensure global namespace exists (CRITICAL FIX)
window.ccgGameMusic = window.ccgGameMusic || {};

window.ccgGameMusic.buildTrackUrl = function (slug) {
  return `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;
};

window.ccgGameMusic.renderGameMusicPlayer = function (container, slug, opts = {}) {
  const { onMissing, logCtx = "", omegaMode = false } = opts;

  if (!container || !slug) return;

  const url = window.ccgGameMusic.buildTrackUrl(slug);

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = omegaMode ? "ccg-omega-player ccg-omega-player--game" : "game-music";

  const status = document.createElement("div");
  status.className = "ccg-omega-player-status";
  status.textContent = "● TRACK READY";

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "metadata";
  audio.style.width = "100%";

  const source = document.createElement("source");
  source.src = url;
  source.type = "audio/mpeg";
  audio.appendChild(source);

  if (omegaMode) {
    wrapper.appendChild(status);
  }
  wrapper.appendChild(audio);
  container.appendChild(wrapper);

  audio.addEventListener("play", () => {
    if (omegaMode) {
      status.textContent = "● NOW PLAYING";
      wrapper.classList.add("is-playing");
    }
  });

  audio.addEventListener("pause", () => {
    if (omegaMode) {
      status.textContent = "● TRACK READY";
      wrapper.classList.remove("is-playing");
    }
  });

  audio.addEventListener("ended", () => {
    if (omegaMode) {
      status.textContent = "● TRACK READY";
      wrapper.classList.remove("is-playing");
    }
  });

  audio.addEventListener("error", () => {
    container.innerHTML = "";
    if (typeof onMissing === "function") onMissing();
    console.log(`[CCG MUSIC] audio error -> clearing ${logCtx} slug=${slug}`);
  }, { once: true });

  try { audio.load(); } catch (_) {}

  return { wrapper, audio, status, url };
};


window.ccgGameMusic = window.ccgGameMusic || {};

window.ccgGameMusic.renderOmegaGameMusicPlayer = function (container, slug, opts = {}) {
  const { logCtx = "" } = opts;
  if (!container || !slug) return;

  const url = `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "ccg-omega-player ccg-omega-player--game";

  const status = document.createElement("div");
  status.className = "ccg-omega-player-status";
  status.textContent = "● TRACK READY";

  const audioWrap = document.createElement("div");
  audioWrap.className = "ccg-omega-audio-wrap";

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "metadata";
  audio.style.width = "100%";

  const source = document.createElement("source");
  source.src = url;
  source.type = "audio/mpeg";
  audio.appendChild(source);

  audioWrap.appendChild(audio);
  wrapper.appendChild(status);
  wrapper.appendChild(audioWrap);
  container.appendChild(wrapper);

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

  audio.addEventListener("error", () => {
    container.innerHTML = "";
    console.log(`[CCG MUSIC] omega game audio error -> cleared ${logCtx} slug=${slug}`);
  }, { once: true });

  try { audio.load(); } catch (_) {}
};
