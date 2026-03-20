// Ensure global namespace exists (CRITICAL FIX)
window.ccgGameMusic = window.ccgGameMusic || {};

// Game Music Player Renderer
window.ccgGameMusic.renderGameMusicPlayer = function (container, slug) {
  if (!container || !slug) return;

  const url = `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "game-music omega-player";

  const status = document.createElement("div");
  status.className = "omega-player-status";
  status.textContent = "● TRACK READY";

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "none";

  const source = document.createElement("source");
  source.src = url;
  source.type = "audio/mpeg";

  audio.appendChild(source);

  wrapper.appendChild(status);
  wrapper.appendChild(audio);
  container.appendChild(wrapper);

  audio.addEventListener("play", () => {
    status.textContent = "● NOW PLAYING";
    wrapper.classList.add("is-playing");
  });

  audio.addEventListener("pause", () => {
    status.textContent = "● TRACK READY";
    wrapper.classList.remove("is-playing");
  });

  audio.addEventListener(
    "error",
    () => {
      container.innerHTML = `
      <div class="game-music-missing">
        🎵 Track currently not available
      </div>
    `;
    },
    { once: true }
  );
};
