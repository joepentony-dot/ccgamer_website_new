// Ensure global namespace exists (CRITICAL FIX)
window.ccgGameMusic = window.ccgGameMusic || {};

// Game Music Player Renderer
window.ccgGameMusic.renderGameMusicPlayer = function (container, slug) {
  if (!container || !slug) return;

  const url = `https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/${slug}.mp3`;

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "game-music";

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "none";
  audio.style.width = "100%";

  const source = document.createElement("source");
  source.src = url;
  source.type = "audio/mpeg";

  audio.appendChild(source);
  wrapper.appendChild(audio);
  container.appendChild(wrapper);

  const showMissingState = () => {
    container.innerHTML = `
      <div class="game-music-missing">
        <div class="music-missing-text">🎵 Track currently not available</div>
      </div>
    `;
  };

  audio.addEventListener("error", showMissingState, { once: true });

  console.log("[CCG MUSIC] Rendering direct player:", slug);
};
